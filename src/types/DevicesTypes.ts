import { Setting } from "../models/Setting";

export enum DeviceTypeName {
    SWITCH = "switch",
    DIMMER = "dimmer",
    COLOR = "color",
    ENERGY_MODULE = "energy_module",
    OTHER = "other"
}

export enum DeviceType {
    SWITCH = 1,
    DIMMER = 2,
    LIGHT = 24,
    ZIGBEE_SWITCH = 33,
    ZIGBEE_DIMMER = 34,
    ZIGBEE_RGB = 35,
    ZIGBEE_TUNABLE = 36,
    ZIGBEE_LIGHT = 40,
    ENERGY_MODULE = 238
}

export type Device = {
    deviceID: number;
    name: string;
    deviceType: DeviceType;
    deviceTypeName: DeviceTypeName;
    functions: number[];
    switchedOn: boolean;
    dim: {
        level: number;
        min: number;
        max: number;
    } | null;
    color: {
        level: number;
        min: number;
        max: number;
    } | null;
    blacklisted: Setting;
};

export type SceneEntity = {
    id: number;
    function: number;
    value: number;
}

export type Scene = {
    id: number;
    name: string;
    entities: SceneEntity[];
    blacklisted: Setting;
}

export type DimColor = {
    level: number;
    min: number;
    max: number;
}

export type EnergyReading = {
    powerLow: number;
    powerHigh: number;
    solarLow: number;
    solarHigh: number;
    power: number;
    solar: number;
    gas: number;
    water: number;
}

export type DayReading = {
    date: number;
    day: number;
    readings: {
        powerHigh: number;
        powerHighDiff: number;
        powerLow: number;
        powerLowDiff: number;
        solarHigh: number;
        solarHighDiff: number;
        solarLow: number;
        solarLowDiff: number;
        gas: number;
        gasDiff: number;
        water: number;
        waterDiff: number;
    };
}
