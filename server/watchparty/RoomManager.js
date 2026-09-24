const crypto = require('crypto');
const randomUUID = crypto.randomUUID
    ? crypto.randomUUID.bind(crypto)
    : () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
      );
const { generateRoomCode } = require('./roomCode');

class RoomManager {
    #rooms = new Map();
    #codeToId = new Map();
    #socketToRoom = new Map();

    createRoom({ hostSocketId, userId, userName, roomName }) {
        const roomId = randomUUID();
        let roomCode = generateRoomCode();

        while (this.#codeToId.has(roomCode)) {
            roomCode = generateRoomCode();
        }

        const now = Date.now();
        const host = {
            socketId: hostSocketId,
            userId,
            userName,
            role: 'host',
            followHost: true,
            joinedAt: now,
            lastPing: now,
        };

        const room = {
            id: roomId,
            roomCode,
            name: roomName,
            status: 'active',
            hostId: hostSocketId,
            stateVersion: 1,
            media: null,
            playback: {
                currentTime: 0,
                isPlaying: false,
                updatedAt: now,
            },
            members: [host],
            createdAt: now,
        };

        this.#rooms.set(roomId, room);
        this.#codeToId.set(roomCode, roomId);
        this.#socketToRoom.set(hostSocketId, roomId);

        return room;
    }

    joinRoom({ roomCode, socketId, userId, userName }) {
        const roomId = this.#codeToId.get(roomCode);
        const room = roomId ? this.#rooms.get(roomId) : null;

        if (!room) {
            return { success: false, error: 'ROOM_NOT_FOUND' };
        }

        const now = Date.now();
        room.members.push({
            socketId,
            userId,
            userName,
            role: 'guest',
            followHost: true,
            joinedAt: now,
            lastPing: now,
        });
        this.#socketToRoom.set(socketId, roomId);

        return { success: true, room };
    }

    leaveRoom({ socketId }) {
        const roomId = this.#socketToRoom.get(socketId);
        const room = roomId ? this.#rooms.get(roomId) : null;

        if (!room) {
            this.#socketToRoom.delete(socketId);
            return { success: false, error: 'MEMBER_NOT_FOUND' };
        }

        const memberIndex = room.members.findIndex((member) => member.socketId === socketId);
        if (memberIndex === -1) {
            this.#socketToRoom.delete(socketId);
            return { success: false, error: 'MEMBER_NOT_FOUND' };
        }

        const [member] = room.members.splice(memberIndex, 1);
        this.#socketToRoom.delete(socketId);

        if (room.members.length === 0) {
            this.#rooms.delete(room.id);
            this.#codeToId.delete(room.roomCode);

            return {
                success: true,
                deleted: true,
                hostTransferred: false,
                room: null,
            };
        }

        let hostTransferred = false;
        if (member.role === 'host') {
            const nextHost = room.members.reduce((earliest, candidate) => (
                candidate.joinedAt < earliest.joinedAt ? candidate : earliest
            ));
            this.transferHost(room.id, nextHost.socketId);
            hostTransferred = true;
        }

        return {
            success: true,
            deleted: false,
            hostTransferred,
            room,
        };
    }

    getRoomByCode(roomCode) {
        const roomId = this.#codeToId.get(roomCode);
        return roomId ? this.#rooms.get(roomId) ?? null : null;
    }

    getRoomById(roomId) {
        return this.#rooms.get(roomId) ?? null;
    }

    transferHost(roomId, newHostSocketId) {
        const room = this.#rooms.get(roomId);
        if (!room) return null;

        const newHost = room.members.find((member) => member.socketId === newHostSocketId);
        if (!newHost) return null;

        room.members.forEach((member) => {
            member.role = member.socketId === newHostSocketId ? 'host' : 'guest';
        });
        room.hostId = newHostSocketId;
        room.stateVersion += 1;

        return room;
    }
}

module.exports = { RoomManager };
