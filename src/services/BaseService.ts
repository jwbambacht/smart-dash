import { Container } from 'typedi';
import { LoggerService } from './LoggerService';
import { SocketService } from './SocketService';
import { SettingService } from './SettingService';

export class BaseService {
	log = Container.get(LoggerService);
	socketService = Container.get(SocketService);
	settingService = Container.get(SettingService);

	constructor(public serviceName: string) {
		this.socketService.registerListener(this.serviceName, this);
	}

	async init(type: string): Promise<void> {
		this.log.socket('SocketService', `Received ${type} message for service '${this.serviceName}'`);
	}

	activate(type: string): void {
		this.log.socket('SocketService', `Received ${type} message for service '${this.serviceName}'`);
	}

	emit<T>(event: string, data: T): void {
		this.log.socket('SocketService', `Emitting ${event} from service '${this.serviceName}'`);
		this.socketService.emit(event, data);
	}

	async isServiceEnabled(): Promise<boolean> {
		const serviceEnabled = await this.settingService.findByTypeSpec("service", this.serviceName);
		if (serviceEnabled) return serviceEnabled.value === 'true';

		return true;
	}
}
