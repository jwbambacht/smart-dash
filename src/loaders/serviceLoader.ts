import { Server } from 'socket.io';
import { Container } from 'typedi';

import { SocketService } from '../services/SocketService';
import { SpotifyService } from '../services/SpotifyService';
import { WeatherService } from '../services/WeatherService';
import { MapService } from '../services/MapService';
import { NSService } from '../services/NSService';
import { DevicesService } from '../services/DevicesService';
import { CalendarService } from '../services/CalendarService';
import { TaskService } from '../services/TaskService';
import { CryptoService } from '../services/CryptoService';

export function initializeServices(io: Server): void {
	Container.get(SocketService).setServer(io);
	Container.get(SpotifyService);
	Container.get(WeatherService);
	Container.get(MapService);
	Container.get(NSService);
	Container.get(DevicesService);
	Container.get(CalendarService);
	Container.get(TaskService);
	Container.get(CryptoService);

	return;
}
