const { randomInt } = require('crypto');

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

function generateRoomCode() {
    return Array.from({ length: ROOM_CODE_LENGTH }, () => (
        ROOM_CODE_CHARACTERS[randomInt(ROOM_CODE_CHARACTERS.length)]
    )).join('');
}

module.exports = { generateRoomCode };
