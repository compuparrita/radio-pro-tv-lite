export type TimeOfDay = 'morning' | 'afternoon' | 'night';

const costaRicaHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    hourCycle: 'h23',
});

export function getTimeOfDay(date: Date, timeZone?: string): TimeOfDay {
    const hour = timeZone === 'America/Costa_Rica'
        ? Number(costaRicaHourFormatter.formatToParts(date).find((part) => part.type === 'hour')?.value)
        : date.getHours();

    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
}
