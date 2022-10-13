import { Service } from 'typedi';
import { URL, URLSearchParams } from 'url';
import moment from 'moment';
import { BaseService } from './BaseService';
import { Weather, WeatherDay, Location, Rain } from "../types/WeatherTypes";

export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const daysAbbrev = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthsAbbrev = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const scaleBeaufort = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117, 200];
const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function windToBeaufort(speed: number): string {
    return scaleBeaufort.findIndex(function(element) {
        return speed <= element;
    }).toString();
}

function angleToDirection(angle: number): string {
    return windDirections[Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8];
}

@Service()
export class WeatherService extends BaseService {
    weatherURL = new URL(process.env.WEATHER_FORECAST_URL);
    rainURL = new URL(process.env.WEATHER_RAIN_URL);
    location: Location = null;
    weatherToday: WeatherDay = null;
    weatherForecast: WeatherDay[] = null;
    rainForecast: Rain[] = null;
    rainSVG: string = null;
    rainTotal = 0;
    updatedAt: Date = new Date();
    locationUpdateTimer: NodeJS.Timeout = null;
    forecastUpdateInterval = 10 * 60 * 1000;
    forecastUpdateActivated = false;
    rainUpdateInterval = 3 * 60 * 1000;
    rainUpdateActivated = false;
    weatherEnabled = true;
    weatherError = '';
    rainEnabled = true;
    rainError = '';

    constructor() {
        super("WeatherService");

        this.startService();
    }

    async startService(): Promise<void> {
        this.getLocation().then((location) => {
            if (!location) {
                this.locationUpdateTimer = setInterval(async () => {
                    const location = await this.getLocation();
                    if (location !== null) this.locationUpdateTimer = null;
                }, 30000);

            } else {
                this.fetchForecast().then(() => {
                    setInterval(async () => {
                        if (this.forecastUpdateActivated) {
                            this.emit<object>("forecast update",await  this.getForecast(true));
                        }

                        this.forecastUpdateActivated = false;
                    }, this.forecastUpdateInterval);
                });

                this.fetchRain().then(() => {
                    setInterval(async () => {
                        if (this.rainUpdateActivated) {
                            this.emit<object>("rain update", await this.getRain(true));
                        }

                        this.rainUpdateActivated = false;
                    }, this.rainUpdateInterval);
                });
            }
        }).catch(err => {
            this.weatherEnabled = false;
            this.weatherError = err;
            this.rainEnabled = false;
            this.rainError = err;
        });
    }

    async init(type: string): Promise<void> {
        await super.init(type);

        if (type === "forecast rain") {
            this.forecastUpdateActivated = true;
            await this.fetchForecast();
            this.rainUpdateActivated = true;
            await this.fetchRain();
            this.emit<Weather>("forecast update", await this.getWeather());
        }
    }

    activate(type: string): void {
        super.activate(type);

        if (type === "forecast") {
            this.forecastUpdateActivated = true;
        } else if (type === "rain") {
            this.rainUpdateActivated = true;
        }
    }

    async checkServiceStatus(): Promise<boolean> {
        if (!await this.isServiceEnabled()) {
            this.weatherToday = null;
            this.weatherForecast = [];
            this.weatherEnabled = false;
            this.weatherError = '';
            this.rainSVG = '';
            this.rainForecast = [];
            this.rainTotal = 0;
            this.rainEnabled = false;
            this.rainError = '';
            this.updatedAt = new Date();

            return false;
        }

        return true;
    }

    async getWeather(): Promise<Weather> {
        return {
            serviceEnabled: await this.isServiceEnabled(),
            location: this.location,
            weather: {
                today: this.weatherToday,
                forecast: this.weatherForecast,
                enabled: this.weatherEnabled,
                error: this.weatherError,
            },
            rain: {
                svg: this.rainSVG,
                forecast: this.rainForecast,
                total: this.rainTotal,
                enabled: this.rainEnabled,
                error: this.rainError,
            },
            updatedAt: this.updatedAt.getTime(),
        };
    }

    async getForecast(force = false): Promise<Weather> {
        if (force) await this.fetchForecast();

        return await this.getWeather();
    }

    async getRain(force = false): Promise<Weather> {
        if (force) await this.fetchRain();

        return await this.getWeather();
    }

    async getLocation(): Promise<Location> {
        return fetch(process.env.WEATHER_LOCATION_URL)
            .then(req => req.json())
            .then(json => {
                this.log.info("WeatherService", "Location has been retrieved");
                this.location = {
                    lat: json.lat,
                    lon: json.lon,
                    city: json.city,
                    country: json.country,
                    countryCode: json.countryCode,
                    region: json.region,
                    zip: json.zip,
                    timezone: json.timezone
                };

                return this.location;
            }).catch(() => {
                this.weatherEnabled = false;
                this.rainEnabled = false;
                this.weatherError = "Location couldn't be fetched";
                this.rainError = "Location couldn't be fetched";
                this.log.error("WeatherService", "Location couldn't be fetched");

                throw new Error("Location couldn't be fetched");
            });
    }

    async fetchForecast(): Promise<void> {
        if (!(await this.checkServiceStatus())) return;

        if (this.location === null) {
            this.weatherEnabled = false;
            this.weatherError = "Location couldn't be fetched";
            return;
        }

        return this.getAPIKey("weather")
            .then(async (apiKey) => {
                const params = {
                    lat: this.location.lat.toString(),
                    lon: this.location.lon.toString(),
                    appid: apiKey,
                    exclude: "current,minutely,hourly,alerts",
                    units: "metric"
                };

                this.weatherURL.search = new URLSearchParams(params).toString();

                const req = await fetch(this.weatherURL.toString());
                const resp = await req.json();

                if (req.status === 200) {
                    if (resp !== null) {
                        const forecast = resp.daily; //resp.daily.slice(1, -1);
                        for (let i = 0; i < forecast.length; i++) {
                            const date = new Date(forecast[i].dt * 1000);
                            forecast[i].weather[0].icon = "https://openweathermap.org/img/wn/" + forecast[i].weather[0].icon + "@2x.png";
                            forecast[i].weather[0].description = forecast[i].weather[0].description.charAt(0).toUpperCase() + forecast[i].weather[0].description.slice(1);
                            forecast[i].dayText = days[date.getDay()];
                            forecast[i].dayAbbrevText = daysAbbrev[date.getDay()];
                            forecast[i].dateText = moment(date).format("DD/MM");
                            forecast[i].temp.min = Math.floor(forecast[i].temp.min);
                            forecast[i].temp.max = Math.ceil(forecast[i].temp.max);
                            forecast[i].temp.morn = Math.floor(forecast[i].temp.morn);
                            forecast[i].temp.night = Math.ceil(forecast[i].temp.night);
                            forecast[i].rain = Math.ceil(forecast[i].rain) || 0;
                            forecast[i].pop = Math.ceil(forecast[i].pop * 100);
                            forecast[i].wind = angleToDirection(forecast[i].wind_deg) + windToBeaufort(forecast[i].wind_speed);
                        }

                        this.weatherToday = forecast[0];
                        this.weatherForecast = forecast;
                        this.updatedAt = new Date();
                        this.weatherEnabled = true;
                        this.weatherError = '';
                    }

                } else {
                    this.weatherToday = null;
                    this.weatherForecast = [];
                    this.updatedAt = new Date();
                    this.weatherEnabled = false;
                    this.weatherError = resp.message;
                }

            }).catch(err => {
                this.weatherToday = null;
                this.weatherForecast = [];
                this.updatedAt = new Date();
                this.weatherEnabled = false;
                this.weatherError = 'API key not defined';

                this.log.info("WeatherService", `API key not defined ${err}`);
            });
    }

    async fetchRain(): Promise<void> {
        if (!(await this.checkServiceStatus())) return;

        if (this.location === null) {
            this.rainEnabled = false;
            this.rainError = "Location couldn't be fetched";
            return;
        }

        const params = {
            lat: this.location.lat.toString(),
            lon: this.location.lon.toString(),
        };

        this.rainURL.search = new URLSearchParams(params).toString();

        const req = await fetch(this.rainURL.toString());
        const resp = await req.text();

        if (req.status === 200) {
            const forecast: Rain[] = [];

            resp.split('\r\n').forEach((line) => {
                const parts = line.split("|");

                if (parts[0] === "" || parts[1] === "") {
                    return false;
                }

                forecast.push({
                    time: parts[1],
                    value: Number(parts[0]),
                    intensity: (10 ** ((Number(parts[0]) - 109) / 32))
                });
            });

            this.rainForecast = forecast;
            this.rainSVG = this.makeSVG(forecast);
            this.updatedAt = new Date();
            this.rainEnabled = true;
            this.rainError = '';

        } else {
            this.rainEnabled = true;
            this.rainError = resp;
        }

        return;
    }

    makeSVG(forecast: Rain[]): string {
        const data = forecast.map((element: Rain) => element.value / 2.55);
        // const data = forecast.map((element: Rain) => Math.round(Math.random()*50 + element.value / 2.55));
        this.rainTotal = data.reduce((sum: number, next: number) => sum + next, 0);

        const width = 1000;
        const height = 125;
        const outerHeight = height;
        const yLabelPosition = height - 10;

        const xSteps: number[] = [];

        data.forEach((element: number, index: number) => {
            xSteps.push(1.0 + ((width - 1) / (data.length - 1)) * index);
        });

        const points = data.map((element: number, index: number): string => {
            const size = ((100 - element) / 100) * height;
            return xSteps[index] + "," + size + " ";
        });

        const setPoints = 'M1,' + height + ' S ' + points + 'L' + width + ',' + height + ' Z';

        const labelIndices = [0, 5, 11, 17, 23];

        return `
        <svg 
            class="graph" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 ${width} ${outerHeight}" preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <clipPath id="cut-off-bottom"><rect x="0" y="0" width="${width}" height="${height}" /></clipPath>
            </defs>
            <g class="surfaces">
                <path class="first_set" d="${setPoints}" clip-path="url(#cut-off-bottom)"></path>
            </g>
            <g class="labels x-labels">
                <text x="27" y="${yLabelPosition}" >${forecast[labelIndices[0]].time}</text>
                <text x="${xSteps[labelIndices[1]]}"  y="${yLabelPosition}" >${forecast[labelIndices[1]].time}</text>
                <text x="${xSteps[labelIndices[2]]}" y="${yLabelPosition}" >${forecast[labelIndices[2]].time}</text>
                <text x="${xSteps[labelIndices[3]]}" y="${yLabelPosition}" >${forecast[labelIndices[3]].time}</text>
                <text x="${(width - 27)}" y="${yLabelPosition}" >${forecast[labelIndices[4]].time}</text>
            </g>
        </svg>`;
    }
}
