/**
 * @typedef {"active" | "reconnecting" | "closed"} RoomStatus
 */

/**
 * @typedef {Object} WatchPartyMember
 * @property {string} socketId
 * @property {string} userId
 * @property {string} userName
 * @property {"host" | "guest"} role
 * @property {boolean} followHost
 * @property {number} joinedAt
 * @property {number} lastPing
 */

/**
 * @typedef {Object} WatchPartyRoom
 * @property {string} id
 * @property {string} roomCode
 * @property {string} name
 * @property {RoomStatus} status
 * @property {string} hostId
 * @property {number} stateVersion
 * @property {Object | null} media
 * @property {Object} playback
 * @property {WatchPartyMember[]} members
 * @property {number} createdAt
 */
