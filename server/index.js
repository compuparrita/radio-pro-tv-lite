const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const DOMPurify = require('isomorphic-dompurify');
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

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
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
