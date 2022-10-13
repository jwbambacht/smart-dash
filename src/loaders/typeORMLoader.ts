import { getConnectionOptions, createConnection } from "typeorm";
import { Container } from 'typedi';

import { LoggerService } from '../services/LoggerService';
import { SettingService } from '../services/SettingService';
import { Setting } from '../models/Setting';

const defaultSettings = [
    {
        type: "api_key",
        description: "OpenWeatherMap API Key",
        specification: "weather",
        value: "please change key"
    },
    {
        type: "api_key",
        description: "GoogleMaps API Key",
        specification: "maps",
        value: "please change key"
    },
    {
        type: "api_key",
        description: "NS API Key",
        specification: "ns",
        value: "please change key"
    },
    {
        type: "devices",
        description: "KaKu Backup Address",
        specification: "kaku_backup_address",
        value: "please change address"
    },
    {
        type: "devices",
        description: "KaKu Email",
        specification: "kaku_email",
        value: "please change email"
    },
    {
        type: "devices",
        description: "KaKu Password",
        specification: "kaku_password",
        value: "please change password"
    },
    {
        type: "spotify",
        description: "Spotify API Client ID",
        specification: "spotify_client_id",
        value: "please change client id"
    },
    {
        type: "spotify",
        description: "Spotify API Client Secret",
        specification: "spotify_client_secret",
        value: "please change client secret"
    },
    {
        type: "spotify",
        description: "Spotify Speaker Name",
        specification: "spotify_device_name",
        value: "please change device name"
    },
];

/**
 * Seed data to the database
 */
export async function seedDB(logger?: LoggerService): Promise<void> {
    try {
        if (logger) logger.info("Seeding database...");
        const settingService = Container.get(SettingService);

        for (const dSetting of defaultSettings) {
            if (!await settingService.findByTypeSpec(dSetting.type, dSetting.specification)) {
                const setting = new Setting();
                setting.type = dSetting.type;
                setting.description = dSetting.description;
                setting.specification = dSetting.specification;
                setting.value = dSetting.value;
                await settingService.create(setting);
            }
        }
    } catch (err) {
        throw new Error(`Failed to seed database (${err})`);
    }
}

export async function setupTypeORM(): Promise<void> {
    const loadedConnectionOptions = await getConnectionOptions();

    const connectionOptions = Object.assign(loadedConnectionOptions, {
        type: process.env.TYPEORM_CONNECTION, // See createConnection options for valid types
        host: process.env.TYPEORM_HOST,
        port: process.env.TYPEORM_PORT,
        username: process.env.TYPEORM_USERNAME,
        password: process.env.TYPEORM_PASSWORD,
        database: process.env.TYPEORM_DATABASE,
        synchronize: process.env.TYPEORM_SYNCHRONIZE,
        logging: process.env.TYPEORM_LOGGING,
        entities: [__dirname + "/../models/*.js"],
    });

    if (!await createConnection(connectionOptions)) throw new Error('Failed to create database connection');
}
