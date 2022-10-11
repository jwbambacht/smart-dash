export type SpotifyPlayer = {
    isPlaying: boolean;
    device?: SpotifyDevice;
    track?: SpotifyTrack;
}

export type SpotifyUser = {
    id: string;
    name: string;
    country: string;
};

export type SpotifyDevice = {
    id: string;
    name: string;
    isActive: boolean;
    volume: number;
}

export type SpotifySpeaker = {
    id: string;
    isActive: boolean;
    isRestricted: boolean;
    name: string;
    type: string;
    volumePercent: number;
}

export type SpotifyAccessToken = {
    access_token: string;
    expires_in: number;
    token_type?: string;
    expiresAt?: number;
}

export type SpotifyImage = {
    height?: number;
    width?: number;
    url: string;
}

export type SpotifyArtist = {
    id: string;
    name: string;
    images?: SpotifyImage[];
    followers?: number;
    following?: boolean;
    genres?: string[];
    popularity?: number;
    uri: string;
}

export type SpotifyTrack = {
    id: string;
    name: string;
    artists?: SpotifyArtist[];
    images?: SpotifyImage[];
    following?: boolean;
    duration: string;
    uri: string;
}

export type SpotifyAlbum = {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    images?: SpotifyImage[];
    following?: boolean;
    totalTracks?: number;
    albumType?: string;
    releaseDate?: string;
    releaseDatePrecision?: string;
    uri: string;
}

export type SpotifyPlaylist = {
    id: string;
    name: string;
    description?: string;
    owner: {
        id: string;
        name: string;
    };
    following?: boolean;
    tracks?: SpotifyTrack[];
    images?: SpotifyImage[];
    uri?: string;
}

export type SpotifyCategory = {
    id: string;
    name: string;
    images?: SpotifyImage[];
    playlists?: SpotifyPlaylist[];
}

export type SpotifySearchResult = {
    playlists?: SpotifyPlaylist[];
    albums?: SpotifyAlbum[];
    artists?: SpotifyArtist[];
    tracks?: SpotifyTrack[];
}

export type SpotifyContext = {
    context_uri?: string;
    position_ms?: number;
    uris?: string[];
    offset?: {
        position: number;
    };
}