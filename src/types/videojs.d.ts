import 'video.js';

declare module 'video.js' {
    export interface VideoJsPlayer {
        tech(options?: { IWillNotUseThisInPlugins: boolean }): Tech | undefined;
    }

    export interface Tech {
        vhs?: VhsTech;
    }

    export interface VhsTech {
        playlists?: {
            master?: {
                playlists?: Playlist[];
            };
        };
        representations?: () => Representation[];
    }

    export interface Playlist {
        attributes?: {
            RESOLUTION?: {
                width: number;
                height: number;
            };
            BANDWIDTH?: number;
        };
    }

    export interface Representation {
        height: number;
        width: number;
        bandwidth: number;
        enabled: boolean;
    }
}
