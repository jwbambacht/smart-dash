import { Container } from "typedi";
import { Body, Get, JsonController, Param, Put } from "routing-controllers";
import fs from "fs";
import path from 'path';

import { LoggerService } from "../services/LoggerService";
import { SettingService } from '../services/SettingService';
import { Setting } from '../models/Setting';

@JsonController("/api/app")
export class AppController {
    log = Container.get(LoggerService);
    settingService = Container.get(SettingService);

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
