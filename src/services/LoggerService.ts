import { Service } from 'typedi';
import winston, { Logger } from 'winston';
import fs from 'fs';
import path from 'path';

const customLevels: { levels: {[key: string]: number}; colors: {[key: string]: string}} = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3
    },
    colors: {
        error: 'red',
        warn: 'orange',
        info: 'green',
        http: 'blue'
    }
};

const maxFileSize = 1024 * 1024 * 10;
const logPageSize = 50;

@Service()
export class LoggerService {
    logger: Logger;

    constructor() {
        this.logger = winston.createLogger({
            levels: customLevels.levels,
            transports: [
                new winston.transports.Console({
                    handleExceptions: true,
                    format: winston.format.combine(
                        winston.format.json(),
                        winston.format.colorize({
                            colors: customLevels.colors
                        }),
                        winston.format.timestamp({format: 'MMM-DD-YYYY HH:mm:ss'}),
                        winston.format.align(),
                        winston.format.printf(info => `(${info.level}) [${info.label}] ${info.message}`),
                    ),
                }),
                new winston.transports.File({
                    level: 'error',
                    maxsize: maxFileSize,
                    filename: path.join(__dirname, '/../logs/error.log')
                }),
                new winston.transports.File({
                    level: 'warn',
                    maxsize: maxFileSize,
                    filename: path.join(__dirname, '/../logs/warn.log')
                }),
                new winston.transports.File({
                    level: 'info',
                    maxsize: maxFileSize,
                    filename: path.join(__dirname, '/../logs/info.log')
                }),
                new winston.transports.File({
                    level: 'http',
                    maxsize: maxFileSize,
                    filename: path.join(__dirname, '/../logs/http.log')
                })
            ]
        });
    }

    public error(label: string, message?: string): void {
        this.logger.error({
            label: label,
            message: message,
            timestamp: new Date()
        });
    }

    public warn(label: string, message?: string): void {
        this.logger.warn({
            label: label,
            message: message,
            timestamp: new Date()
        });
    }

    public info(label: string, message?: string): void {
        this.logger.info({
            label: label,
            message: message,
            timestamp: new Date()
        });
    }

    public http(label: string, message?: string): void {
        this.logger.http({
            label: label,
            message: message,
            timestamp: new Date()
        });
    }

    async getLogFileNames(): Promise<string[]> {
        return Object.keys(customLevels.levels);
    }

    async getLog(logName: string, page = 1): Promise<object> {
        const fileName = logName + ".log";
        const filePath = path.join(__dirname, "/../logs/", fileName);

        if (fs.existsSync(filePath)) {
            let fileContent = fs
                .readFileSync(filePath, 'utf-8')
                .split("\n")
                .join(",");

            if (fileContent.charAt(fileContent.length - 1) === ",") {
                fileContent = fileContent.slice(0, -1);
            }

            const parsedFileContent: object[] = JSON.parse("[" + fileContent + "]");

            return {
                fileName,
                logName,
                fileContent: parsedFileContent
                    .reverse()
                    .slice((page - 1) * logPageSize, page * logPageSize),
                nextLink: parsedFileContent.length > page * logPageSize ? "/logs/" + logName + "/" + (page + 1) : null,
                previousLink: page > 1 ? "/logs/" + logName + "/" + (page - 1) : null,
            };
        }

        this.error("LoggerService", `File ${fileName} not found`);

        return {
            fileName,
            logName,
        };
    }
}
