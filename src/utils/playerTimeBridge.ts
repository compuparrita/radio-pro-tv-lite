/**
 * playerTimeBridge.ts
 *
 * Puente ligero para que WatchPartyContext pueda leer el currentTime
 * real del reproductor activo (VideoJS, YouTube, HTML5) sin acoplarse
 * directamente al hook useVideoPlayer.
 *
 * useVideoPlayer registra un proveedor; WatchPartyContext lo consulta
 * cada vez que emite un heartbeat del anfitrión.
 */

let _getTime: (() => number | null) | null = null;

/** Registra la función que devuelve el currentTime del reproductor activo. */
export function registerPlayerTimeProvider(fn: () => number | null): void {
    _getTime = fn;
}

/** Des-registra el proveedor (al desmontar el reproductor). */
export function unregisterPlayerTimeProvider(): void {
    _getTime = null;
}

/**
 * Devuelve el currentTime real del reproductor, o null si no hay
 * proveedor registrado o el reproductor no tiene posición válida.
 */
export function getPlayerCurrentTime(): number | null {
    return _getTime?.() ?? null;
}
