import { Container, Service } from "typedi";
import { BadRequestError } from "routing-controllers";
import moment from "moment";
import SpotifyApi, { SearchType } from "spotify-web-api-node";
import { BaseService } from './BaseService';
import { DevicesService } from "./DevicesService";
import { DeviceType } from "../types/DevicesTypes";
import {
    SpotifyAccessToken,
    SpotifyAlbum,
    SpotifyArtist,
    SpotifyCategory, SpotifyContext,
    SpotifyPlayer,
    SpotifyPlaylist,
    SpotifySearchResult,
    SpotifySpeaker,
    SpotifyTrack,
    SpotifyUser
} from "../types/SpotifyTypes";

const encodeFormData = (data: { [key: string]: string }): string => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
};

const chunk = (arr: string[], size: number): string[][] => Array.from({
    length: Math.ceil(arr.length / size)
}, (v, i) => arr.slice(i * size, i * size + size));

@Service()
export class SpotifyService extends BaseService {
    devicesService = Container.get(DevicesService);
    enabled = false;
    error = '';
    spotifyCredentials = {
        clientId: "",
        clientSecret: ""
    };
    spotifyAccessToken: SpotifyAccessToken;
    scopes = ["user-modify-playback-state", "user-read-playback-state", "user-read-currently-playing", "user-library-modify", "user-library-read", "user-top-read", "user-follow-read", "user-follow-modify", "playlist-read-private", "playlist-modify-public", "playlist-modify-private", "user-read-recently-played"];
    spotifyAPI: SpotifyApi;
    currentUser: SpotifyUser = null;
    currentPlayer: SpotifyPlayer = null;
    spotifySpeaker: SpotifySpeaker = null;
    lastPlayerState: string = null;

    constructor() {
        super("SpotifyService");

        this.spotifyAPI = new SpotifyApi();
        this.setSpotifyCredentials();
    }

    async setSpotifyCredentials(): Promise<void> {
        if (!await this.isServiceEnabled()) {
            this.enabled = false;
            this.error = '';
            return;
        }

        const clientID = await this.getSetting("spotify", "spotify_client_id");
        if (clientID) {
            this.spotifyCredentials.clientId = clientID.value;
        } else {
            this.enabled = false;
            this.error = 'Spotify client ID not found';
            return;
        }

        const clientSecret = await this.getSetting("spotify", "spotify_client_secret");
        if (clientSecret) {
            this.spotifyCredentials.clientSecret = clientSecret.value;
        } else {
            this.enabled = false;
            this.error = 'Spotify client secret not found';
            return;
        }

        this.validateClientIDSecret().then(async (res) => {
            if (!res) {
                return;
            }
        });

        this.enabled = true;
        this.spotifyAPI = new SpotifyApi(this.spotifyCredentials);
        this.setRedirectURI(process.env.IP, Number(process.env.PORT));
    }

    async validateClientIDSecret(): Promise<boolean> {
        const request = await fetch(process.env.SPOTIFY_TOKEN_URL + "?grant_type=client_credentials", {
            method: "POST",
            headers: {
                "Content-type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(
                    this.spotifyCredentials.clientId + ":" + this.spotifyCredentials.clientSecret
                ).toString('base64')
            }
        });

        const resp = await request.json();
        if (request.status !== 200) {
            this.enabled = false;
            this.error = resp.error;
            return false;
        }

        this.enabled = true;
        this.error = '';

        return true;
    }

    setRedirectURI(ip: string, port: number): void {
        this.spotifyAPI.setRedirectURI(`https://${ip}:${port}/spotify/callback`);
    }

    async getState(): Promise<object> {
        const serviceEnabled = await this.isServiceEnabled();
        if (!serviceEnabled) {
            this.spotifyCredentials.clientId = '';
            this.spotifyCredentials.clientSecret = '';
            this.spotifyAPI = new SpotifyApi();
        }

        return {
            serviceEnabled: serviceEnabled,
            player: this.currentPlayer,
            user: this.currentUser,
            isAuthorized: this.isAuthorized(),
            devices: this.devicesService.getDevices().filter((device) => device.deviceType === DeviceType.SWITCH),
            deviceForSpotify: await this.devicesService.getDeviceForSpotify() || null,
            enabled: this.enabled,
            error: this.error
        };
    }

    getSpotifySpeaker(): SpotifySpeaker | null {
        return this.spotifySpeaker;
    }

    isAuthorized(): boolean {
        return this.spotifyAPI.getAccessToken() !== undefined;
    }

    async handleSpotifyPlayerEvents(type: string): Promise<void> {
        if (type === this.lastPlayerState) return;
        if (type === "preloading") return;

        this.lastPlayerState = type;

        if (type === "stopped") return await this.stopPlayback();

        await this.getPlayer();
    }

    async initiateSpotifyAuthorization(): Promise<string> {
        await this.setSpotifyCredentials();

        if (!this.enabled) return "/";

        return this.spotifyAPI.createAuthorizeURL(this.scopes, Math.random().toString(16));
    }

    async getAccessToken(authorizationCode: string): Promise<string> {
        const body = {
            "grant_type": 'authorization_code',
            "code": authorizationCode,
            "redirect_uri": this.spotifyAPI.getRedirectURI(),
            "client_id": this.spotifyCredentials.clientId,
            "client_secret": this.spotifyCredentials.clientSecret,
        };

        const req = await fetch(process.env.SPOTIFY_TOKEN_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: encodeFormData(body)
        });

        if (req.status === 200) {
            const resp = await req.json();

            this.log.info("SpotifyService", "Successfully fetched token");

            this.spotifyAPI.setAccessToken(resp.access_token);
            this.spotifyAPI.setRefreshToken(resp.refresh_token);

            await this.getPlayer();
            await this.getCurrentUser();

            setInterval(() => {
                this.refreshToken();
            }, 50 * 60 * 1000);

        } else {
            this.log.error("SpotifyService", "Failed to fetch token");
        }

        return "/";
    }

    async refreshToken(): Promise<void> {
        const data = await this.spotifyAPI.refreshAccessToken();

        if (data && data.body && data.body.access_token) {
            this.log.info("SpotifyService", "Access token has been refreshed");
            this.spotifyAPI.setAccessToken(data.body.access_token);

            return;
        }

        throw new Error("Error refreshing access token");
    }

    generateSpotifyAccessToken(): void {
        this.spotifyAPI.clientCredentialsGrant().then(
            data => {
                this.spotifyAccessToken = data.body;
                this.spotifyAccessToken.expiresAt = new Date().getTime() - 60 * 5 * 1000;

                this.spotifyAPI.setAccessToken(data.body.access_token);

                setTimeout(() => {
                    this.generateSpotifyAccessToken();
                }, 55 * 60 * 1000);
            })
            .catch(err => {
                throw new Error("SpotifyService: Access couldn't be fetched (" + err + ")");
            });
    }

    async getSpotifySpeakerName(): Promise<string> {
        return this.getSetting('spotify', 'spotify_device_name')
            .then((speaker) => {
                return speaker.value || undefined;
            });
    }

    async getPlayer(silent = false): Promise<SpotifyPlayer | undefined> {
        if (!this.isAuthorized()) return undefined;

        const speakerName = await this.getSpotifySpeakerName();

        if (!speakerName) {
            this.enabled = false;
            this.error = 'Spotify speaker name not found in settings';
            return undefined;
        }

        return this.spotifyAPI.getMyCurrentPlaybackState().then(
            async data => {
                const body = data.body;

                const preferredSpeaker = data.body.device && data.body.device.name === speakerName;

                this.currentPlayer = {
                    isPlaying: preferredSpeaker ? body.is_playing : false,
                    device: !body.device ? null : {
                        id: preferredSpeaker ? body.device.id : "",
                        name: preferredSpeaker ? body.device.name : "",
                        isActive: preferredSpeaker ? body.device.is_active : false,
                        volume: preferredSpeaker ? body.device.volume_percent : 0
                    },
                    track: preferredSpeaker && body.item ? await this.getTrack(body.item.id) : null
                };

                this.emit<object>("spotify update", await this.getState());

                return this.currentPlayer;
            },
            err => {
                throw new Error("Error fetching current playback state: " + err);
            }
        );
    }

    async getCurrentUser(): Promise<SpotifyUser | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMe().then(
            data => {
                const userProfile = data.body;

                return this.currentUser = {
                    id: userProfile.id,
                    name: userProfile.display_name,
                    country: userProfile.country
                };
            },
            err => {
                this.currentUser = null;

                throw new Error("Failed to fetch current user: " + err);
            }
        );
    }

    async transferPlaybackDevice(): Promise<void> {
        const speakerName = await this.getSpotifySpeakerName();

        if (!speakerName) {
            this.enabled = false;
            this.error = 'Spotify speaker name not found in settings';
            return undefined;
        }

        return this.spotifyAPI.getMyDevices()
            .then(
                data => {
                    const piSpeaker = data.body.devices.find((device) => {
                        return device.name === speakerName;
                    });

                    if (piSpeaker !== undefined) {
                        this.spotifySpeaker = {
                            id: piSpeaker.id,
                            isActive: piSpeaker.is_active,
                            isRestricted: piSpeaker.is_restricted,
                            name: piSpeaker.name,
                            type: piSpeaker.type,
                            volumePercent: piSpeaker.volume_percent
                        };
                    } else {
                        this.spotifySpeaker = null;
                    }

                    return;
                },
                err => {
                    throw new Error("Error fetching spotify devices: " + err);
                })
            .then(async () => {
                if (this.spotifySpeaker !== null) {
                    await this.spotifyAPI.transferMyPlayback([this.spotifySpeaker.id]);
                }
            });
    }

    async setPlaybackWithContext(type: string, uri: string, offset: number): Promise<object> {
        const body: SpotifyContext = {};

        if (type === "track") {
            body.uris = [uri];
        } else {
            // eslint-disable-next-line @typescript-eslint/camelcase
            body.context_uri = uri;

            if (type !== "artist") {
                body.offset = {
                    position: offset
                };
            }
        }

        // eslint-disable-next-line @typescript-eslint/camelcase
        body.position_ms = 0;

        return await this.setPlayback("play", body);
    }

    async setPlayback(type: string, body = {}): Promise<object> {
        return this.transferPlaybackDevice().then(async () => {

            if (this.spotifySpeaker === null) {
                const state = {
                    ...await this.getState(),
                    error: "Open Spotify on phone to select PI-speaker"
                };

                this.emit<object>("spotify device error", state);

                return this.getState();
            }

            const method = ["play", "pause"].includes(type) ? "PUT" : "POST";
            const url = process.env.SPOTIFY_PLAYER_URL + type + "?device_id=" + this.spotifySpeaker.id;

            const req = await fetch(url.toString(), {
                method: method,
                headers: {
                    "Authorization": "Bearer " + this.spotifyAPI.getAccessToken()
                },
                body: JSON.stringify(body)
            });

            if (req.status >= 300) {
                const resp = await req.json();

                const badRequestError = new BadRequestError();
                badRequestError.httpCode = req.status;
                badRequestError.message = resp;
                throw badRequestError;
            }

            this.currentPlayer = await this.getPlayer();

            this.emit<object>("spotify update", await this.getState());

            return this.getState();
        });
    }

    async stopPlayback(): Promise<void> {
        this.spotifySpeaker = null;

        this.currentPlayer = {
            isPlaying: false,
            device: null,
            track: null
        };

        this.emit<object>("spotify update", await this.getState());
    }

    async followTrack(id: string, follow: boolean): Promise<boolean | undefined> {
        if (!this.isAuthorized()) return undefined;

        let endpoint;
        if (follow) endpoint = this.spotifyAPI.addToMySavedTracks([id]);
        if (!follow) endpoint = this.spotifyAPI.removeFromMySavedTracks([id]);

        return endpoint.then(
            () => true,
            err => {
                throw new Error("Error follow artist: " + err);
            }
        );
    }

    async isFollowingTrack(trackIDs: string[]): Promise<boolean[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        const chunks = chunk(trackIDs, 50);
        let results: boolean[] = [];

        for (const chunk of chunks) {
            await this.spotifyAPI.containsMySavedTracks(chunk).then(
                data => {
                    results = [...results, ...data.body];
                },
                err => {
                    this.log.error("Error get is following track: " + err);
                    results = [...results, ...Array(chunk.length).fill(false)];
                }
            );
        }

        return results;
    }

    async getMySavedTracks(): Promise<SpotifyTrack[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMySavedTracks().then(
            data => {
                const tracks = data.body;

                return tracks.items.map((track) => {
                    return {
                        id: track.track.id,
                        name: track.track.name,
                        artists: track.track.artists.map((artist) => artist),
                        images: track.track.album.images.map((image) => image),
                        following: true,
                        duration: moment.utc(track.track.duration_ms).format("mm:ss"),
                        uri: track.track.uri
                    };
                });
            },
            err => {
                throw new Error("Error fetching liked tracks of me: " + err);
            }
        );
    }

    async getMyTopTracks(): Promise<SpotifyTrack[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMyTopTracks({ limit: 10000 }).then(
            async data => {
                const tracks = data.body;

                const trackIDs = tracks.items.map((track) => track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                return await Promise.all(tracks.items.map(async (track, index) => {
                    return {
                        id: track.id,
                        name: track.name,
                        artists: track.artists.map((artist) => artist),
                        images: track.album.images.map((image) => image),
                        following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                        duration: moment.utc(track.duration_ms).format('mm:ss'),
                        uri: track.uri
                    };
                }));
            },
            err => {
                throw new Error("Error fetching artists of me: " + err);
            }
        );
    }

    async getTrack(id: string): Promise<SpotifyTrack | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getTrack(id).then(
            async data => {
                const track = data.body;

                const trackIDs = [track.id];
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                return {
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map((artist) => artist),
                    images: track.album.images.map((image) => image),
                    following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[0] : false,
                    duration: moment.utc(track.duration_ms).format('mm:ss'),
                    uri: track.uri
                };
            },
            err => {
                throw new Error("Error fetching track: " + err);
            }
        );
    }

    async followArtist(id: string, follow: boolean): Promise<boolean | undefined> {
        if (!this.isAuthorized()) return undefined;

        let endpoint;
        if (follow) endpoint = this.spotifyAPI.followArtists([id]);
        if (!follow) endpoint = this.spotifyAPI.unfollowArtists([id]);

        return endpoint.then(
            () => {
                return true;
            },
            err => {
                throw new Error("Error follow artist: " + err);
            }
        );
    }

    async isFollowingArtist(artistIDs: string[]): Promise<boolean[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        const chunks = chunk(artistIDs, 50);
        let results: boolean[] = [];

        for (const chunk of chunks) {
            await this.spotifyAPI.isFollowingArtists(chunk).then(
                data => {
                    results = [...results, ...data.body];
                },
                err => {
                    this.log.error("Error get is following artist: " + err);
                    results = [...results, ...Array(chunk.length).fill(false)];
                }
            );
        }

        return results;
    }

    async getArtist(artistID: string): Promise<SpotifyArtist | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getArtist(artistID).then(
            async data => {
                const artist = data.body;

                const artistIDs = [artistID];
                const isFollowingArtists = await this.isFollowingArtist(artistIDs);

                return {
                    id: artist.id,
                    name: artist.name,
                    images: artist.images.map((image) => image),
                    tracks: await this.getArtistTopTracks(artistID) || [],
                    albums: await this.getArtistAlbums(artistID) || [],
                    followers: artist.followers.total,
                    following: isFollowingArtists.length === artistIDs.length ? isFollowingArtists[0] : false,
                    genres: artist.genres,
                    popularity: artist.popularity,
                    uri: artist.uri,
                };
            },
            err => {
                throw new Error("Error fetching albums of me: " + err);
            }
        );
    }

    async getArtistTopTracks(id: string, country = "NL"): Promise<SpotifyTrack[] | undefined>  {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getArtistTopTracks(id, country).then(
            async data => {
                const tracks = data.body.tracks;

                const trackIDs = tracks.map((track) => track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                return await Promise.all(tracks.map(async (track, index) => {
                    return {
                        id: track.id,
                        name: track.name,
                        artists: track.artists.map((artist) => artist),
                        images: track.album.images.map((image) => image),
                        following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                        duration: moment.utc(track.duration_ms).format("mm:ss"),
                        uri: track.uri
                    };
                }));
            },
            err => {
                throw new Error("Error fetching top tracks of artist: " + err);
            }
        );
    }

    async getArtistAlbums(id: string): Promise<SpotifyAlbum[] | undefined> {
        return this.spotifyAPI.getArtistAlbums(id).then(
            async data => {
                const albums = data.body;

                const albumIDs = albums.items.map((album) => album.id);
                const isFollowingAlbums = await this.isFollowingAlbum(albumIDs);

                return await Promise.all(albums.items.map(async (album, index) => {
                    return {
                        id: album.id,
                        name: album.name,
                        artists: album.artists.map((artist) => artist),
                        images: album.images.map((image) => image),
                        following: isFollowingAlbums.length === albumIDs.length ? isFollowingAlbums[index] : false,
                        albumType: album.album_type,
                        totalTracks: album.total_tracks,
                        releaseDate: album.release_date,
                        releaseDatePrecision: album.release_date_precision,
                        uri: album.uri
                    };
                }));
            },
            err => {
                throw new Error("Error fetching albums of artist: " + err);
            }
        );
    }

    async getMyTopArtists(): Promise<SpotifyArtist[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMyTopArtists({ limit: 10000 }).then(
            async data => {
                const artists = data.body;

                const artistIDs = artists.items.map((artist) => artist.id);
                const isFollowingArtists = await this.isFollowingArtist(artistIDs);

                return await Promise.all(artists.items.map(async (artist, index) => {
                    return {
                        id: artist.id,
                        name: artist.name,
                        images: artist.images.map((image) => image),
                        followers: artist.followers.total,
                        following: isFollowingArtists.length === artistIDs.length ? isFollowingArtists[index] : false,
                        genres: artist.genres,
                        popularity: artist.popularity,
                        uri: artist.uri,
                    };
                }));
            },
            err => {
                throw new Error("Error fetching artists of me: " + err);
            }
        );
    }

    async getMyArtists(): Promise<SpotifyArtist[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getFollowedArtists({ limit: 50 }).then(
            data => {
                const artists = data.body.artists;

                return artists.items.map((artist) => {
                   return {
                       id: artist.id,
                       name: artist.name,
                       images: artist.images.map((image) => image),
                       followers: artist.followers.total,
                       following: true,
                       genres: artist.genres,
                       popularity: artist.popularity,
                       uri: artist.uri,
                   };
                });
            },
            err => {
                throw new Error("Error fetching artists of me: " + err);
            }
        );
    }

    async isFollowingAlbum(albumIDs: string[]): Promise<boolean[] | undefined> {
        if (!this.isAuthorized() || this.currentUser === null) return undefined;

        const chunks = chunk(albumIDs, 50);
        let results: boolean[] = [];

        for (const chunk of chunks) {
            await this.spotifyAPI.containsMySavedAlbums(chunk).then(
                data => {
                    results = [...results, ...data.body];
                },
                err => {
                    this.log.error("Error get is following albums: " + err);
                    results = [...results, ...Array(chunk.length).fill(false)];
                }
            );
        }

        return results;
    }

    async followAlbum(id: string, follow: boolean): Promise<boolean | undefined> {
        if (!this.isAuthorized()) return undefined;

        let endpoint;
        if (follow) endpoint = this.spotifyAPI.addToMySavedAlbums([id]);
        if (!follow) endpoint = this.spotifyAPI.removeFromMySavedAlbums([id]);

        return endpoint.then(
            () => {
                return true;
            },
            err => {
                throw new Error("Error follow playlist: " + err);
            }
        );
    }

    async getAlbum(id: string): Promise<SpotifyAlbum | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getAlbum(id).then(
            async data => {
                const album = data.body;

                const trackIDs = album.tracks.items.map((track) => track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                const albumIDs = [album.id];
                const isFollowingAlbums = await this.isFollowingAlbum(albumIDs);

                return {
                    id: album.id,
                    name: album.name,
                    artists: album.artists.map((artist) => artist),
                    tracks: await Promise.all(album.tracks.items.map(async (track, index) => {
                        return {
                            id: track.id,
                            name: track.name,
                            artists: track.artists.map((artist) => artist),
                            following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                            uri: track.uri
                        };
                    })),
                    images: album.images.map((image) => image),
                    following: isFollowingAlbums.length === albumIDs.length ? isFollowingAlbums[0] : false,
                    albumType: album.album_type,
                    totalTracks: album.total_tracks,
                    releaseDate: album.release_date,
                    releaseDatePrecision: album.release_date_precision,
                    uri: album.uri
                };
            },
            err => {
                throw new Error("Error fetching album: " + err);
            }
        );
    }

    async getMyAlbums(): Promise<SpotifyAlbum[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMySavedAlbums().then(
            data => {
                const albums = data.body;

                return albums.items.map((album) => {
                    return {
                        id: album.album.id,
                        name: album.album.name,
                        artists: album.album.artists.map((artist) => artist),
                        tracks: album.album.tracks.items.map((track) => {
                            return {
                                id: track.id,
                                name: track.name,
                                artists: track.artists.map((artist) => artist),
                                uri: track.uri
                            };
                        }),
                        images: album.album.images.map((image) => image),
                        following: true,
                        albumType: album.album.album_type,
                        totalTracks: album.album.total_tracks,
                        releaseDate: album.album.release_date,
                        releaseDatePrecision: album.album.release_date,
                        uri: album.album.uri
                    };
                });

            },
            err => {
                throw new Error("Error fetching albums of me: " + err);
            }
        );
    }

    async isFollowingPlaylist(ownerID: string, playlistID: string): Promise<boolean | undefined> {
        if (!this.isAuthorized() || this.currentUser === null) return undefined;

        const meID = this.currentUser.id;

        return this.spotifyAPI.areFollowingPlaylist(ownerID, playlistID, [meID]).then(
            data => {
                return data.body[0];
            },
            err => {
                this.log.error("Error get is following playlist: " + err);
                return false;
            }
        );
    }

    async followPlaylist(id: string, follow: boolean): Promise<boolean | undefined> {
        if (!this.isAuthorized()) return undefined;

        let endpoint;
        if (follow) endpoint = this.spotifyAPI.followPlaylist(id);
        if (!follow) endpoint = this.spotifyAPI.unfollowPlaylist(id);

        return endpoint.then(
            () => {
                return true;
            },
            err => {
                throw new Error("Error follow playlist: " + err);
            }
        );
    }

    async getPlaylist(id: string): Promise<SpotifyPlaylist | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getPlaylist(id).then(
            async data => {
                const playlist = data.body;

                const trackIDs = playlist.tracks.items.map((track) => track.track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                return {
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description,
                    owner: {
                        id: playlist.owner.id,
                        name: playlist.owner.display_name
                    },
                    following: await this.isFollowingPlaylist(playlist.owner.id, playlist.id),
                    images: playlist.images.map((image) => image),
                    tracks: await Promise.all(playlist.tracks.items.map(async (track, index) => {
                        return {
                            id: track.track.id,
                            name: track.track.name,
                            artists: track.track.artists.map((artist) => artist),
                            images: track.track.album.images.map((image) => image),
                            following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                            duration: moment.utc(track.track.duration_ms).format("mm:ss"),
                            uri: track.track.uri
                        };
                    })),
                    uri: playlist.uri
                };
            },
            err => {
                throw new Error("Error fetching playlist: " + err);
            }
        );
    }

    async getMyPlaylists(): Promise<SpotifyPlaylist[] | undefined> {
        return await this.getUsersPlaylists();
    }

    async getUsersPlaylists(userID?: string): Promise<SpotifyPlaylist[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        let endpoint;
        if (userID === undefined) {
            endpoint = this.spotifyAPI.getUserPlaylists();
        } else {
            endpoint = this.spotifyAPI.getUserPlaylists(userID);
        }

        return endpoint.then(
            async data => {
                const playlists = data.body;

                return await Promise.all(playlists.items.map(async (playlist) => {
                    return {
                        id: playlist.id,
                        name: playlist.name,
                        description: playlist.description,
                        owner: {
                            id: playlist.owner.id,
                            name: playlist.owner.display_name
                        },
                        images: playlist.images.map((image) => image),
                        following: await this.isFollowingPlaylist(playlist.owner.id, playlist.id) || false,
                        uri: playlist.uri
                    };
                }));
            },
            err => {
                throw new Error("Error fetching playlists of user: " + err);
            }
        );
    }

    async getCategoryPlaylists(id: string): Promise<SpotifyCategory | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getPlaylistsForCategory(id).then(
            async data => {
                const playlists = data.body.playlists;
                const category = await this.getCategory(id);

                return {
                    id: category.id,
                    name: category.name,
                    images: category.images,
                    playlists: await Promise.all(playlists.items.map(async (playlist) => {
                        return {
                            id: playlist.id,
                            name: playlist.name,
                            description: playlist.description,
                            owner: {
                                id: playlist.owner.id,
                                name: playlist.owner.display_name
                            },
                            images: playlist.images.map((image) => image),
                            following: await this.isFollowingPlaylist(playlist.owner.id, playlist.id) || false,
                            uri: playlist.uri
                        };
                    }))
                };
            },
            err => {
                throw new Error("Error fetching categories: " + err);
            }
        );
    }

    async getCategory(id: string): Promise<SpotifyCategory | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getCategory(id).then(
            data => {
                const category = data.body;

                return {
                    id: category.id,
                    name: category.name,
                    images: category.icons.map((image) => image)
                };
            },
            err => {
                throw new Error("Error fetching categories: " + err);
            }
        );
    }

    async getCategories(): Promise<SpotifyCategory[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getCategories({ limit: 50 }).then(
            data => {
                const categories = data.body.categories;

                return categories.items.map((category) => {
                    return {
                        id: category.id,
                        name: category.name,
                        images: category.icons.map((image) => image)
                    };
                });
            },
            err => {
                throw new Error("Error fetching categories: " + err);
            }
        );

    }

    async getRecentlyPlayedTracks(limit = 50): Promise<SpotifyTrack[] | undefined> {
        if (!this.isAuthorized()) return undefined;

        return this.spotifyAPI.getMyRecentlyPlayedTracks({ limit: limit }).then(
            async data => {
                const tracks = data.body;

                const trackIDs = tracks.items.map((track) => track.track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                return tracks.items.map((track, index) => {
                    return {
                        id: track.track.id,
                        name: track.track.name,
                        artists: track.track.artists.map((artist) => artist),
                        duration: moment.utc(track.track.duration_ms).format("mm:ss"),
                        following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                        uri: track.track.uri
                    };
                });
            },
            err => {
                throw new Error("Error fetching recently played tracks: " + err);
            }
        );
    }

    async searchSpotify(query = "", types = "", limit = 50, offset = 0): Promise<SpotifySearchResult> {

        const allowedTypes = ["playlist", "album", "artist", "track"];

        const searchTypes: SearchType[] = types.split(",")
            .filter((type) => allowedTypes.includes(type))
            .map((type): SearchType => type as SearchType);

        if (searchTypes.length === 0) throw new BadRequestError("Invalid search type(s)");

        return this.spotifyAPI.search(query, searchTypes, {
            limit,
            offset
        }).then(
            async data => {
                const searchResult: SpotifySearchResult = {};

                if (searchTypes.includes("playlist")) searchResult.playlists = await Promise.all(data.body.playlists.items.map(async (playlist) => {
                    return {
                        id: playlist.id,
                        name: playlist.name,
                        description: playlist.description,
                        owner: {
                            id: playlist.owner.id,
                            name: playlist.owner.display_name
                        },
                        following: await this.isFollowingPlaylist(playlist.owner.id, playlist.id),
                        images: playlist.images.map((image) => image),
                        uri: playlist.uri
                    };
                }));

                const albumIDs = data.body.albums.items.map((album) => album.id);
                const isFollowingAlbums = await this.isFollowingAlbum(albumIDs);

                if (searchTypes.includes("album")) searchResult.albums = await Promise.all(data.body.albums.items.map(async (album, index) => {
                    return {
                        id: album.id,
                        name: album.name,
                        artists: album.artists.map((artist) => artist),
                        images: album.images.map((image) => image),
                        following: isFollowingAlbums.length === albumIDs.length ? isFollowingAlbums[index] : false,
                        albumType: album.album_type,
                        totalTracks: album.total_tracks,
                        releaseDate: album.release_date,
                        releaseDatePrecision: album.release_date_precision,
                        uri: album.uri
                    };
                }));

                const artistIDs = data.body.artists.items.map((artist) => artist.id);
                const isFollowingArtists = await this.isFollowingArtist(artistIDs);

                if (searchTypes.includes("artist")) searchResult.artists = await Promise.all(data.body.artists.items.map(async (artist, index) => {
                    return {
                        id: artist.id,
                        name: artist.name,
                        images: artist.images.map((image) => image),
                        followers: artist.followers.total,
                        following: isFollowingArtists.length === artistIDs.length ? isFollowingArtists[index] : false,
                        genres: artist.genres,
                        popularity: artist.popularity,
                        uri: artist.uri
                    };
                }));

                const trackIDs = data.body.tracks.items.map((track) => track.id);
                const isFollowingTracks = await this.isFollowingTrack(trackIDs);

                if (searchTypes.includes("track")) searchResult.tracks = await Promise.all(data.body.tracks.items.map(async (track, index) => {
                    return {
                        id: track.id,
                        name: track.name,
                        artists: track.artists.map((artist) => artist),
                        duration: moment.utc(track.duration_ms).format("mm:ss"),
                        following: isFollowingTracks.length === trackIDs.length ? isFollowingTracks[index] : false,
                        uri: track.uri
                    };
                }));

                return searchResult;
            },
            err => {
                throw new Error("Error querying search: " + JSON.stringify(err));
            }
        );
    }
}
