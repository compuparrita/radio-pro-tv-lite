const crypto = require('crypto');

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

function generateRoomCode() {
    let result = '';
    const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        result += ROOM_CODE_CHARACTERS[bytes[i] % ROOM_CODE_CHARACTERS.length];
    }
    return result;
}

module.exports = { generateRoomCode };
