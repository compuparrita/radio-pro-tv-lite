export interface WatchPartyMediaCapabilities {
    playPause: boolean;
    seek: boolean;
    positionSync: boolean;
    driftCorrection: boolean;
}

export type WatchPartyMediaType = 'youtube' | 'hls' | 'video' | 'audio' | 'iframe';

export interface WatchPartyCapabilityInput {
    watchPartyCapabilities?: Partial<WatchPartyMediaCapabilities>;
    mediaType?: string;
    sourceUrl?: string;
    url?: string;
    iframeUrl?: string;
    id?: string;
    type?: string;
}

export function resolveWatchPartyMediaType(input: WatchPartyCapabilityInput): WatchPartyMediaType {
    const source = `${input.sourceUrl ?? ''} ${input.url ?? ''} ${input.iframeUrl ?? ''}`;
    if (/\.m3u8(?:$|[?#])|\/repretel-|\/proxy-stream/i.test(source)) return 'hls';
    if (input.mediaType === 'hls') return 'hls';
    if (input.mediaType === 'youtube' || input.id?.startsWith('yt-')
        || /youtube(?:-nocookie)?\.com|youtu\.be/i.test(source)) return 'youtube';
    if (input.mediaType === 'audio' || input.type === 'audio') return 'audio';
    if (input.mediaType === 'iframe' || input.iframeUrl) return 'iframe';
    return 'video';
}

const UNSUPPORTED_POSITION_CAPABILITIES: WatchPartyMediaCapabilities = {
    playPause: true,
    seek: false,
    positionSync: false,
    driftCorrection: false,
};

const SYNCHRONIZED_POSITION_CAPABILITIES: WatchPartyMediaCapabilities = {
    playPause: true,
    seek: true,
    positionSync: true,
    driftCorrection: true,
};

/** Resolves WatchParty operations from explicit playback-engine capabilities,
 * with a contained compatibility fallback for media used by the current app.
 */
export function resolveWatchPartyMediaCapabilities(
    input: WatchPartyCapabilityInput | null | undefined,
    engineCapabilities?: Partial<WatchPartyMediaCapabilities>,
): WatchPartyMediaCapabilities {
    if (!input) {
        return { playPause: false, seek: false, positionSync: false, driftCorrection: false };
    }

    const explicit = engineCapabilities ?? input.watchPartyCapabilities;
    const mediaType = resolveWatchPartyMediaType(input);

    let fallback: WatchPartyMediaCapabilities;
    if (mediaType === 'hls' || mediaType === 'audio') {
        fallback = UNSUPPORTED_POSITION_CAPABILITIES;
    } else if (mediaType === 'youtube' || mediaType === 'video') {
        fallback = SYNCHRONIZED_POSITION_CAPABILITIES;
    } else if (mediaType === 'iframe') {
        fallback = UNSUPPORTED_POSITION_CAPABILITIES;
    } else {
        fallback = { playPause: false, seek: false, positionSync: false, driftCorrection: false };
    }

    const resolved = { ...fallback, ...explicit };
    if (!resolved.seek || !resolved.positionSync) {
        resolved.seek = false;
        resolved.positionSync = false;
        resolved.driftCorrection = false;
    }
    return resolved;
}
