import { Container } from "typedi";
import { BadRequestError, Body, Delete, Get, JsonController, Param, Params, Post, Put, QueryParam } from "routing-controllers";
import fs from "fs";
import path from 'path';
import { LoggerService } from "../services/LoggerService";
import { WeatherService} from "../services/WeatherService";
import { NSService } from "../services/NSService";
import { DevicesService } from "../services/DevicesService";
import { CalendarService } from "../services/CalendarService";
import { TaskService } from "../services/TaskService";
import { MapService } from "../services/MapService";
import { SpotifyService } from "../services/SpotifyService";
import { Device } from "../types/DevicesTypes";
import { SpotifySearchResult } from "../types/SpotifyTypes";
import { SettingService } from '../services/SettingService';
import { Setting } from '../models/Setting';

@JsonController("/api/widgets")
export class UserController {
    log = Container.get(LoggerService);
    weatherService = Container.get(WeatherService);
    mapService = Container.get(MapService);
    nsService = Container.get(NSService);
    devicesService = Container.get(DevicesService);
    calendarService = Container.get(CalendarService);
    tasksService = Container.get(TaskService);
    spotifyService = Container.get(SpotifyService);
    settingService = Container.get(SettingService);

    @Get("/weather")
    async getWeather(): Promise<object> {
        return await this.weatherService.getWeather();
    }

    @Get("/rain")
    async getRain(): Promise<object> {
        return await this.weatherService.getRain();
    }

    @Get("/travel")
    async getTravel(
        @QueryParam("force_map", {required: false}) forceMap?: boolean,
        @QueryParam("force_train", {required: false}) forceTrain?: boolean
    ): Promise<object> {
        return {
            map: await this.mapService.getRoutes(forceMap),
            train: await this.nsService.getRoutes(forceTrain)
        };
    }

    @Get("/travel/map/address/convert")
    async getTravelAddressLocation(@QueryParam("address", { required: true }) address: string): Promise<object> {
        return await this.mapService.addressToLocation(address);
    }

    @Get("/travel/train/stations")
    async getTravelStations(): Promise<object> {
        return await this.nsService.getStations();
    }

    @Get("/travel/train/trips")
    async getTravelTrips(): Promise<object> {
        return await this.nsService.getTrips();
    }

    @Get("/devices")
    async getDevices(): Promise<object> {
        return await this.devicesService.getDevicesScenes();
    }

    @Get("/devices/:id/toggle")
    async setToggleDevice(@Param("id") id: number): Promise<string> {
        const status: Device = await this.devicesService.getDeviceStatus(id);

        if (status.switchedOn) {
            await this.devicesService.turnDeviceOnOff(id, false);
        } else {
            await this.devicesService.turnDeviceOnOff(id, true);
        }

        return "OK";
    }

    @Get("/devices/:id/on")
    async setDeviceOn(@Param("id") id: number): Promise<string> {
        await this.devicesService.turnDeviceOnOff(id, true);

        return "OK";
    }

    @Get("/devices/:id/off")
    async setDevicesOff(@Param("id") id: number): Promise<string> {
        await this.devicesService.turnDeviceOnOff(id, false);

        return "OK";
    }

    @Get("/devices/:id/dim/:level")
    async dimDevice(@Param("id") id: number, @Param("level") level: number): Promise<string> {
        await this.devicesService.dimDevice(id, level);

        return "OK";
    }

    @Get("/devices/:id/color/:level")
    async colorDevice(@Param("id") id: number, @Param("level") level: number): Promise<string> {
        await this.devicesService.colorDevice(id, level);

        return "OK";
    }

    @Get("/devices/:id/status")
    async deviceStatus(@Param("id") id: number): Promise<object> {
        return await this.devicesService.getDeviceStatus(id);
    }

    @Get("/devices/scene/:id")
    async executeScene(@Param("id") id: number): Promise<string> {
        await this.devicesService.executeScene(id);

        return "OK";
    }

    // @Get("/devices/energy/live")
    // async getLiveEnergyReadings(): Promise<object> {
    //     return await this.devicesService.fetchLiveEnergyReadings();
    // }

    @Get("/devices/energy/historical/:year/:month")
    async getEnergyReadingsMonth(@Param("year") year: number, @Param("month") month: number): Promise<object> {
        return await this.devicesService.getMonthEnergyReadings(month, year);
    }

    @Post("/devices/reinit")
    async getReInitDevices(): Promise<string> {
        await this.devicesService.setDevicesCredentials();

        return "OK";
    }

    @Get("/calendar/month/:year/:month")
    async getCalendarMonth(@Param("year") year: number, @Param("month") month: number): Promise<object> {
        return this.calendarService.getCalendarMonth(year, month);
    }

    @Get("/calendar/events/:year/:week")
    async getCalendarEvents(@Param("year") year: number, @Param("week") week: number): Promise<object> {
        return await this.calendarService.getCalendarEvents(year, week);
    }

    @Get("/calendar/find/:id?")
    async getCalendars(@Params() { id = 'all' }: { id: string }): Promise<object> {
        if (id === "all") {
            return await this.calendarService.getCalendars();
        } else {
            return await this.calendarService.getCalendar(id);
        }
    }

    @Get("/calendar/preview/events")
    async getCalendarPreviewEvents(): Promise<object> {
        return await this.calendarService.getCalendarEventsBetween();
    }

    @Post("/calendar/add")
    async addCalendar(@Body() body: { customName: string; url: string; color: string }): Promise<string> {
        return await this.calendarService.addCalendar(body);
    }

    @Post("/calendar/update/:id")
    async updateCalendar(@Param("id") id: string, @Body() body: { customName: string; url: string; color: string }): Promise<string> {
        return await this.calendarService.setCalendar(body, id);
    }

    @Delete("/calendar/delete/:id")
    async deleteCalendar(@Param("id") id: string): Promise<string> {
        return await this.calendarService.deleteCalendar(id);
    }

    @Post("/calendar/toggle/:id/:toggle")
    async setCalendarStatus(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
        return await this.calendarService.setCalendarStatus(id, toggle);
    }

    @Get("/tasks")
    async getTasks(): Promise<object> {
        return await this.tasksService.getTasks();
    }

    @Post("/tasks")
    async addTask(@Body() body: { task: string; flagged: boolean }): Promise<string> {
        return await this.tasksService.addTask(body);
    }

    @Put("/tasks/:id")
    async editTask(@Param("id") id: string, @Body() body: { description: string }): Promise<string> {
        return await this.tasksService.editTask(id, body.description);
    }

    @Delete("/tasks/:id")
    async deleteTask(@Param("id") id: string): Promise<string> {
        return await this.tasksService.deleteTask(id);
    }

    @Post("/tasks/complete/:id/:toggle")
    async setCompleteTask(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
        return await this.tasksService.setTaskComplete(id, toggle);
    }

    @Post("/tasks/flag/:id/:toggle")
    async setFlagTask(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
        return await this.tasksService.setTaskFlag(id, toggle);
    }

    @Put("/spotify/event")
    async putEvent(@QueryParam("type") type: string): Promise<string> {
        await this.spotifyService.handleSpotifyPlayerEvents(type);

        return "OK";
    }

    @Post("/spotify/reinit")
    async getReInitSpotify(): Promise<string> {
        await this.spotifyService.initiateSpotifyAuthorization();

        return "OK";
    }

    @Get("/spotify/speaker")
    async getSpotifyDevices(): Promise<object> {
        return this.spotifyService.getSpotifySpeaker();
    }

    @Get("/spotify/player")
    async getCurrentTrack(): Promise<object> {
        return await this.spotifyService.getPlayer();
    }

    @Put("/spotify/device")
    async setSpotifyDevice(@Body() body: { deviceID: number }): Promise<object> {
        return await this.devicesService.setDeviceForSpotify(body.deviceID);
    }

    @Get("/spotify/track/:track_id")
    async getTrack(@Param("track_id") trackID: string): Promise<object> {
        return await this.spotifyService.getTrack(trackID);
    }

    @Get("/spotify/tracks/top")
    async getMyTopTracks(): Promise<object> {
        return await this.spotifyService.getMyTopTracks();
    }

    @Put("/spotify/playback/play")
    async setPlaybackPlay(): Promise<object> {
        return await this.spotifyService.setPlayback("play");
    }

    @Put("/spotify/playback/pause")
    async setPlaybackPause(): Promise<object> {
        return await this.spotifyService.setPlayback("pause");
    }

    @Put("/spotify/playback/next")
    async setPlaybackNext(): Promise<object> {
        return await this.spotifyService.setPlayback("next");
    }

    @Put("/spotify/playback/previous")
    async setPlaybackPrevious(): Promise<object> {
        return await this.spotifyService.setPlayback("previous");
    }

    @Put("/spotify/playback/uri/:uri/:offset")
    async playPlaylist(@Param("uri") uri: string, @Param("offset") offset: number): Promise<object> {
        if (uri === "" || (uri !== "" && !uri.includes(":"))) throw new BadRequestError("Malformed URI");

        const type = uri.split(":")[1];

        return await this.spotifyService.setPlaybackWithContext(type, uri, offset);
    }

    @Get("/spotify/playlist/:id")
    async getPlaylist(@Param("id") id: string): Promise<object> {
        return await this.spotifyService.getPlaylist(id);
    }

    @Put("/spotify/follow/:type/:id/:toFollow")
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

    @Get("/spotify/playlists/:userID")
    async getUserPlaylists(@Param("userID") userID: string): Promise<object> {
        return await this.spotifyService.getUsersPlaylists(userID);
    }

    @Get("/spotify/playlists")
    async getMyPlaylists(): Promise<object> {
        return await this.spotifyService.getUsersPlaylists();
    }

    @Get("/spotify/albums")
    async getMyAlbums(): Promise<object> {
        return await this.spotifyService.getMyAlbums();
    }

    @Get("/spotify/album/:id")
    async getAlbum(@Param("id") id: string): Promise<object> {
        return await this.spotifyService.getAlbum(id);
    }

    @Get("/spotify/artists")
    async getMyArtists(): Promise<object> {
        return await this.spotifyService.getMyArtists();
    }

    @Get("/spotify/artists/top")
    async getMyTopArtists(): Promise<object> {
        return await this.spotifyService.getMyTopArtists();
    }

    @Get("/spotify/artist/:id")
    async getArtist(@Param("id") id: string): Promise<object> {
        return await this.spotifyService.getArtist(id);
    }

    @Get("/spotify/following/artist/:id")
    async getFollowedArtists(@Param("id") id: string): Promise<boolean[]> {
        return await this.spotifyService.isFollowingArtist([id]);
    }

    @Get("/spotify/liked")
    async getMySavedTracks(): Promise<object> {
        return await this.spotifyService.getMySavedTracks();
    }

    @Get("/spotify/recently")
    async getMyRecentlyPlayedTracks(): Promise<object> {
        return await this.spotifyService.getRecentlyPlayedTracks();
    }

    @Get("/spotify/category")
    async getCategories(): Promise<object> {
        return await this.spotifyService.getCategories();
    }

    @Get("/spotify/category/:id")
    async getCategory(@Param("id") id: string): Promise<object> {
        return await this.spotifyService.getCategory(id);
    }

    @Get("/spotify/category/:id/playlists")
    async getCategoryPlaylists(@Param("id") id: string): Promise<object> {
        return await this.spotifyService.getCategoryPlaylists(id);
    }

    @Put("/spotify/volume/:increase")
    async setSpotifyVolume(@Param("increase") increase: string): Promise<string> {
        return await this.spotifyService.setVolume(increase === "true");
    }

    @Put("/spotify/power/:state")
    async setSpotifyPower(@Param("state") state: boolean): Promise<string> {
        return await this.spotifyService.togglePlayback(state);
    }

    @Get("/spotify/search")
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

    @Get("/templates/:page")
    async getTemplates(@Param("page") page: string): Promise<object> {
        const templates: { [key: string]: string } = {};

        try {
            if (page === "devices") {
                templates.scene = fs.readFileSync(path.join(__dirname, "../views/widgets/devices_scene.ejs"), 'utf8');
                templates.switch = fs.readFileSync(path.join(__dirname, "../views/widgets/devices_switch.ejs"), 'utf8');
                templates.dimmer = fs.readFileSync(path.join(__dirname, "../views/widgets/devices_dimmer.ejs"), 'utf8');
                templates.color = fs.readFileSync(path.join(__dirname, "../views/widgets/devices_color.ejs"), 'utf8');
            }
        } catch (err) {
            this.log.error(err);
        }

        return templates;
    }

    @Put("/service")
    async putServiceStatus(@Body() body: { serviceType: string; status: string }): Promise<boolean> {
        const serviceTypeSetting = await this.settingService.findByTypeSpec("service", body.serviceType);
        if (serviceTypeSetting) {
            serviceTypeSetting.value = body.status;

            if (await this.settingService.update(serviceTypeSetting)) return true;
        } else {
            const newSetting = new Setting();
            newSetting.type = "service";
            newSetting.description = body.serviceType + " status";
            newSetting.specification = body.serviceType;
            newSetting.value = body.status;

            if (await this.settingService.create(newSetting)) return true;
        }

        return false;
    }

    @Get("/restart")
    async getRestartServer(): Promise<void> {
        process.exit(1);
    }
}
