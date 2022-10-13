import { Container } from 'typedi';

import { LoggerService } from './LoggerService';
import { SocketService } from './SocketService';
import { SettingService } from './SettingService';
import { Setting } from '../models/Setting';

export class BaseService {
	log = Container.get(LoggerService);
	socketService = Container.get(SocketService);
	settingService = Container.get(SettingService);

	constructor(public serviceName: string) {
		this.socketService.registerListener(this.serviceName, this);
	}

	async init(type: string): Promise<void> {
		this.log.http('SocketService', `Received ${type} message for service '${this.serviceName}'`);
	}

	activate(type: string): void {
		this.log.http('SocketService', `Received ${type} message for service '${this.serviceName}'`);
	}

	emit<T>(event: string, data: T): void {
		this.log.http('SocketService', `Emitting ${event} from service '${this.serviceName}'`);
		this.socketService.emit(event, data);
	}

	async isServiceEnabled(): Promise<boolean> {
		const serviceEnabled = await this.settingService.findByTypeSpec("service", this.serviceName);
		if (serviceEnabled) return serviceEnabled.value === 'true';

		return true;
	}

	async getSetting(type: string, specification: string): Promise<Setting> {
		return await this.settingService.findByTypeSpec(type, specification);
	}

	async setSetting(setting: Setting): Promise<Setting> {
		if (await this.getSetting(setting.type, setting.specification)) {
			return await this.settingService.update(setting);
		}

		return await this.settingService.create(setting);
	}

	async getAPIKey(specification: string): Promise<string> {
		return (await this.getSetting("api_key", specification))?.value;
	}
}
