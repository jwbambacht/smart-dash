import { Container } from "typedi";
import { BadRequestError, Body, Delete, JsonController, Param, Post, Put } from "routing-controllers";
import { IsNotEmpty, IsString } from "class-validator";

import { LoggerService } from "../services/LoggerService";
import { SettingService } from "../services/SettingService";
import { Setting } from "../models/Setting";

class AddSettingRequest {
    description: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    specification: string;

    @IsString()
    @IsNotEmpty()
    value: string;
}

class UpdateSettingRequest {
    @IsString()
    @IsNotEmpty()
    specification: string;

    @IsString()
    @IsNotEmpty()
    value: string;
}

@JsonController("/api/settings")
export class SettingsController {
    log = Container.get(LoggerService);

    @Post("/")
    async addSetting(@Body() body: AddSettingRequest): Promise<Setting> {

        const errors = [];

        if (body.type === "" || body.specification === "" || body.value === "") {
            errors.push("Not all fields are filled");
        }

        if (errors.length > 0) {
            throw new BadRequestError(JSON.stringify(errors));
        }

        const setting = new Setting();
        setting.description = body.description || "";
        setting.type = body.type;
        setting.specification = body.specification;
        setting.value = body.value;

        const newSetting = await Container.get(SettingService).create(setting);
        if (newSetting !== undefined) return newSetting;

        return undefined;
    }

    @Put("/:id")
    async updateSetting(@Body() body: UpdateSettingRequest, @Param("id") id: string): Promise<Setting> {
        const setting = await Container.get(SettingService).findByID(id);

        if (setting === null) {
            throw new BadRequestError("Setting not found");
        }

        setting.specification = body.specification;
        setting.value = body.value;

        return await Container.get(SettingService).update(setting);
    }

    @Delete("/:id")
    async deleteSetting(@Param("id") id: string): Promise<string> {
        await Container.get(SettingService).delete(id);
        return "OK";
    }
}
