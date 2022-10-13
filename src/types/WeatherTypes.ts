export type Location = {
    lat: number;
    lon: number;
    city: string;
}

export type WeatherDay = {
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moon_phase: number;
    temp: {
        day: number;
        min: number;
        max: number;
        night: number;
        eve: number;
        morn: number;
    };
    feels_like: {
        day: number;
        night: number;
        eve: number;
        morn: number;
    };
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    weather: {
        id: number;
        main: string;
        description: string;
        icon: string;
    };
    clouds: number;
    pop: number;
    uvi: number;
    rain: number;
    wind: string;
    dayText: string;
    dayAbbrevText: string;
    dateText: string;
}

export type Weather = {
    serviceEnabled: boolean;
    location: Location;
    weather?: {
        today: WeatherDay;
        forecast: WeatherDay[];
        enabled: boolean;
        error: string;
    };
    rain?: {
        svg: string;
        forecast: Rain[];
        total: number;
        enabled: boolean;
        error: string;
    };
    updatedAt: number;
}

export type Rain = {
    time: string;
    value: number;
    intensity: number;
}
