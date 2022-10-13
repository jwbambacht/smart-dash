import { BadRequestError, Body, Get, JsonController, Param, Post, Put, QueryParam } from 'routing-controllers';
import { Container } from 'typedi';
import { SpotifyService } from '../services/SpotifyService';
import { DevicesService } from '../services/DevicesService';
import { SpotifySearchResult } from '../types/SpotifyTypes';

@JsonController("/api/spotify")
export class SpotifyController {
	spotifyService = Container.get(SpotifyService);
	devicesService = Container.get(DevicesService);
	
	@Put("/event")
	async putEvent(@QueryParam("type") type: string): Promise<string> {
		await this.spotifyService.handleSpotifyPlayerEvents(type);

		return "OK";
	}

	@Post("/reinit")
	async getReInitSpotify(): Promise<string> {
		await this.spotifyService.initiateSpotifyAuthorization();

		return "OK";
	}

	@Get("/speaker")
	async getSpotifyDevices(): Promise<object> {
		return this.spotifyService.getSpotifySpeaker();
	}

	@Get("/player")
	async getCurrentTrack(): Promise<object> {
		return await this.spotifyService.getPlayer();
	}

	@Put("/device")
	async setSpotifyDevice(@Body() body: { deviceID: number }): Promise<object> {
		return await this.devicesService.setDeviceForSpotify(body.deviceID);
	}

	@Get("/track/:track_id")
	async getTrack(@Param("track_id") trackID: string): Promise<object> {
		return await this.spotifyService.getTrack(trackID);
	}

	@Get("/tracks/top")
	async getMyTopTracks(): Promise<object> {
		return await this.spotifyService.getMyTopTracks();
	}

	@Put("/playback/play")
	async setPlaybackPlay(): Promise<object> {
		return await this.spotifyService.setPlayback("play");
	}

	@Put("/playback/pause")
	async setPlaybackPause(): Promise<object> {
		return await this.spotifyService.setPlayback("pause");
	}

	@Put("/playback/next")
	async setPlaybackNext(): Promise<object> {
		return await this.spotifyService.setPlayback("next");
	}

	@Put("/playback/previous")
	async setPlaybackPrevious(): Promise<object> {
		return await this.spotifyService.setPlayback("previous");
	}

	@Put("/playback/uri/:uri/:offset")
	async playPlaylist(@Param("uri") uri: string, @Param("offset") offset: number): Promise<object> {
		if (uri === "" || (uri !== "" && !uri.includes(":"))) throw new BadRequestError("Malformed URI");

		const type = uri.split(":")[1];

		return await this.spotifyService.setPlaybackWithContext(type, uri, offset);
	}

	@Get("/playlist/:id")
	async getPlaylist(@Param("id") id: string): Promise<object> {
		return await this.spotifyService.getPlaylist(id);
	}

	@Put("/follow/:type/:id/:toFollow")
	async followCollection(
		@Param("type") type: string,
		@Param("id") id: string,
		@Param("toFollow") toFollow: boolean
	): Promise<boolean> {
		if (type === "playlist") {
			return await this.spotifyService.followPlaylist(id, toFollow);
		} else if (type === "artist") {
			return await this.spotifyService.followArtist(id, toFollow);
		} else if (type === "album") {
			return await this.spotifyService.followAlbum(id, toFollow);
		} else if (type === "track") {
			return await this.spotifyService.followTrack(id, toFollow);
		}
	}

	@Get("/playlists/:userID")
	async getUserPlaylists(@Param("userID") userID: string): Promise<object> {
		return await this.spotifyService.getUsersPlaylists(userID);
	}

	@Get("/playlists")
	async getMyPlaylists(): Promise<object> {
		return await this.spotifyService.getUsersPlaylists();
	}

	@Get("/albums")
	async getMyAlbums(): Promise<object> {
		return await this.spotifyService.getMyAlbums();
	}

	@Get("/album/:id")
	async getAlbum(@Param("id") id: string): Promise<object> {
		return await this.spotifyService.getAlbum(id);
	}

	@Get("/artists")
	async getMyArtists(): Promise<object> {
		return await this.spotifyService.getMyArtists();
	}

	@Get("/artists/top")
	async getMyTopArtists(): Promise<object> {
		return await this.spotifyService.getMyTopArtists();
	}

	@Get("/artist/:id")
	async getArtist(@Param("id") id: string): Promise<object> {
		return await this.spotifyService.getArtist(id);
	}

	@Get("/following/artist/:id")
	async getFollowedArtists(@Param("id") id: string): Promise<boolean[]> {
		return await this.spotifyService.isFollowingArtist([id]);
	}

	@Get("/liked")
	async getMySavedTracks(): Promise<object> {
		return await this.spotifyService.getMySavedTracks();
	}

	@Get("/recently")
	async getMyRecentlyPlayedTracks(): Promise<object> {
		return await this.spotifyService.getRecentlyPlayedTracks();
	}

	@Get("/category")
	async getCategories(): Promise<object> {
		return await this.spotifyService.getCategories();
	}

	@Get("/category/:id")
	async getCategory(@Param("id") id: string): Promise<object> {
		return await this.spotifyService.getCategory(id);
	}

	@Get("/category/:id/playlists")
	async getCategoryPlaylists(@Param("id") id: string): Promise<object> {
		return await this.spotifyService.getCategoryPlaylists(id);
	}

	@Put("/volume/:increase")
	async setSpotifyVolume(@Param("increase") increase: string): Promise<string> {
		return await this.spotifyService.setVolume(increase === "true");
	}

	@Put("/power/:state")
	async setSpotifyPower(@Param("state") state: boolean): Promise<string> {
		return await this.spotifyService.togglePlayback(state);
	}

	@Get("/search")
	async searchSpotify(
		@QueryParam("query") query: string,
		@QueryParam("types") types: string,
		@QueryParam("limit") limit: number,
		@QueryParam("offset") offset: number,
	): Promise<object> {
		const selectedTypes = types !== undefined && types !== "" ? types.split(",") : [];
		const isAuthorized = this.spotifyService.isAuthorized();
		const hasQuery = query !== undefined && query !== "";
		const hasTypes = types !== undefined && types !== "";

		let searchResults: SpotifySearchResult = undefined;
		if (isAuthorized && hasQuery && hasTypes) searchResults = await this.spotifyService.searchSpotify(
			query,
			types,
			limit || 50,
			offset || 0)
		;

		return {
			spotify: this.spotifyService.getState(),
			searchOptions: {
				query: query,
				types: types,
				playlists: !hasQuery && !hasTypes ? true : selectedTypes.includes("playlist"),
				albums: !hasQuery && !hasTypes ? true : selectedTypes.includes("album"),
				artists: !hasQuery && !hasTypes ? true : selectedTypes.includes("artist"),
				tracks: !hasQuery && !hasTypes ? true : selectedTypes.includes("track"),
			},
			searchResults: searchResults
		};
	}
}
