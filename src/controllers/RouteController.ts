import { Controller, Get, Param, QueryParam, Redirect, Render } from "routing-controllers";
import { Container } from "typedi";
import moment from 'moment';

import { LoggerService } from "../services/LoggerService";
import { SettingService } from "../services/SettingService";
import { AddressService } from "../services/AddressService";
import { MapRouteService } from "../services/MapRouteService";
import { DevicesService } from "../services/DevicesService";
import { WeatherService } from "../services/WeatherService";
import { CalendarService } from "../services/CalendarService";
import { TaskService } from "../services/TaskService";
import { TrainStationService } from "../services/TrainStationService";
import { TrainRouteService } from "../services/TrainRouteService";
import { MapService } from "../services/MapService";
import { NSService } from "../services/NSService";
import { SpotifyService } from "../services/SpotifyService";
import { CryptoService } from '../services/CryptoService';
import { SpotifySearchResult } from "../types/SpotifyTypes";

@Controller()
export class RouteController {
    loggerService = Container.get(LoggerService);
    weatherService = Container.get(WeatherService);
    spotifyService = Container.get(SpotifyService);
    mapService = Container.get(MapService);
    addressService = Container.get(AddressService);
    mapRouteService = Container.get(MapRouteService);
    trainStationService = Container.get(TrainStationService);
    trainRouteService = Container.get(TrainRouteService);
    nsService = Container.get(NSService);
    devicesService = Container.get(DevicesService);
    calendarService = Container.get(CalendarService);
    taskService = Container.get(TaskService);
    cryptoService = Container.get(CryptoService);
    settingService = Container.get(SettingService);

    @Get("/")
    @Get("/home")
    @Render("index.ejs")
    async GetHome(): Promise<unknown> {
        const now = new Date();
        return {
            page: "home",
            now: {
                date: moment(now).format("D"),
                dayText: moment(now).format("dddd"),
                dayTextAbbrev: moment(now).format("ddd"),
                month: moment(now).format("M"),
                monthText: moment(now).format("MMMM"),
                monthTextAbbrev: moment(now).format("MMM"),
                time: moment(now).format("HH:mm:ss")
            },
            weather: await this.weatherService.getWeather(),
            map: await this.mapService.getRoutes(),
            train: await this.nsService.getRoutes(),
            devices: await this.devicesService.getDevicesScenes(),
            events: await this.calendarService.getCalendarEventsBetween(),
            tasks: await this.taskService.getTasks(),
            spotify: await this.spotifyService.getState(),
            crypto: await this.cryptoService.getCrypto()
        };
    }

    @Get("/spotify")
    @Redirect("/spotify/playlists")
    async GetSpotify(): Promise<unknown> {
        return;
    }

    @Get("/spotify/playlists")
    @Render("index.ejs")
    async GetSpotifyPlaylists(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "playlists",
            spotify: await this.spotifyService.getState(),
            playlists: await this.spotifyService.getMyPlaylists() || null
        };
    }

    @Get("/spotify/playlist/:id")
    @Render("index.ejs")
    async GetSpotifyPlaylistID(@Param("id") id: string): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "playlist",
            spotify: await this.spotifyService.getState(),
            playlist: await this.spotifyService.getPlaylist(id) || null
        };
    }

    @Get("/spotify/albums")
    @Render("index.ejs")
    async GetSpotifyAlbums(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "albums",
            spotify: await this.spotifyService.getState(),
            albums: await this.spotifyService.getMyAlbums() || null,
        };
    }

    @Get("/spotify/album/:id")
    @Render("index.ejs")
    async GetSpotifyAlbumID(@Param("id") id: string): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "album",
            spotify: await this.spotifyService.getState(),
            album: await this.spotifyService.getAlbum(id) || null
        };
    }

    @Get("/spotify/artists")
    @Render("index.ejs")
    async GetSpotifyArtists(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "artists",
            spotify: await this.spotifyService.getState(),
            artists: await this.spotifyService.getMyArtists() || null,
        };
    }

    @Get("/spotify/artist/:id")
    @Render("index.ejs")
    async GetSpotifyArtistID(@Param("id") id: string): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "artist",
            spotify: await this.spotifyService.getState(),
            artist: await this.spotifyService.getArtist(id) || null,
        };
    }

    @Get("/spotify/top")
    @Render("index.ejs")
    async GetSpotifyTop(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "top",
            spotify: await this.spotifyService.getState(),
            artists: await this.spotifyService.getMyTopArtists() || null,
            tracks: await this.spotifyService.getMyTopTracks() || null,
        };
    }

    @Get("/spotify/liked")
    @Render("index.ejs")
    async GetSpotifyLikedTracks(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "liked",
            spotify: await this.spotifyService.getState(),
            liked: await this.spotifyService.getMySavedTracks() || null
        };
    }

    @Get("/spotify/recently")
    @Render("index.ejs")
    async GetSpotifyRecentlyPlayedTracks(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "recently",
            spotify: await this.spotifyService.getState(),
            recentlyPlayed: await this.spotifyService.getRecentlyPlayedTracks() || null
        };
    }

    @Get("/spotify/categories")
    @Render("index.ejs")
    async GetSpotifyCategories(): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "categories",
            spotify: await this.spotifyService.getState(),
            categories: await this.spotifyService.getCategories() || null
        };
    }

    @Get("/spotify/category/:id")
    @Render("index.ejs")
    async GetSpotifyCategory(@Param("id") id: string): Promise<unknown> {
        return {
            page: "spotify",
            pageType: "category",
            spotify: await this.spotifyService.getState(),
            category: await this.spotifyService.getCategoryPlaylists(id) || null,
        };
    }

    @Get("/spotify/search")
    @Render("index.ejs")
    async GetSpotifySearch(
        @QueryParam("query") query: string,
        @QueryParam("types") types: string
    ): Promise<unknown> {
        const selectedTypes = types !== undefined && types !== "" ? types.split(",") : [];
        const isAuthorized = this.spotifyService.isAuthorized();
        const hasQuery = query !== undefined && query !== "";
        const hasTypes = types !== undefined && types !== "";

        let searchResults: SpotifySearchResult = undefined;
        if (isAuthorized && hasQuery && hasTypes) searchResults = await this.spotifyService.searchSpotify(query, types);

        return {
            page: "spotify",
            pageType: "search",
            spotify: await this.spotifyService.getState(),
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

    @Get("/spotify/login")
    @Redirect("/")
    async GetSpotifyLogin(): Promise<string> {
        return await this.spotifyService.initiateSpotifyAuthorization();
    }

    @Get("/spotify/callback")
    @Redirect("/")
    async GetSpotifyAuthorizationCode(@QueryParam("code") code: string): Promise<string> {
        return await this.spotifyService.getAccessToken(code);
    }

    @Get("/weather")
    @Render("index.ejs")
    async GetWeather(): Promise<unknown> {
        return {
            page: "weather",
            weather: await this.weatherService.getWeather(),
        };
    }

    @Get("/travel")
    @Render("index.ejs")
    async GetTravel(): Promise<unknown> {
        return {
            page: "travel",
            map: await this.mapService.getRoutes(),
            train: await this.nsService.getRoutes(),
            mapAddresses: await this.addressService.findAll(),
            mapRoutes: await this.mapRouteService.findAll(),
            trainStations: await this.trainStationService.findAll(),
            trainRoutes: await this.trainRouteService.findAll()
        };
    }

    @Get("/devices")
    @Render("index.ejs")
    async GetDevices(): Promise<unknown> {
        return {
            page: "devices",
            devices: await this.devicesService.getDevicesScenes()
        };
    }

    @Get("/energy")
    @Render("index.ejs")
    async GetEnergy(): Promise<unknown> {
        this.devicesService.fetchLiveEnergyReadings();

        return {
            page: "energy",
            devicesStatus: await this.devicesService.getStatus(),
            current: await this.devicesService.getLiveEnergyReadings(),
            history: await this.devicesService.getMonthEnergyReadings()
        };
    }

    @Get("/calendar")
    @Render("index.ejs")
    async GetCalendar(): Promise<unknown> {
        return {
            page: "calendar",
            events: await this.calendarService.getCalendarEvents(),
            calendars: await this.calendarService.getCalendars(),
            calendar: this.calendarService.getCalendarMonth()
        };
    }

    @Get("/tasks")
    @Render("index.ejs")
    async GetTasks(): Promise<unknown> {
        return {
            page: "tasks",
            tasks: await this.taskService.getTasks()
        };
    }

    @Get("/crypto")
    @Render("index.ejs")
    async GetCrypto(): Promise<unknown> {
        return {
            page: "crypto",
            crypto: await this.cryptoService.getCrypto(false)
        };
    }

    @Get("/settings")
    @Render("index.ejs")
    async GetSettings(): Promise<unknown> {
        return {
            page: "settings",
            settings: await this.settingService.findAll()
        };
    }

    @Get("/logs")
    @Redirect("/")
    async getSettingsLogs(): Promise<string> {
        const logs = await this.loggerService.getLogFileNames();
        const logName = logs.length > 0 ? logs[0] : null;

        return "/logs/" + logName + "/1";
    }

    @Get("/logs/:name/:page")
    @Render("index.ejs")
    async getSettingsLogFile(@Param("name") name: string, @Param("page") pageNumber: number): Promise<unknown> {
        const logs = await this.loggerService.getLogFileNames();
        const logName = name || (logs.length > 0 ? logs[0] : null);

        return {
            page: "logs",
            logNames: logs,
            log: await this.loggerService.getLog(logName, pageNumber || 1),
            pageNumber: pageNumber || 1
        };
    }
}
