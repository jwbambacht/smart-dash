import { Get, JsonController, Param, Post } from 'routing-controllers';
import { Container } from 'typedi';
import { DevicesService } from '../services/DevicesService';
import { Device } from '../types/DevicesTypes';

@JsonController("/api/devices")
export class DevicesController {
	devicesService = Container.get(DevicesService);

	@Get("/")
	async getDevices(): Promise<object> {
		return await this.devicesService.getDevicesScenes();
	}

	@Get("/:id/toggle")
	async setToggleDevice(@Param("id") id: number): Promise<string> {
		const status: Device = await this.devicesService.getDeviceStatus(id);

		if (status.switchedOn) {
			await this.devicesService.turnDeviceOnOff(id, false);
		} else {
			await this.devicesService.turnDeviceOnOff(id, true);
		}

		return "OK";
	}

	@Get("/:id/on")
	async setDeviceOn(@Param("id") id: number): Promise<string> {
		await this.devicesService.turnDeviceOnOff(id, true);

		return "OK";
	}

	@Get("/:id/off")
	async setDevicesOff(@Param("id") id: number): Promise<string> {
		await this.devicesService.turnDeviceOnOff(id, false);

		return "OK";
	}

	@Get("/:id/dim/:level")
	async dimDevice(@Param("id") id: number, @Param("level") level: number): Promise<string> {
		await this.devicesService.dimDevice(id, level);

		return "OK";
	}

	@Get("/:id/color/:level")
	async colorDevice(@Param("id") id: number, @Param("level") level: number): Promise<string> {
		await this.devicesService.colorDevice(id, level);

		return "OK";
	}

	@Get("/:id/status")
	async deviceStatus(@Param("id") id: number): Promise<object> {
		return await this.devicesService.getDeviceStatus(id);
	}

	@Get("/scene/:id")
	async executeScene(@Param("id") id: number): Promise<string> {
		await this.devicesService.executeScene(id);

		return "OK";
	}

	@Get("/energy/historical/:year/:month")
	async getEnergyReadingsMonth(@Param("year") year: number, @Param("month") month: number): Promise<object> {
		return await this.devicesService.getMonthEnergyReadings(month, year);
	}

	@Post("/reinit")
	async getReInitDevices(): Promise<string> {
		await this.devicesService.setDevicesCredentials();

		return "OK";
	}
}
