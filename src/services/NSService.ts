import { Container, Service } from "typedi";
import { URLSearchParams } from "url";
import { v4 as uuid } from 'uuid';
import moment from "moment";
import { BaseService } from './BaseService';
import { TrainRouteService } from "./TrainRouteService";
import {
    NSStation, NSStationResponseObj,
    Route,
    TrainTransfer, TrainTransferMessageResponseObj,
    TrainTransferResponseObj,
    TrainTripResponseObj,
    TRoute
} from '../types/TravelTypes';

function trainTypeToColor(type: string): string {
    switch (type) {
        case "THA": return "success";
        case "ICD": return "info";
        case "IC": return "blue";
        case "SPR": return "warning";
        default: return "secondary";
    }
}

@Service()
export class NSService extends BaseService {
    trainRouteService = Container.get(TrainRouteService);
    stationsURL = new URL(process.env.NS_STATIONS_URL);
    tripsURL = new URL(process.env.NS_TRIPS_URL);
    enabled = true;
    error = '';
    stations: NSStation[] = [];
    trips: Route[] = [];
    updatedAt: Date = new Date();
    nsStationsUpdateInterval = 60 * 60 * 1000;
    nsTripsUpdateInterval = 2 * 60 * 1000;
    nsTripsUpdateActivated = false;

    constructor() {
        super("NSService");

        this.fetchStations().then(() => {
            setInterval(async () => {
                this.fetchStations();
            }, this.nsStationsUpdateInterval);

            this.fetchTrips().then(() => {
                setInterval(async () => {
                    if (this.nsTripsUpdateActivated) {
                        this.emit<object>("ns trips update", await this.getRoutes(true));
                    }

                    this.nsTripsUpdateActivated = false;
                }, this.nsTripsUpdateInterval);
            });
        });
    }

    async init(type: string): Promise<void> {
        await super.init(type);

        if (type === "ns trips") {
            this.nsTripsUpdateActivated = true;
            this.emit<object>("ns trips update", await this.getRoutes(true));
        }
    }

    activate(type: string): void {
        super.activate(type);

        if (type === "ns trips") {
            this.nsTripsUpdateActivated = true;
        }
    }

    async checkServiceStatus(): Promise<boolean> {
        if (!await this.isServiceEnabled()) {
            this.trips = [];
            this.stations = [];
            this.enabled = false;
            this.error = '';
            this.updatedAt = new Date();

            return false;
        }

        return true;
    }

    async getRoutes(force = false): Promise<object> {
        if (force) await this.fetchTrips();

        return {
            serviceEnabled: await this.isServiceEnabled(),
            routes: await this.getTrips(),
            stations: await this.getStations(),
            updatedAt: this.updatedAt?.getTime() || null,
            enabled: this.enabled,
            error: this.error
        };
    }

    async getStations(): Promise<NSStation[]> {
        return this.stations;
    }

    async fetchStations(): Promise<void> {
        if (!(await this.checkServiceStatus())) return;

        this.settingService.findByTypeSpec("api_key", "ns")
            .then(setting => setting.value)
            .then(async (apiKey) => {
                const req = await fetch(this.stationsURL.toString(), {
                    headers: {
                        "Ocp-Apim-Subscription-Key": apiKey
                    }
                });

                if (req.status === 200) {
                    const resp = await req.json();

                    this.enabled = true;
                    this.error = '';

                    this.stations = resp.payload
                        .filter((station: { land: string }) => station.land === "NL")
                        .map((station: NSStationResponseObj): NSStation => {
                            return {
                                name: station.namen.lang,
                                code: station.code,
                                uicCode: station.UICCode
                            };
                        }).sort((a: NSStation, b: NSStation) => a.name.localeCompare(b.name));

                    return this.stations;

                } else if (req.status === 401) {
                    this.stations = [];
                    this.enabled = false;
                    this.error = (await req.json()).message;

                } else {
                    this.stations = [];
                    this.enabled = false;
                    this.error = 'Unknown error while fetching stations';
                }
            }).catch(err => {
                this.stations = [];
                this.updatedAt = new Date();
                this.enabled = false;
                this.error = 'API key not defined';

                this.log.error("NSService", `API key not defined ${err}`);
            });
    }

    async getTrips(): Promise<Route[]> {
        return this.trips;
    }

    async fetchTrips(): Promise<void> {
        if (!(await this.checkServiceStatus())) return;

        return this.settingService.findByTypeSpec("api_key", "ns")
            .then(setting => setting.value)
            .then(async (apiKey) => {
                const trainRoutes = await this.trainRouteService.findAll();

                const trips: Route[] = [];

                for (const trainRoute of trainRoutes) {
                    const origin = trainRoute.origin;
                    const destination = trainRoute.destination;

                    const params = {
                        "fromStation": origin.stationCode,
                        "toStation": destination.stationCode,
                        "dateTime": new Date().toISOString()
                    };

                    this.tripsURL.search = new URLSearchParams(params).toString();

                    const req = await fetch(this.tripsURL.toString(), {
                        headers: {
                            "Ocp-Apim-Subscription-Key": apiKey
                        }
                    });

                    if (req.status === 200) {
                        const resp = await req.json();

                        this.enabled = true;
                        this.error = '';

                        const route = {
                            id: trainRoute.id,
                            name: trainRoute.name,
                            type: "train_route",
                            origin: origin,
                            destination: destination,
                            routes: resp.trips.map((trip: TrainTripResponseObj): TRoute => ({
                                id: uuid(),
                                departure: {
                                    plannedDateTime: new Date(trip.legs[0].origin.plannedDateTime),
                                    plannedTime: moment(trip.legs[0].origin.plannedDateTime).format("HH:mm"),
                                    actualDateTime: new Date(trip.legs[0].origin.actualDateTime || trip.legs[0].origin.plannedDateTime),
                                    actualTime: moment(trip.legs[0].origin.actualDateTime || trip.legs[0].origin.plannedDateTime).format("HH:mm"),
                                    delay: moment.duration(moment(trip.legs[0].origin.actualDateTime || trip.legs[0].origin.plannedDateTime).diff(trip.legs[0].origin.plannedDateTime)).asMinutes()
                                },
                                arrival: {
                                    plannedDateTime: new Date(trip.legs[trip.legs.length - 1].destination.plannedDateTime),
                                    plannedTime: moment(trip.legs[trip.legs.length - 1].destination.plannedDateTime).format("HH:mm"),
                                    actualDateTime: new Date(trip.legs[trip.legs.length - 1].destination.actualDateTime || trip.legs[trip.legs.length - 1].destination.plannedDateTime),
                                    actualTime: moment(trip.legs[trip.legs.length - 1].destination.actualDateTime || trip.legs[trip.legs.length - 1].destination.plannedDateTime).format("HH:mm"),
                                    delay: moment.duration(moment(trip.legs[trip.legs.length - 1].destination.actualDateTime || trip.legs[trip.legs.length - 1].destination.plannedDateTime).diff(trip.legs[trip.legs.length - 1].destination.plannedDateTime)).asMinutes()
                                },
                                duration: {
                                    plannedDateTime: trip.plannedDurationInMinutes,
                                    plannedTime: moment.utc(trip.plannedDurationInMinutes * 1000 * 60).format("H:mm"),
                                    actualDateTime: trip.actualDurationInMinutes,
                                    actualTime: moment.utc(trip.actualDurationInMinutes * 1000 * 60).format("H:mm"),
                                },
                                delayed: trip.plannedDurationInMinutes < trip.actualDurationInMinutes,
                                delayInMinutes: Number(trip.actualDurationInMinutes) - Number(trip.plannedDurationInMinutes),
                                cancelled: trip.status === "CANCELLED",
                                maintenance: trip.status === "MAINTENANCE",
                                crowdForecast: trip.crowdForecast,
                                nTransfers: trip.transfers,
                                transfers: trip.legs.map((leg: TrainTransferResponseObj): TrainTransfer => ({
                                    origin: {
                                        name: leg.origin.name,
                                        planned: {
                                            dateTime: new Date(leg.origin.plannedDateTime),
                                            time: moment(leg.origin.plannedDateTime).format("HH:mm"),
                                            platform: leg.origin.plannedTrack
                                        },
                                        actual: {
                                            dateTime: new Date(leg.origin.actualDateTime || leg.origin.plannedDateTime),
                                            time: moment(leg.origin.actualDateTime || leg.origin.plannedDateTime).format("HH:mm"),
                                            platform: leg.origin.actualTrack
                                        },
                                        delay: moment.duration(moment(leg.origin.actualDateTime || leg.origin.plannedDateTime).diff(leg.origin.plannedDateTime)).asMinutes(),
                                    },
                                    destination: {
                                        name: leg.destination.name,
                                        planned: {
                                            dateTime: new Date(leg.destination.plannedDateTime),
                                            time: moment(leg.destination.plannedDateTime).format("HH:mm"),
                                            platform: leg.destination.plannedTrack
                                        },
                                        actual: {
                                            dateTime: new Date(leg.destination.actualDateTime || leg.destination.plannedDateTime),
                                            time: moment(leg.destination.actualDateTime || leg.destination.plannedDateTime).format("HH:mm"),
                                            platform: leg.destination.actualTrack
                                        },
                                        delay: moment.duration(moment(leg.destination.actualDateTime || leg.destination.plannedDateTime).diff(leg.destination.plannedDateTime)).asMinutes(),
                                    },
                                    direction: leg.direction,
                                    trainOperator: leg.product.operatorName,
                                    trainType: leg.product.longCategoryName,
                                    trainTypeShort: leg.product.shortCategoryName,
                                    trainTypeColor: trainTypeToColor(leg.product.shortCategoryName),
                                    cancelled: leg.cancelled,
                                    maintenance: leg.messages.some((message: TrainTransferMessageResponseObj) => message.type === "MAINTENANCE"),
                                    maintenanceAt: leg.messages.some((message: TrainTransferMessageResponseObj) => message.type === "MAINTENANCE") ? leg.messages.filter((message: TrainTransferMessageResponseObj) => message.type === "MAINTENANCE") : [],
                                }))
                            }))
                        };

                        trips.push(route);

                        if (this.stations.length === 0) {
                            await this.fetchStations();
                        }

                    } else if (req.status === 401) {
                        trips.splice(0, trips.length);
                        this.enabled = false;
                        this.error = (await req.json()).message;

                        break;
                    } else {
                        trips.splice(0, trips.length);
                        this.enabled = false;
                        this.error = 'Unknown error while fetching trips';
                        break;
                    }
                }

                this.trips = trips;
                this.updatedAt = new Date();

            }).catch(err => {
                this.trips = [];
                this.updatedAt = new Date();
                this.enabled = false;
                this.error = 'API key not defined';

                this.log.error("NSService", `API key not defined ${err}`);
            });
    }
}
