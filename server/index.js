const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const DOMPurify = require('isomorphic-dompurify');
const { randomUUID } = require('crypto');
const { RoomManager } = require('./watchparty/RoomManager');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Proxy configuration for Repretel (CORS workaround)
const repretelProxy = createProxyMiddleware({
    target: 'https://d2qsan2ut81n2k.cloudfront.net',
    changeOrigin: true,
    pathRewrite: {
        '^/repretel-stream': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
        },
    },
});

const repretelC6Proxy = createProxyMiddleware({
    target: 'https://alba-cr-repretel-c6.stream.mediatiquestream.com',
    changeOrigin: true,
    pathRewrite: {
        '^/repretel-c6': '',
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
        },
    },
});

app.use('/repretel-stream', repretelProxy);
app.use('/repretel-c6', repretelC6Proxy);

// Dynamic Proxy for any stream (useful for user-added stations)
app.use('/proxy-stream', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Falta el parámetro url');

    try {
        const url = new URL(targetUrl);
        const dynamicProxy = createProxyMiddleware({
            target: url.origin,
            changeOrigin: true,
            pathRewrite: (path, req) => {
                const search = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
                return new URL(search).pathname + new URL(search).search;
            },
            on: {
                proxyReq: (proxyReq) => {
                    proxyReq.removeHeader('origin');
                    proxyReq.removeHeader('referer');
                    proxyReq.removeHeader('cookie');
                    proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
                },
                error: (err, req, res) => {
                    console.error('Proxy Error for URL:', targetUrl, err);
                    if (!res.headersSent) {
                        res.status(502).send('Error de comunicación con el origen');
                    }
                }
            },
        });
        return dynamicProxy(req, res, next);
    } catch (error) {
        return res.status(400).send('URL inválida');
    }
});

// CORS configuration
app.use(cors({
    origin: true, // Reflects the request origin, allowing any origin
    credentials: true
}));

// Socket.io configuration
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow any origin for socket connection
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// In-memory storage
const connectedUsers = new Map(); // userId -> { socketId, name, phone?, lastMessageTime, messageCount }
const messageHistory = []; // Last 50 messages
const MAX_HISTORY = 50;
const roomManager = new RoomManager();
const watchPartySocketRooms = new Map(); // socketId -> roomId

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_MINUTE = 10;

// Utility functions
function sanitizeMessage(message) {
    return DOMPurify.sanitize(message, { ALLOWED_TAGS: [] }).trim();
}

function hashPhone(phone) {
    if (!phone) return null;
    return bcrypt.hashSync(phone, 10);
}

function validateMessage(message) {
    if (!message || typeof message !== 'string') return false;
    if (message.length < 1 || message.length > 500) return false;
    return true;
}

function checkRateLimit(userId) {
    const user = connectedUsers.get(userId);
    if (!user) return false;

    const now = Date.now();

    // Reset counter if window has passed
    if (now - user.lastMessageTime > RATE_LIMIT_WINDOW) {
        user.messageCount = 0;
        user.lastMessageTime = now;
    }

    // Check if over limit
    if (user.messageCount >= MAX_MESSAGES_PER_MINUTE) {
        return false;
    }

    // Increment counter
    user.messageCount++;
    user.lastMessageTime = now;
    return true;
}

function emitWatchPartyError(socket, ack, code, message) {
    const response = { success: false, error: code };
    if (typeof ack === 'function') ack(response);
    socket.emit('watchparty:error', { code, message });
}

function isValidString(value, minLength, maxLength) {
    return typeof value === 'string'
        && value.trim().length >= minLength
        && value.length <= maxLength;
}

function normalizeWatchPartyMedia(media) {
    if (!media || typeof media !== 'object' || Array.isArray(media)
        || !isValidString(media.stationId, 1, 100)
        || !isValidString(media.sourceUrl, 1, 2048)
        || !isValidString(media.title, 1, 200)
        || !['youtube', 'hls'].includes(media.mediaType)
        || typeof media.isLive !== 'boolean') {
        return null;
    }

    const sourceUrl = media.sourceUrl.trim();
    if (!sourceUrl.startsWith('/')) {
        try {
            const parsedUrl = new URL(sourceUrl);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null;
        } catch (_error) {
            return null;
        }
    }

    const title = sanitizeMessage(media.title);
    if (!title) return null;

    return {
        stationId: media.stationId.trim(),
        mediaType: media.mediaType,
        sourceUrl,
        title,
        isLive: media.isLive,
    };
}

function emitWatchPartyMembers(room) {
    io.to(room.id).emit('watchparty:members', {
        roomId: room.id,
        members: room.members,
        hostId: room.hostId,
    });
}

function emitWatchPartyState(socket, room) {
    socket.emit('watchparty:state', {
        roomId: room.id,
        stateVersion: room.stateVersion,
        isPlaying: room.playback.isPlaying,
        currentTime: room.playback.currentTime,
        media: room.media,
    });
}

function removeSocketFromWatchParty(socket) {
    const roomId = watchPartySocketRooms.get(socket.id);
    if (!roomId) return null;

    const result = roomManager.leaveRoom({ socketId: socket.id });
    watchPartySocketRooms.delete(socket.id);
    socket.leave(roomId);

    if (!result.success) return null;

    if (result.room) {
        emitWatchPartyMembers(result.room);

        if (result.hostTransferred) {
            io.to(roomId).emit('watchparty:host:changed', {
                roomId,
                hostId: result.room.hostId,
            });
        }
    }

    return { ...result, roomId };
}

// Socket.io events
io.on('connection', (socket) => {
    const userId = socket.id;

    console.log(`User connected: ${userId}`);

    // Store user connection
    connectedUsers.set(userId, {
        socketId: socket.id,
        name: null,
        phone: null,
        lastMessageTime: 0,
        messageCount: 0,
        connectedAt: Date.now(),
        ip: socket.handshake.address // For moderation only
    });

    // Broadcast updated listener count
    io.emit('listeners:update', connectedUsers.size);

    // Send chat history to new user
    socket.emit('chat:history', messageHistory);

    // User identification
    socket.on('user:identify', (data) => {
        try {
            const { name, phone } = data;

            // Validate name
            if (!name || typeof name !== 'string' || name.length < 2 || name.length > 50) {
                socket.emit('error', 'Nombre inválido (2-50 caracteres)');
                return;
            }

            const sanitizedName = sanitizeMessage(name);
            const hashedPhone = phone ? hashPhone(phone) : null;

            // Update user data
            const user = connectedUsers.get(userId);
            if (user) {
                user.name = sanitizedName;
                user.phone = hashedPhone;
            }

            socket.emit('user:identified', { success: true });
            console.log(`User identified: ${sanitizedName}`);
        } catch (error) {
            console.error('Error identifying user:', error);
            socket.emit('error', 'Error al identificar usuario');
        }
    });

    // Chat message
    socket.on('chat:message', (data) => {
        try {
            const user = connectedUsers.get(userId);

            if (!user || !user.name) {
                socket.emit('error', 'Debes identificarte primero');
                return;
            }

            const { message } = data;

            // Validate message
            if (!validateMessage(message)) {
                socket.emit('error', 'Mensaje inválido (1-500 caracteres)');
                return;
            }

            // Check rate limit
            if (!checkRateLimit(userId)) {
                socket.emit('error', 'Espera un momento antes de enviar más mensajes');
                return;
            }

            // Sanitize message
            const sanitizedMessage = sanitizeMessage(message);

            // Create message object
            const chatMessage = {
                id: `${userId}-${Date.now()}`,
                userId,
                userName: user.name,
                message: sanitizedMessage,
                timestamp: Date.now()
            };

            // Add to history (keep only last 50)
            messageHistory.push(chatMessage);
            if (messageHistory.length > MAX_HISTORY) {
                messageHistory.shift();
            }

            // Broadcast to all connected clients
            io.emit('chat:broadcast', chatMessage);

            console.log(`Message from ${user.name}: ${sanitizedMessage}`);
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('error', 'Error al enviar mensaje');
        }
    });

    // WatchParty room management
    socket.on('watchparty:create', async (payload, ack) => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Solicitud de sala invalida');
            return;
        }

        const { roomName, userId, userName } = payload;
        const media = payload.media == null ? null : normalizeWatchPartyMedia(payload.media);
        if (!isValidString(roomName, 1, 100)
            || !isValidString(userId, 1, 100)
            || !isValidString(userName, 2, 50)
            || (payload.media != null && !media)) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Datos de sala o usuario invalidos');
            return;
        }

        const sanitizedRoomName = sanitizeMessage(roomName);
        const sanitizedUserName = sanitizeMessage(userName);
        if (!sanitizedRoomName || sanitizedRoomName.length > 100
            || sanitizedUserName.length < 2 || sanitizedUserName.length > 50) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Datos de sala o usuario invalidos');
            return;
        }

        let room;
        try {
            room = roomManager.createRoom({
                hostSocketId: socket.id,
                userId: userId.trim(),
                userName: sanitizedUserName,
                roomName: sanitizedRoomName,
            });
            room.media = media;
            await socket.join(room.id);
            watchPartySocketRooms.set(socket.id, room.id);
            emitWatchPartyMembers(room);

            if (typeof ack === 'function') {
                ack({ success: true, roomCode: room.roomCode, room });
            }
        } catch (error) {
            console.error('Error creating WatchParty room:', error);
            if (room) {
                roomManager.leaveRoom({ socketId: socket.id });
                watchPartySocketRooms.delete(socket.id);
                socket.leave(room.id);
            }
            emitWatchPartyError(socket, ack, 'ROOM_OPERATION_FAILED', 'No se pudo crear la sala');
        }
    });

    socket.on('watchparty:join', async (payload, ack) => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Solicitud para unirse invalida');
            return;
        }

        const { roomCode, userId, userName } = payload;
        if (typeof roomCode !== 'string' || !/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)
            || !isValidString(userId, 1, 100)
            || !isValidString(userName, 2, 50)) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Datos para unirse invalidos');
            return;
        }

        const sanitizedUserName = sanitizeMessage(userName);
        if (sanitizedUserName.length < 2 || sanitizedUserName.length > 50) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Nombre de usuario invalido');
            return;
        }

        const result = roomManager.joinRoom({
            roomCode,
            socketId: socket.id,
            userId: userId.trim(),
            userName: sanitizedUserName,
        });

        if (!result.success) {
            emitWatchPartyError(socket, ack, 'ROOM_NOT_FOUND', 'No se encontro la sala');
            return;
        }

        try {
            await socket.join(result.room.id);
            watchPartySocketRooms.set(socket.id, result.room.id);
            emitWatchPartyMembers(result.room);
            emitWatchPartyState(socket, result.room);

            if (typeof ack === 'function') ack({ success: true, room: result.room });
        } catch (error) {
            console.error('Error joining WatchParty room:', error);
            roomManager.leaveRoom({ socketId: socket.id });
            watchPartySocketRooms.delete(socket.id);
            emitWatchPartyError(socket, ack, 'ROOM_OPERATION_FAILED', 'No se pudo unir a la sala');
        }
    });

    socket.on('watchparty:change_media', (payload, ack) => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)
            || typeof payload.roomId !== 'string') {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Solicitud para cambiar medio invalida');
            return;
        }

        const { roomId } = payload;
        const room = roomManager.getRoomById(roomId);
        if (!room || watchPartySocketRooms.get(socket.id) !== roomId || !socket.rooms.has(roomId)) {
            emitWatchPartyError(socket, ack, 'NOT_IN_ROOM', 'Debes pertenecer a la sala');
            return;
        }
        if (room.hostId !== socket.id) {
            emitWatchPartyError(socket, ack, 'HOST_ONLY', 'Solo el anfitrion puede cambiar el medio');
            return;
        }

        const media = normalizeWatchPartyMedia(payload.media);
        if (!media) {
            emitWatchPartyError(socket, ack, 'INVALID_MEDIA', 'Datos del medio invalidos');
            return;
        }

        room.media = media;
        room.stateVersion += 1;
        const event = { roomId, media, stateVersion: room.stateVersion };
        io.to(roomId).emit('watchparty:media', event);
        if (typeof ack === 'function') ack({ success: true, ...event });
    });

    socket.on('watchparty:action', (payload, ack) => {
        const validActions = new Set(['play', 'pause', 'seek', 'change_station']);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)
            || typeof payload.roomId !== 'string'
            || !validActions.has(payload.action)
            || !Number.isInteger(payload.stateVersion) || payload.stateVersion < 0) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Accion de WatchParty invalida');
            return;
        }

        const { roomId, action, stateVersion } = payload;
        const room = roomManager.getRoomById(roomId);
        if (!room || watchPartySocketRooms.get(socket.id) !== roomId || !socket.rooms.has(roomId)) {
            emitWatchPartyError(socket, ack, 'NOT_IN_ROOM', 'Debes pertenecer a la sala para enviar acciones');
            return;
        }

        room.stateVersion += 1;
        const remoteExecutionRef = randomUUID();
        const broadcast = {
            roomId,
            action,
            payload: payload.payload,
            stateVersion: room.stateVersion,
            remoteExecutionRef,
        };
        io.to(roomId).emit('watchparty:broadcast:action', broadcast);

        if (typeof ack === 'function') {
            ack({ success: true, ...broadcast });
        }
    });

    socket.on('watchparty:leave', (payload, ack) => {
        if (payload !== undefined && (!payload || typeof payload !== 'object' || Array.isArray(payload))) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Solicitud para salir invalida');
            return;
        }

        const requestedRoomId = payload?.roomId;
        const currentRoomId = watchPartySocketRooms.get(socket.id);
        if (requestedRoomId !== undefined && typeof requestedRoomId !== 'string') {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'Identificador de sala invalido');
            return;
        }
        if (requestedRoomId && currentRoomId && requestedRoomId !== currentRoomId) {
            emitWatchPartyError(socket, ack, 'INVALID_REQUEST', 'La sala no coincide con la sesion actual');
            return;
        }

        const result = removeSocketFromWatchParty(socket);
        if (!result) {
            if (typeof ack === 'function') ack({ success: true, left: false });
            return;
        }

        if (typeof ack === 'function') {
            ack({
                success: true,
                left: true,
                roomId: result.roomId,
                deleted: result.deleted,
                hostTransferred: result.hostTransferred,
                room: result.room,
            });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        removeSocketFromWatchParty(socket);
        connectedUsers.delete(userId);

        // Broadcast updated listener count
        io.emit('listeners:update', connectedUsers.size);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        listeners: connectedUsers.size,
        uptime: process.uptime()
    });
});

// Serve static files from the React app
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`✓ Socket.io server listening on port ${PORT}`);
    console.log(`✓ Accepting connections from: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
