import path from "path";
import fs from "fs";
import * as https from "https";
import http from 'http';
import * as express from 'express';
import { createExpressServer } from "routing-controllers";
import socket, { Server } from "socket.io";
import { LoggerService } from "../services/LoggerService";

export async function setupExpressApp(logger: LoggerService): Promise<Server> {

    try {
        // Create express app, registers all controller routes and returns express app instance
        const app = createExpressServer({
            controllers: [__dirname + "/../controllers/*.js"],
            middlewares: [__dirname + "/../middlewares/*.js"],
            defaultErrorHandler: false,
            authorizationChecker: null,
            currentUserChecker: null,
            validation: {
                validationError: {
                    target: false
                },
                forbidUnknownValues: true
            }
        });

        // Configure Express to use EJS template engine and add static middleware
        app.set("views", path.join(__dirname, "../views"));
        app.set("view engine", "ejs");
        app.use("/assets", express.static(path.join(__dirname, "../assets")));
        app.use("/events", express.static(path.join(__dirname, "../events")));
        app.use("/views", express.static(path.join(__dirname, "../views")));

        // Create HTTPS or HTTP server depending on definition and existence of SSL key/certificate
        let server: https.Server | http.Server;
        try {
            const credentials = {
                key: fs.readFileSync(path.join(__dirname, "../", process.env.SSL_KEY)),
                cert: fs.readFileSync(path.join(__dirname, "../", process.env.SSL_CERT))
            };
            server = https.createServer(credentials, app);
        } catch (err) {
            logger.error(`Failed to create HTTPS server (${err})`);
            logger.info('Fallback to HTTP');

            server = http.createServer(app);
        }

        // Create socket instance
        const io = socket(server);

        // Start listening for incoming requests
        const port = process.env.PORT || 3000;
        server.listen(port, () => {
            logger.info(`App started, listening on port ${port}`);
        });

        return io;

    } catch (err) {
        throw new Error(`Failed to start the server (${err})`);
    }
}
