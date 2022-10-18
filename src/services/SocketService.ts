import { Container, Service } from 'typedi';
import { Server, Socket } from "socket.io";

import { BaseService } from './BaseService';
import { LoggerService } from "./LoggerService";

type EmitServiceType = {
    service: string;
    type: string;
    value?: object;
}

@Service()
export class SocketService {
    log = Container.get(LoggerService);
    io: Server;
    sockets = new Map<string, Socket>();
    listeners = new Map<string, BaseService>();

    setServer(io: Server): void {
        this.io = io;

        io.on("connection", socket => {
            this.sockets.set(socket.id, socket);

            socket.on("disconnect", () => {
                this.sockets.delete(socket.id);
            });

            socket.on("init", (data: EmitServiceType) => {
                this.listeners.get(data.service)?.init(data.type, data.value);
            });

            socket.on("activate", (data: EmitServiceType) => {
                this.listeners.get(data.service)?.activate(data.type, data.value);
            });

            socket.on("event", (data: EmitServiceType) => {
                this.listeners.get(data.service)?.event(data.type, data.value);
            });
        });
    }

    emit<T>(event: string, data: T): void {
        this.io.emit(event, data);
    }

    registerListener(serviceName: string, instance: BaseService): void {
        this.listeners.set(serviceName, instance);
    }
}
