import { Container, Service } from 'typedi';
import { URL, URLSearchParams } from 'url';
import dgram from "dgram";
import moment from 'moment';

import { BaseService } from './BaseService';
import { months, monthsAbbrev } from "./WeatherService";
import { EnergyService } from "./EnergyService";
import { SpotifyService } from "./SpotifyService";
import { Cryptographer } from "../util/Devices/Cryptographer";
import { Command } from "../util/Devices/Command";
import { Setting } from "../models/Setting";
import { Energy } from "../models/Energy";
import { Device, DeviceType, DeviceTypeName, Scene, DimColor, EnergyReading, DayReading, SceneEntity } from '../types/DevicesTypes';

const kakuDimmers = [
    DeviceType.DIMMER
];

const zigbeeDimmers = [
    DeviceType.ZIGBEE_DIMMER,
    DeviceType.ZIGBEE_RGB,
    DeviceType.ZIGBEE_TUNABLE
];

const DEVICE_SORTS = {
    kakuDimmers,
    zigbeeDimmers,
    dimmers: [
        ...kakuDimmers,
        ...zigbeeDimmers
    ],
    colorDevices: [
        DeviceType.ZIGBEE_RGB,
        DeviceType.ZIGBEE_TUNABLE
    ],
    kakuDevices: [
        DeviceType.SWITCH,
        DeviceType.DIMMER,
        DeviceType.LIGHT
    ],
    zigbeeDevices: [
        DeviceType.ZIGBEE_SWITCH,
        DeviceType.ZIGBEE_DIMMER,
        DeviceType.ZIGBEE_RGB,
        DeviceType.ZIGBEE_TUNABLE,
        DeviceType.ZIGBEE_LIGHT
    ],
    switches: [
        DeviceType.SWITCH,
        DeviceType.LIGHT,
        DeviceType.ZIGBEE_SWITCH
    ],
};

// Define the device functions from KAKU
const DEVICE_FUNCTIONS = {
    KAKU_SWITCH_FUNCTION: 0, // switch kaku on or off
    KAKU_DIMMER_FUNCTION: 1, // select kaku dim level (0-15)
    ZIGBEE_SWITCH_FUNCTION: 3, // switch zigbee on or off
    ZIGBEE_DIMMER_FUNCTION: 4, // select zigbee dim level (0-255)
    ZIGBEE_COLOR_FUNCTION: 9, // select zigbee color temperature (1-599)
    KAKU_DIMMABLE_MIN: 0, // kaku dim min
    KAKU_DIMMABLE_MAX: 15, // kaku dim max
    ZIGBEE_DIMMABLE_MIN: 0, // zigbee dim min
    ZIGBEE_DIMMABLE_MAX: 255, // zigbee dim max
    ZIGBEE_COLOR_MIN: 1, // zigbee color min
    ZIGBEE_COLOR_MAX: 599, // zigbee color max
};

@Service()
export class DevicesService extends BaseService {
    energyService = Container.get(EnergyService);
    apiLoginURL = new URL(process.env.KAKU_ACCOUNT_URL);
    apiGatewayURL = new URL(process.env.KAKU_GATEWAY_URL);
    apiEntityURL = new URL(process.env.KAKU_ENTITY_URL);
    apiEnergyReadings = new URL(process.env.KAKU_P1_URL);
    enabled = false;
    error = '';
    devices: Device[] = [];
    scenes: Scene[] = [];
    energyModuleID: number;
    liveEnergyReadings: EnergyReading;
    blacklistIDs: Setting[] = []
    updatedAt: Date = new Date();
    devicesUpdateInterval = 10 * 60 * 1000;
    energyReadingsUpdateInterval = 60 * 60 * 1000;
    energyLiveUpdateInterval = 10 * 1000;
    devicesUpdateActivated = false;
    energyLiveUpdateActivated = false;

    config = {
        email: "",
        password: "",
        macAddress: "",
        homeID: "",
        aesKey: "",
        localAddress: "",
        localBackupAddress: ""
    }

    constructor() {
        super("DevicesService");

        this.setDevicesCredentials();
    }

    async init(type: string): Promise<void> {
        await super.init(type);

        if (type === "energy live") {
            this.energyLiveUpdateActivated = true;
            if (!await this.isServiceEnabled()) return;

            this.emit<object>("energy live update", await this.getLiveEnergyReadings(true));
        } else if (type === "devices") {
            this.devicesUpdateActivated = true;
            if (!await this.isServiceEnabled()) return;

            this.emit<object>("devices update", await this.getDevicesScenes(true));
        }
    }

    activate(type: string): void {
        super.activate(type);

        if (type === "energy live") {
            this.energyLiveUpdateActivated = true;
        } else if (type === "devices") {
            this.devicesUpdateActivated = true;
        }
    }

    async setDevicesCredentials(): Promise<void> {
        if (!await this.isServiceEnabled()) {
            this.enabled = false;
            this.error = '';
            return;
        }

        const loginEmail = await this.getSetting("devices", "kaku_email");
        if (loginEmail) {
            this.config.email = loginEmail.value;
        } else {
            this.enabled = false;
            this.error = 'Login email not found';
            return;
        }

        const loginPassword = await this.getSetting("devices", "kaku_password");
        if (loginPassword) {
            this.config.password = loginPassword.value;
        } else {
            this.enabled = false;
            this.error = 'Login password not found';
            return;
        }

        this.login().then(async (res) => {
            if (!res) return;

            this.enabled = true;
            await this.startService();
        });
    }

    async startService(): Promise<void> {
        const localHubAddress = await this.discoverHubLocal(10_000);

        if (localHubAddress) {
            this.log.info("DevicesService", `Found hub: ${localHubAddress}`);
            this.enabled = true;
            this.error = '';

            this.fetchDevicesScenes().then(() => {
                this.log.info("DevicesService", "Devices successfully fetched");

                setInterval(async () => {
                    if (this.devicesUpdateActivated) {
                        this.emit<object>("devices update", await this.getDevicesScenes(true));
                    }
                    this.devicesUpdateActivated = false;
                }, this.devicesUpdateInterval);

                setInterval(async () => {
                    if (this.energyLiveUpdateActivated === true) {
                        this.emit<object>("energy live update", await this.getLiveEnergyReadings(true));
                    }

                    this.energyLiveUpdateActivated = false;
                }, this.energyLiveUpdateInterval);

                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                this.fetchEnergyReadings("day", startDate.getTime(), new Date().getTime());

                setInterval(async () => {
                    this.fetchEnergyReadings("day", startDate.getTime(), new Date().getTime());
                }, this.energyReadingsUpdateInterval);
            }).catch(() => {
                this.log.error("DevicesService", "Devices couldn't be fetched");
            });

        } else {
            this.log.warn("DevicesService", "Local hub not found");
            this.enabled = false;
            this.error = 'Local hub not found';
        }
    }

    async login(): Promise<boolean> {
        const params = {
            "action": "login",
            "email": this.config.email,
            "password_hash": this.config.password,
            "device_unique_id": "android",
        };

        this.apiLoginURL.search = new URLSearchParams(params).toString();

        const req = await fetch(this.apiLoginURL.toString());
        const resp = await req.json();

        if (req.ok && req.status === 200) {
            if (resp.homes.length > 0) {
                this.config.homeID = resp.homes[0].home_id;
                this.config.aesKey = resp.homes[0].aes_key;
                this.config.macAddress = resp.homes[0].mac;

                this.log.info("DevicesService", "Successfully logged in");
                this.enabled = true;
                this.error = '';
                this.updatedAt = new Date();

                return true;
            }
        } else {
            this.log.error("DevicesService", resp[0]);
            this.enabled = false;
            this.error = resp[0];
            this.updatedAt = new Date();
        }

        return false;
    }

    discoverHubLocal(searchTimeout = 10_000): Promise<string> {
        this.log.info("DevicesService", "Discovering hub locally");

        return new Promise<string>((resolve, reject) => {
            const message = Buffer.from(
                '010003ffffffffffffca000000010400044795000401040004000400040000000000000000020000003000',
                'hex',
            );
            const client = dgram.createSocket('udp4');

            const timeout = setTimeout(() => {
                client.close();

                this.getSetting("devices", "kaku_backup_address")
                    .then(setting => {
                        this.config.localBackupAddress = setting.value;

                    }).then(() => {
                        if (this.config.localBackupAddress) {
                            this.log.warn("DevicesService", "Searching hub timed out! Using backup address for communication");

                            if (this.config.localBackupAddress !== null) {
                                this.config.localAddress = this.config.localBackupAddress;
                                resolve(this.config.localBackupAddress);
                            }
                        } else {
                            this.log.warn("DevicesService", "Searching for hub timed out and no backup IP-address specified!");
                            reject('Searching hub timed out and no backup IP-address specified!');
                        }
                    })
                    .catch((err) => {
                        this.log.warn("DevicesService", "No backup address found in database " + err);
                        this.enabled = false;
                        this.error = 'No backup address found in database';
                    });
            }, searchTimeout);

            client.on('message', (msg, peer) => {
                client.close();
                clearTimeout(timeout);
                this.config.localAddress = peer.address;
                resolve(peer.address);
            });

            client.bind(() => {
                client.setBroadcast(true);
            });

            client.send(message, 2012, '255.255.255.255');

            this.log.info("DevicesService", "Broadcast to hub send");
        });
    }

    getDevices(): Device[] {
        return this.devices;
    }

    async getStatus(): Promise<object> {
        return {
            serviceEnabled: await this.isServiceEnabled(),
            enabled: this.enabled,
            error: this.error
        };
    }

    async getDevicesScenes(force = false): Promise<object> {
        if (force) await this.fetchDevicesScenes();

        await this.settingService.findAllByTypeSpec("devices", "blacklist")
            .then((blacklist) => {
                this.blacklistIDs = blacklist.map((setting) => setting);
            });

        return {
            serviceEnabled: await this.isServiceEnabled(),
            devices: this.devices.map((device) => {
                device.blacklisted = this.blacklistIDs.find((setting) => setting.value === String(device.deviceID)) || null;
                return device;
            }),
            scenes: this.scenes.map((scene) => {
                scene.blacklisted = this.blacklistIDs.find((setting) => setting.value === String(scene.id)) || null;
                return scene;
            }),
            updatedAt: this.updatedAt.getTime(),
            enabled: this.enabled,
            error: this.error
        };
    }

    async fetchDevicesScenes(homeID?: string): Promise<boolean> {
        if (!await this.isServiceEnabled() || !this.enabled) return;

        await this.settingService.findAllByTypeSpec("devices", "blacklist")
            .then((blacklist) => {
                this.blacklistIDs = blacklist.map((setting) => setting);
            });

        this.log.info("DevicesService", "Fetching devices from API");

        if (!this.config.aesKey || !this.config.macAddress) {
            this.enabled = false;
            this.error = 'Mac address or AES key undefined';
        }

        const params = {
            "action": "sync",
            "email": this.config.email,
            "password_hash": this.config.password,
            "mac": this.config.macAddress,
            "home_id": homeID
        };

        this.apiGatewayURL.search = new URLSearchParams(params).toString();
        const req = await fetch(this.apiGatewayURL.toString());

        if (req.ok && req.status === 200) {
            const resp: object[] = await req.json();

            resp.map((device: { data: string; decryptedData: { module: { id: number; device: number }}}) => {
                const decryptedData = Cryptographer.decryptBase64(device.data, this.config.aesKey);
                device.decryptedData = JSON.parse(decryptedData);

                if ('module' in device.decryptedData && device.decryptedData.module.device === DeviceType.ENERGY_MODULE) {
                    this.energyModuleID = device.decryptedData.module.id;
                }
            });

            this.devices = resp
                .filter((device: { decryptedData: { module?: { info: number[] }}}) => {
                    if ('module' in device.decryptedData && 'info' in device.decryptedData.module) {
                        return device.decryptedData.module.info.reduce((a: number, b: number) => a + b, 0) > 0;
                    }

                    return false;
                })
                .map((device: { id: string; status: string; decryptedStatus: { module: { functions: number[] }}; name: string; device: DeviceType; decryptedData: { module: { name: string; device: DeviceType }}}): Device => {
                    const decryptedStatus = Cryptographer.decryptBase64(device.status, this.config.aesKey);
                    device.decryptedStatus = JSON.parse(decryptedStatus);
                    device.name = device.decryptedData.module.name;
                    device.device = device.decryptedData.module.device;

                    let dim = null;
                    if (kakuDimmers.includes(device.decryptedData.module.device)) {
                        dim = {
                            level: device.decryptedStatus.module.functions[DEVICE_FUNCTIONS.KAKU_DIMMER_FUNCTION],
                            min: DEVICE_FUNCTIONS.KAKU_DIMMABLE_MIN,
                            max: DEVICE_FUNCTIONS.KAKU_DIMMABLE_MAX,
                        };
                    } else if (zigbeeDimmers.includes(device.decryptedData.module.device)) {
                        dim = {
                            level: device.decryptedStatus.module.functions[DEVICE_FUNCTIONS.ZIGBEE_DIMMER_FUNCTION],
                            min: DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MIN,
                            max: DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MAX,
                        };
                    }

                    let color = null;
                    if (DEVICE_SORTS.colorDevices.includes(device.decryptedData.module.device)) {
                        color = {
                            level: device.decryptedStatus.module.functions[DEVICE_FUNCTIONS.ZIGBEE_COLOR_FUNCTION],
                            min: DEVICE_FUNCTIONS.ZIGBEE_COLOR_MIN,
                            max: DEVICE_FUNCTIONS.ZIGBEE_COLOR_MAX,
                        };
                    }

                    return {
                        deviceID: Number(device.id),
                        name: device.decryptedData.module.name,
                        deviceType: device.decryptedData.module.device,
                        deviceTypeName: this.getDeviceTypeName(device.decryptedData.module.device),
                        functions: device.decryptedStatus.module.functions,
                        switchedOn: device.decryptedStatus.module.functions[0] === 1,
                        dim: dim,
                        color: color,
                        blacklisted: this.blacklistIDs.find((setting) => setting.value === device.id) || null
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            this.scenes = resp
                .filter((device: { decryptedData: { scene?: { smd_info?: { disabled: boolean; hidden: boolean }}}}) => {
                    if ('scene' in device.decryptedData && 'smd_info' in device.decryptedData.scene) {
                        return !device.decryptedData.scene.smd_info.disabled && !device.decryptedData.scene.smd_info.hidden;
                    }

                    return false;
                })
                .map((obj: { decryptedData: { scene: { id: number; name: string; entities: SceneEntity[] }} }): Scene => {
                    return {
                        id: obj.decryptedData.scene.id,
                        name: obj.decryptedData.scene.name,
                        entities: obj.decryptedData.scene.entities,
                        blacklisted: this.blacklistIDs.find((setting) => setting.value === String(obj.decryptedData.scene.id)) || null
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            this.updatedAt = new Date();

            return;
        }

        this.enabled = false;
        this.error = "Devices/Scenes couldn't be fetched";

        return;
    }

    getDeviceTypeName(deviceType: DeviceType): DeviceTypeName {
        let deviceTypeName: DeviceTypeName;

        if (DEVICE_SORTS.switches.includes(deviceType)) {
            deviceTypeName = DeviceTypeName.SWITCH;
        } else if (DEVICE_SORTS.colorDevices.includes(deviceType)) {
            deviceTypeName = DeviceTypeName.COLOR;
        } else if (DEVICE_SORTS.dimmers.includes(deviceType)) {
            deviceTypeName = DeviceTypeName.DIMMER;
        } else if (deviceType === DeviceType.ENERGY_MODULE) {
            deviceTypeName = DeviceTypeName.ENERGY_MODULE;
        } else {
            deviceTypeName = DeviceTypeName.OTHER;
        }

        return deviceTypeName;
    }

    async getDeviceStatus(deviceID: number): Promise<Device | undefined> {
        this.log.info("DevicesService", "Fetching status of device");

        if (!this.config.aesKey || !this.config.macAddress) {
            throw new Error("Mac address or AES key undefined");
        }

        const params = {
            "action": "get-multiple",
            "email": this.config.email,
            "password_hash": this.config.password,
            "mac": this.config.macAddress,
            "entity_id": `[${deviceID}]`
        };

        this.apiEntityURL.search = new URLSearchParams(params).toString();

        const req = await fetch(this.apiEntityURL.toString());

        if (req.ok && req.status === 200) {

            const resp = await req.json();

            if (resp.length === 1) {
                const device = resp[0];
                device.data = JSON.parse(Cryptographer.decryptBase64(device.data, this.config.aesKey));
                device.status = JSON.parse(Cryptographer.decryptBase64(device.status, this.config.aesKey));

                let dim: DimColor = null;
                let color: DimColor = null;

                if (kakuDimmers.includes(device.data.module.device)) {
                    dim = {
                        level: device.status.module.functions[DEVICE_FUNCTIONS.KAKU_DIMMER_FUNCTION],
                        min: DEVICE_FUNCTIONS.KAKU_DIMMABLE_MIN,
                        max: DEVICE_FUNCTIONS.KAKU_DIMMABLE_MAX,
                    };
                } else if (zigbeeDimmers.includes(device.data.module.device)) {
                    dim = {
                        level: device.status.module.functions[DEVICE_FUNCTIONS.ZIGBEE_DIMMER_FUNCTION],
                        min: DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MIN,
                        max: DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MAX,
                    };
                }

                if (DEVICE_SORTS.colorDevices.includes(device.data.module.device)) {
                    color = {
                        level: device.status.module.functions[DEVICE_FUNCTIONS.ZIGBEE_COLOR_FUNCTION],
                        min: DEVICE_FUNCTIONS.ZIGBEE_COLOR_MIN,
                        max: DEVICE_FUNCTIONS.ZIGBEE_COLOR_MAX,
                    };
                }


                return {
                    deviceID: Number(device.id),
                    name: device.data.module.name,
                    deviceType: device.data.module.device,
                    deviceTypeName: this.getDeviceTypeName(device.data.module.device),
                    functions: device.status.module.functions || null,
                    switchedOn: device.status.module.functions[0] === 1,
                    dim: dim,
                    color: color,
                    blacklisted: this.blacklistIDs.find((setting) => setting.value === String(device.id)) || null
                };
            }

            return;
        }
    }

    getDevice(deviceID: number): Device {
        return this.devices.find((device) => device.deviceID === deviceID);
    }

    getScene(sceneID: number): Scene {
        return this.scenes.find((scene) => scene.id === sceneID);
    }

    createCommand(deviceID: number, deviceFunction: number, value: number): Command {
        return new Command(this.config.macAddress, this.config.aesKey, deviceID, deviceFunction, value);
    }

    async turnDeviceOnOff(deviceID: number, on: boolean, onFunction = DEVICE_FUNCTIONS.KAKU_SWITCH_FUNCTION): Promise<void> {
        const device = this.getDevice(deviceID);

        if (device !== null) {
            const deviceType = device.deviceType;

            if (DEVICE_SORTS.kakuDevices.includes(deviceType)) {
                onFunction = DEVICE_FUNCTIONS.KAKU_SWITCH_FUNCTION;
            } else if (DEVICE_SORTS.zigbeeDevices.includes(deviceType)) {
                onFunction = DEVICE_FUNCTIONS.ZIGBEE_SWITCH_FUNCTION;
            } else {
                throw new Error("Device type is unknown");
            }

            return this.sendCommand(deviceID, onFunction, on ? 1 : 0);
        }
    }

    async dimDevice(deviceID: number, dimLevel: number, dimFunction = DEVICE_FUNCTIONS.KAKU_DIMMER_FUNCTION): Promise<void> {
        const device: Device = this.getDevice(deviceID);

        if (device !== null) {
            const deviceType = device.deviceType;

            if (kakuDimmers.includes(deviceType)) {
                dimFunction = DEVICE_FUNCTIONS.KAKU_DIMMER_FUNCTION;
                dimLevel = dimLevel < DEVICE_FUNCTIONS.KAKU_DIMMABLE_MIN ? DEVICE_FUNCTIONS.KAKU_DIMMABLE_MIN : dimLevel;
                dimLevel = dimLevel > DEVICE_FUNCTIONS.KAKU_DIMMABLE_MAX ? DEVICE_FUNCTIONS.KAKU_DIMMABLE_MAX : dimLevel;

            } else if (zigbeeDimmers.includes(deviceType)) {
                dimFunction = DEVICE_FUNCTIONS.ZIGBEE_DIMMER_FUNCTION;
                dimLevel = dimLevel < DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MIN ? DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MIN : dimLevel;
                dimLevel = dimLevel > DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MAX ? DEVICE_FUNCTIONS.ZIGBEE_DIMMABLE_MAX : dimLevel;

            } else {
                throw new Error("Device is not dimmable or unknown");
            }

            this.devices.find((device) => device.deviceID === deviceID).dim.level = dimLevel;

            return this.sendCommand(deviceID, dimFunction, dimLevel);
        }
    }

    colorDevice(deviceID: number, colorLevel: number, colorFunction = DEVICE_FUNCTIONS.ZIGBEE_COLOR_FUNCTION): Promise<void> {
        const device = this.getDevice(deviceID);

        if (device != null) {
            const deviceType = device.deviceType;

            if (DEVICE_SORTS.colorDevices.includes(deviceType)) {
                colorLevel = colorLevel < DEVICE_FUNCTIONS.ZIGBEE_COLOR_MIN ? DEVICE_FUNCTIONS.ZIGBEE_COLOR_MAX : colorLevel;
                colorLevel = colorLevel > DEVICE_FUNCTIONS.ZIGBEE_COLOR_MAX ? DEVICE_FUNCTIONS.ZIGBEE_COLOR_MAX : colorLevel;
            } else {
                throw new Error("Device can not change color");
            }

            this.devices.find((device) => device.deviceID === deviceID).color.level = colorLevel;

            return this.sendCommand(deviceID, colorFunction, colorLevel);
        }
    }

    async executeScene(sceneID: number): Promise<void> {
        const scene = Object.create(this.getScene(sceneID));
        const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

        if (scene !== null) {
            for (const entity of scene.entities) {
                this.log.info("DevicesService", `Requesting command in entity of scene: ${entity.id}, ${entity.function}, ${entity.value}`);
                await this.sendCommand(entity.id, entity.function, entity.value);
                await sleep(40);
            }

            this.log.info("DevicesService", "Scene execution finished");

            return;
        }

        this.log.info("DevicesService", "Scene not found");
    }

    async sendCommand(deviceID: number, onFunction: number, value: number): Promise<void> {
        if (!this.config.localAddress) {
            throw new Error('Local address is undefined');
        }

        return await this.createCommand(deviceID, onFunction, value)
            .sendTo(this.config.localAddress, 2012);
    }

    async getLiveEnergyReadings(force = false): Promise<object> {
        if (force) await this.fetchLiveEnergyReadings();

        return {
            serviceEnabled: await this.isServiceEnabled(),
            readings: this.liveEnergyReadings || [],
            enabled: this.enabled,
            error: this.error
        };
    }

    async fetchLiveEnergyReadings(): Promise<void> {
        if (!await this.isServiceEnabled() || !this.enabled) return;

        if (!this.energyModuleID) {
            this.enabled = false;
            this.error = 'Energy module is not defined';
            return;
        }

        if (!this.config.aesKey || !this.config.macAddress) {
            this.enabled = false;
            this.error = 'Mac address or AES key undefined';
            return;
        }

        this.log.info("DevicesService", "Fetching live status of P1 meter");
        const params = {
            "action": "check",
            "email": this.config.email,
            "password_hash": this.config.password,
            "mac": this.config.macAddress,
            "entity_id": this.energyModuleID.toString()
        };

        this.apiEntityURL.search = new URLSearchParams(params).toString();
        const req = await fetch(this.apiEntityURL.toString());

        if (req.ok && req.status === 200) {

            const resp = await req.json();

            if (resp.length !== 4) {
                throw new Error("Current meter readings not available in the cloud");
            }

            const decryptedReadings = JSON.parse(Cryptographer.decryptBase64(resp[3], this.config.aesKey));

            if (!('module' in decryptedReadings) && !('functions' in decryptedReadings.module)) {
                throw new Error("Malformed current meter readings");
            }

            this.liveEnergyReadings = {
                powerLow: decryptedReadings.module.functions[0],
                powerHigh: decryptedReadings.module.functions[1],
                solarLow: decryptedReadings.module.functions[2],
                solarHigh: decryptedReadings.module.functions[3],
                power: decryptedReadings.module.functions[4],
                solar: decryptedReadings.module.functions[5],
                gas: decryptedReadings.module.functions[6],
                water: decryptedReadings.module.functions[7]
            };

        } else {
            this.enabled = false;
            this.error = `Error requesting P1 meter readings: ${req.statusText}`;
        }

        return;
    }

    async fetchEnergyReadings(precision: string, start: number, end: number): Promise<void> {
        if (!await this.isServiceEnabled() || !this.enabled) return;

        this.log.info("DevicesService", "Fetching P1 history energy readings from API");

        if (!this.energyModuleID) {
            this.enabled = false;
            this.error = 'Energy module undefined';
            return;
        }

        if (!this.config.macAddress) {
            this.enabled = false;
            this.error = 'Mac address undefined';
            return;
        }

        const startDateTimePattern = "YYYY-MM-DD 00:00:00";
        const endDateTimePattern = "YYYY-MM-DD 00:00:00";
        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1);
        const startDateString = moment(startDate).format(startDateTimePattern);
        const endDateString = moment(endDate).format(endDateTimePattern);

        const params = {
            "action": "aggregated_reports",
            "email": this.config.email,
            "password_hash": this.config.password,
            "mac": this.config.macAddress,
            "start_date": startDateString,
            "end_date": endDateString,
            "precision": precision,
            "differential": "false",
            "interpolate": "true"
        };

        this.apiEnergyReadings.search = new URLSearchParams(params).toString();
        const req = await fetch(this.apiEnergyReadings.toString());

        if (req.ok && req.status === 200) {
            const energyReadings: number[][] = await req.json();

            for (const reading of energyReadings) {
                const index: number = energyReadings.indexOf(reading);
                if (index === 0 || index === energyReadings.length - 1) continue;

                if (reading.some(r => r === null)) {
                    startDate.setDate(startDate.getDate() + 1);
                    continue;
                }

                const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0);

                const energyReadingObject = await this.energyService.findByDate(date.getTime());

                if (energyReadingObject === undefined) {
                    const energy = new Energy();
                    energy.date = date.getTime();
                    energy.powerHigh = reading[0];
                    energy.powerLow = reading[1];
                    energy.solarHigh = reading[2];
                    energy.solarLow = reading[3];
                    energy.gas = reading[4];
                    energy.water = reading[5];

                    if (await this.energyService.create(energy) === undefined) {
                        throw new Error("Insert of energy row failed");
                    }
                } else {
                    energyReadingObject.powerHigh = reading[0];
                    energyReadingObject.powerLow = reading[1];
                    energyReadingObject.solarHigh = reading[2];
                    energyReadingObject.solarLow = reading[3];
                    energyReadingObject.gas = reading[4];
                    energyReadingObject.water = reading[5];

                    if (await this.energyService.update(energyReadingObject) === null) {
                        throw new Error("Update of energy row failed");
                    }
                }

                startDate.setDate(startDate.getDate() + 1);
            }
        } else {
            throw Error(`Error requesting energy readings ${req.statusText}`);
        }
    }

    async getMonthEnergyReadings(
        month: number = new Date().getMonth(),
        year: number = new Date().getFullYear()
    ): Promise<object> {
        const firstDayOfMonth = new Date(year, month, 1, 0, 0);
        const lastDayOfMonth = new Date(year, month, 1, 0, 0);
        lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
        lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);

        const energyReadings: Energy[] = await this.energyService.findAll();

        const readings = energyReadings.map((reading: Energy, index: number): DayReading => {
            if (index === 0) return null;

            const previousReading = energyReadings[index - 1];

            return {
                date: reading.date,
                day: new Date(reading.date).getDate(),
                readings: {
                    powerHigh: reading.powerHigh,
                    powerHighDiff: (reading.powerHigh - previousReading.powerHigh) / 1000,
                    powerLow: reading.powerLow,
                    powerLowDiff: (reading.powerLow - previousReading.powerLow) / 1000,
                    solarHigh: reading.solarHigh,
                    solarHighDiff: (reading.solarHigh - previousReading.solarHigh) / 1000,
                    solarLow: reading.solarLow,
                    solarLowDiff: (reading.solarLow - previousReading.solarLow) / 1000,
                    gas: reading.gas,
                    gasDiff: (reading.gas - previousReading.gas) / 1000,
                    water: reading.water,
                    waterDiff: (reading.water - previousReading.water) / 1000
                }
            };
        }).filter(obj => obj !== null);

        const readingsThisMonth = readings.filter(reading => reading.date >= firstDayOfMonth.getTime() && reading.date <= lastDayOfMonth.getTime());

        let hasPrevious = false;
        let hasNext = false;
        if (readingsThisMonth.length > 0) {
            const indexFirstDayOfMonth = readings.findIndex(reading => reading.date === readingsThisMonth[0].date);
            if (indexFirstDayOfMonth > 0) hasPrevious = true;
            const indexLastDayOfMonth = readings.findIndex(reading => reading.date === readingsThisMonth[readingsThisMonth.length - 1].date);
            if (indexLastDayOfMonth < readings.length -1) hasNext = true;
        } else {
            hasPrevious = true;
        }

        if (readingsThisMonth.length < lastDayOfMonth.getDate()) {

            const values = {
                powerHigh: 0,
                powerHighDiff: 0,
                powerLow: 0,
                powerLowDiff: 0,
                solarHigh: 0,
                solarHighDiff: 0,
                solarLow: 0,
                solarLowDiff: 0,
                gas: 0,
                gasDiff: 0,
                water: 0,
                waterDiff: 0
            };

            if (readingsThisMonth.length === 0) {
                for (let i = 1; i <= lastDayOfMonth.getDate() ; i++) {
                    const date = new Date(firstDayOfMonth.getTime() + 60 * 60 * 24 * 1000 * (i - 1));
                    readingsThisMonth.push({
                        date: date.getTime(),
                        day: date.getDate(),
                        readings: values
                    });
                }
            } else {

                // Add days from 1 till the first existing day in the month
                if (readingsThisMonth[0].day !== 1) {
                    for (let i = readingsThisMonth[0].day - 1; i >= 1; i--) {
                        const date = new Date(firstDayOfMonth.getTime() + 60 * 60 * 24 * 1000 * (i - 1));
                        readingsThisMonth.unshift({
                            date: date.getTime(),
                            day: date.getDate(),
                            readings: values
                        });
                    }
                }

                // Add days after the last existing day in the month till the last day of the month
                if (readingsThisMonth.length !== lastDayOfMonth.getDate()) {
                    for (let i = readingsThisMonth[readingsThisMonth.length - 1].day + 1; i <= lastDayOfMonth.getDate(); i++) {
                        const date = new Date(firstDayOfMonth.getTime() + 60 * 60 * 24 * 1000 * (i - 1));
                        readingsThisMonth.push({
                            date: date.getTime(),
                            day: date.getDate(),
                            readings: values
                        });
                    }
                }
            }
        }

        return {
            serviceEnabled: await this.isServiceEnabled(),
            year: year,
            month: month,
            monthText: months[month],
            monthAbbrevText: monthsAbbrev[month],
            hasPrevious: hasPrevious,
            hasNext: hasNext,
            totals: {
                powerHigh: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.powerHighDiff;
                }, 0),
                powerLow: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.powerLowDiff;
                }, 0),
                solarHigh: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.solarHighDiff;
                }, 0),
                solarLow: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.solarLowDiff;
                }, 0),
                gas: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.gasDiff;
                }, 0),
                water: readingsThisMonth.reduce((prev, current) => {
                    return prev + current.readings.waterDiff;
                }, 0)
            },
            readings: readingsThisMonth,
            hasReadings: {
                powerHigh: readingsThisMonth.filter(v => v.readings.powerHigh === 0).length !== readingsThisMonth.length,
                powerHighDiff: readingsThisMonth.filter(v => v.readings.powerHighDiff === 0).length !== readingsThisMonth.length,
                powerLow: readingsThisMonth.filter(v => v.readings.powerLow === 0).length !== readingsThisMonth.length,
                powerLowDiff: readingsThisMonth.filter(v => v.readings.powerLowDiff === 0).length !== readingsThisMonth.length,
                solarHigh: readingsThisMonth.filter(v => v.readings.solarHigh === 0).length !== readingsThisMonth.length,
                solarHighDiff: readingsThisMonth.filter(v => v.readings.solarHighDiff === 0).length !== readingsThisMonth.length,
                solarLow: readingsThisMonth.filter(v => v.readings.solarLow === 0).length !== readingsThisMonth.length,
                solarLowDiff: readingsThisMonth.filter(v => v.readings.solarLowDiff === 0).length !== readingsThisMonth.length,
                gas: readingsThisMonth.filter(v => v.readings.gas === 0).length !== readingsThisMonth.length,
                gasDiff: readingsThisMonth.filter(v => v.readings.gasDiff === 0).length !== readingsThisMonth.length,
                water: readingsThisMonth.filter(v => v.readings.water === 0).length !== readingsThisMonth.length,
                waterDiff: readingsThisMonth.filter(v => v.readings.waterDiff === 0).length !== readingsThisMonth.length,
            },
            enabled: this.enabled,
            error: this.error
        };
    }

    // Get the device that is marked as the Spotify speaker (amplifier)
    async getDeviceForSpotify(): Promise<Device | undefined> {
        if (!await this.isServiceEnabled() || !this.enabled) return undefined;

        const setting = await this.getSetting("spotify", "spotify_speaker_id");

        if (setting) return this.getDevice(Number(setting.value));

        return undefined;
    }

    // Set the device as the Spotify speaker (amplifier)
    async setDeviceForSpotify(deviceID: number): Promise<Device | undefined> {
        if (!await this.isServiceEnabled() || !this.enabled) return undefined;

        const setting = await this.getSetting("spotify", "spotify_speaker_id");

        if (setting) {
            setting.specification = "spotify_speaker_id";
            setting.value = deviceID.toString();

            await this.setSetting(setting);
        } else {
            const newSetting = new Setting();
            newSetting.type = "spotify";
            newSetting.description = "Spotify Amplifier Device ID";
            newSetting.specification = "spotify_speaker_id";
            newSetting.value = deviceID.toString();

            await this.setSetting(newSetting);
        }

        this.emit<object>("spotify update", await Container.get(SpotifyService).getState());

        return this.getDeviceForSpotify();
    }
}
