import dotenv from "dotenv";
import "reflect-metadata";
import { Container } from "typedi";
import { useContainer } from "typeorm";

import { seedDB, setupTypeORM } from './loaders/typeORMLoader';
import { setupExpressApp } from "./loaders/expressLoader";
import { initializeServices } from './loaders/serviceLoader';
import { LoggerService } from "./services/LoggerService";

// Set up the typeorm and typedi integration
useContainer(Container);

// Initialise the dotenv environment
dotenv.config();

// Obtain logger from container
const logger = Container.get(LoggerService);

// Setup database connection, express app and initialize all services
setupTypeORM()
    .then(async () => await seedDB(logger))
    .then(async () => await setupExpressApp(logger))
    .then((io) => initializeServices(io))
    .catch((e) => {
        logger.error("An error occurred while starting the application.");
        logger.error(e);
        process.exit(0);
    });
