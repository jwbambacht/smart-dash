import { Container } from "typedi";
import { ExpressErrorMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import { LoggerService } from "../services/LoggerService";

class ExpressError {
    httpCode: number;
    message: string;
    name: string;
    errors: object[];
}

@Middleware({ type: 'after' })
export class ErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {

    log = Container.get(LoggerService);

    public error(error: ExpressError, req: express.Request, res: express.Response): void {
        res.status(error.httpCode || 500);
        res.statusMessage = error.message;
        res.json({
            name: error.name,
            message: error.message,
            errors: error.errors
        });

        this.log.error(error.message);
        this.log.error(JSON.stringify(error.errors));
    }
}
