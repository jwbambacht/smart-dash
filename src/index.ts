import dotenv from "dotenv";
import "reflect-metadata";
import { Container } from "typedi";
import { useContainer } from "typeorm";
import { seedDB, setupTypeORM } from './loaders/typeORMLoader';
import { setupExpressApp } from "./loaders/expressLoader";
import { LoggerService } from "./services/LoggerService";
import { SocketService } from "./services/SocketService";
import { DevicesService } from "./services/DevicesService";
import { WeatherService } from "./services/WeatherService";
import { MapService } from "./services/MapService";
import { NSService } from "./services/NSService";
import { CalendarService } from "./services/CalendarService";
import { TaskService } from "./services/TaskService";
import { SpotifyService } from "./services/SpotifyService";

// Set up the typeorm and typedi integration
useContainer(Container);

// Initialise the dotenv environment
dotenv.config();

// Obtain logger from container
const logger = Container.get(LoggerService);

// Setup database connection and express app and initialize all services
setupTypeORM()
    .then(async () => await seedDB(logger))
    .then(() => setupExpressApp(logger))
    .then((io) => {
        Container.get(SocketService).setServer(io);
        Container.get(WeatherService);
        Container.get(MapService);
        Container.get(NSService);
        Container.get(DevicesService);
        Container.get(CalendarService);
        Container.get(TaskService);
        Container.get(SpotifyService);
    })
    .catch((e) => {
        logger.error("An error occurred while starting the application.");
        logger.error(e);
        process.exit(0);
    });
