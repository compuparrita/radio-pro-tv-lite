const costaRicaHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    hourCycle: 'h23',
});

function getSessionTimeOfDay(createdAt: number): 'morning' | 'afternoon' | 'night' {
    const hour = Number(
        costaRicaHourFormatter
            .formatToParts(new Date(createdAt))
            .find((part) => part.type === 'hour')?.value
    );

    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
}

const sessionTitles = {
    morning: ['Mañana de música', 'Mañana en compañía', 'Café y buena música'],
    afternoon: ['Tarde de cine', 'Tarde en compañía', 'Una tarde para compartir'],
    night: ['Noche de cine', 'Noche en compañía', 'Sesión de esta noche'],
} as const;

export function getWatchPartySessionTitle(roomId: string, createdAt: number): string {
    const period = getSessionTimeOfDay(createdAt);
    let hash = 2166136261;

    for (let index = 0; index < roomId.length; index += 1) {
        hash = Math.imul(hash ^ roomId.charCodeAt(index), 16777619);
    }

    const options = sessionTitles[period];
    return options[(hash >>> 0) % options.length];
}
