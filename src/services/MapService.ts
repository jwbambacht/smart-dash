import { URL, URLSearchParams } from "url";
import { Container, Service } from "typedi";
import { BadRequestError } from "routing-controllers";
import { BaseService } from './BaseService';
import { MapRouteService } from "./MapRouteService";
import { Address } from "../models/Address";
import { LatLong, MRoute, OriginDestination, Route } from "../types/TravelTypes";

export function secondsToMinutesHoursText(seconds: number): string {
    const minutes = Math.round((seconds / 60) % 60);
    const hours = Math.floor(seconds / 60 / 60);
    return hours > 0 ? hours + ":" + ('0'+minutes).slice(-2) + "hr" : minutes + "min";
}

function meterToKmMeterText(meter: number): string {
    return meter >= 1000 ? Math.round(meter / 1000) + " km" : Math.round(meter) + " m";
}

@Service()
export class MapService extends BaseService {
    mapRouteService = Container.get(MapRouteService);
    apiKey: string;
    distanceURL = new URL(process.env.GOOGLE_DISTANCE_URL);
    geocodeURL = new URL(process.env.GOOGLE_GEOCODE_URL);
    enabled = true;
    error = '';
    routes: Route[] = null;
    updatedAt: Date = new Date();
    mapsUpdateInterval = 5 * 60 * 1000;
    mapsUpdateActivated = false;

    constructor() {
        super("MapService");

        this.fetchRoutes().then(() => {
            setInterval(async () => {
                if (this.mapsUpdateActivated) {
                    this.emit<object>("map routes update", await this.getRoutes(true));
                }

                this.mapsUpdateActivated = false;
            }, this.mapsUpdateInterval);
        });
    }

    async init(type: string): Promise<void> {
        await super.init(type);

        if (type === "map routes") {
            this.mapsUpdateActivated = true;
            this.emit<object>("map routes update", await this.getRoutes(true));
        }
    }

    activate(type: string): void {
        super.activate(type);

        if (type === "map routes") {
            this.mapsUpdateActivated = true;
        }
    }

    async checkServiceStatus(): Promise<boolean> {
        if (!await this.isServiceEnabled()) {
            this.routes = [];
            this.enabled = false;
            this.error = '';
            this.updatedAt = new Date();

            return false;
        }

        return true;
    }

    async getRoutes(force = false): Promise<object> {
        if (force) await this.fetchRoutes();

        return {
            serviceEnabled: await this.isServiceEnabled(),
            routes: this.routes,
            updatedAt: this.updatedAt?.getTime() || null,
            apiKey: this.apiKey,
            enabled: this.enabled,
            error: this.error
        };
    }

    async fetchRoutes(): Promise<void> {
        if (!(await this.checkServiceStatus())) return;

        return this.settingService.findByTypeSpec("api_key", "maps")
            .then(setting => setting.value)
            .then(async (apiKey) => {
                this.apiKey = apiKey;

                const mapRoutes = await this.mapRouteService.findAll();
                const routes = [];

                for (const mapRoute of mapRoutes) {
                    const origin = mapRoute.origin;
                    const destination = mapRoute.destination;

                    const twoWayRoutes: OriginDestination[] = [
                        {
                            origin: origin,
                            destination: destination
                        },
                        {
                            origin: destination,
                            destination: origin
                        }
                    ];

                    const rRoutes: MRoute[] = [];

                    for (let i = 0; i < twoWayRoutes.length; i++) {
                        const twoWayRoute = twoWayRoutes[i];

                        const params = {
                            "origins": (twoWayRoute.origin as Address).address,
                            "destinations": (twoWayRoute.destination as Address).address,
                            "mode": "car",
                            "departure_time": "now",
                            "key": apiKey
                        };

                        this.distanceURL.search = new URLSearchParams(params).toString();

                        const req = await fetch(this.distanceURL.toString());

                        if (req.status === 200) {
                            const resp = await req.json();

                            if ('error_message' in resp) {
                                this.enabled = false;
                                this.error = resp['error_message'];
                                return;
                            }

                            this.enabled = true;
                            this.error = '';

                            let duration = resp.rows[0].elements[0].duration.value;
                            const durationNow = resp.rows[0].elements[0].duration_in_traffic.value;
                            const traffic = (duration < durationNow) ? durationNow - duration : 0;
                            duration = durationNow;

                            rRoutes.push({
                                origin: {
                                    name: (twoWayRoute.origin as Address).name,
                                    address: (twoWayRoute.origin as Address).address,
                                    location: {
                                        lat: (twoWayRoute.origin as Address).lat,
                                        lon: (twoWayRoute.origin as Address).lon
                                    }
                                },
                                destination: {
                                    name: (twoWayRoute.destination as Address).name,
                                    address: (twoWayRoute.destination as Address).address,
                                    location: {
                                        lat: (twoWayRoute.destination as Address).lat,
                                        lon: (twoWayRoute.destination as Address).lon
                                    }
                                },
                                distance: {
                                    text: meterToKmMeterText(resp.rows[0].elements[0].distance.value), //Math.round(resp.rows[0].elements[0].distance.value / 1000) + " km",
                                    value: resp.rows[0].elements[0].distance.value
                                },
                                duration: {
                                    text: secondsToMinutesHoursText(duration),
                                    value: duration
                                },
                                traffic: {
                                    text: secondsToMinutesHoursText(traffic), // Math.round(traffic / 60) + " min",
                                    value: traffic > 30 ? traffic : 0
                                }
                            });
                        } else {
                            this.enabled = false;
                            this.error = 'Unknown error occurred';
                        }
                    }

                    routes.push({
                        id: mapRoute.id,
                        name: mapRoute.name,
                        type: "map_route",
                        routes: rRoutes
                    });
                }

                this.routes = routes;
                this.updatedAt = new Date();

            }).catch(err => {
                this.routes = [];
                this.updatedAt = new Date();
                this.enabled = false;
                this.error = 'API key not defined';

                this.log.error("MapService", `API key not defined ${err}`);
            });
    }

    async addressToLocation(address: string): Promise<LatLong> {
        const params = {
            address: encodeURIComponent(address),
            key: this.apiKey
        };

        this.geocodeURL.search = new URLSearchParams(params).toString();

        const req = await fetch(this.geocodeURL.toString());

        if (req.ok && req.status === 200) {
            const resp = await req.json();

            if ("results" in resp && resp.results.length > 0) {
                return {
                    lat: resp.results[0].geometry.location.lat,
                    lon: resp.results[0].geometry.location.lng
                };
            } else {
                throw new Error("Address not found");
            }
        }

        throw new BadRequestError(`An error occurred during address conversion fetch: ${req.statusText}`);
    }
}
