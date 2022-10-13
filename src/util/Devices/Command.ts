import { Container } from "typedi";
import { Buffer } from 'buffer';
import dgram from "dgram";

import { Cryptographer } from "./Cryptographer";
import { LoggerService } from "../../services/LoggerService";

export class Command {
    log = Container.get(LoggerService);
    private readonly totalMessage: Buffer;
    private readonly client = dgram.createSocket('udp4');

    constructor(
        private readonly macAddress: string,
        private readonly aesKey: string,
        private readonly deviceID: number,
        private readonly deviceFunction: number,
        private readonly value: number,
    ) {
        const commandObject = {
            module: {
                id: deviceID,
                function: deviceFunction,
                value: value
            }
        };

        const encryptedData = Cryptographer.encrypt(JSON.stringify(commandObject), this.aesKey);
        const data = Buffer.from(encryptedData, 'hex');
        const header = Buffer.alloc(43);
        header.writeUInt8(1);
        header.writeUInt32LE(653213, 9);
        header.writeUInt8(128, 2);
        header.writeUInt16LE(data.length, 41);
        header.writeUInt32LE(deviceID, 29);

        const macBuffer = Buffer.from(this.macAddress, 'hex');
        for (let i = 0; i < macBuffer.length; i++) {
            header[3 + i] = macBuffer[i];
        }

        this.totalMessage = Buffer.concat([header, data]);
    }

    public sendTo(host: string, port: number, sendTimeout = 10_000): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
               reject('Message timed out');
            }, sendTimeout);

            this.client.on('message', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.client.bind();

            this.client.send(this.totalMessage, port, host, ((error) => {
                if (error) {
                    this.log.info("Command rejected");
                    reject(error);
                }

                this.log.info("Command sent");
            }));
        });
    }
}
