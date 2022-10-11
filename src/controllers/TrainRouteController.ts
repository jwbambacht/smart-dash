import { Container } from "typedi";
import { BadRequestError, Body, Delete, Get, JsonController, Param, Post, Put } from "routing-controllers";
import { IsNotEmpty, IsString } from "class-validator";
import { LoggerService } from "../services/LoggerService";
import { TrainRouteService } from "../services/TrainRouteService";
import { TrainStationService } from "../services/TrainStationService";
import { NSService } from "../services/NSService";
import { TrainRoute } from "../models/TrainRoute";

class TrainRouteRequest {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    origin: string;

    @IsString()
    @IsNotEmpty()
    destination: string;
}

@JsonController("/api/trainroutes")
export class TrainRouteController {
    log = Container.get(LoggerService);
    trainStationService = Container.get(TrainStationService);
    trainRouteService = Container.get(TrainRouteService);
    nsService = Container.get(NSService);

    @Get("/")
    async getTrainRoutes(): Promise<TrainRoute[]> {
        return await this.trainRouteService.findAll();
    }

    @Get("/:id")
    async getTrainRoute(@Param("id") id: string): Promise<TrainRoute> {
        return await this.trainRouteService.findByID(id);
    }

    @Post("/")
    async addTrainRoute(@Body() body: TrainRouteRequest): Promise<TrainRoute> {
        const origin = await this.trainStationService.findByID(body.origin);
        const destination = await this.trainStationService.findByID(body.destination);

        if (origin === undefined) throw new BadRequestError("Invalid origin station");
        if (destination === undefined) throw new BadRequestError("Invalid destination station");
        if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

        if (await this.trainRouteService.findByOriginAndDestination(origin, destination) !== undefined) throw new BadRequestError("Train route is already defined");

        const trainRoute = new TrainRoute();
        trainRoute.name = body.name;
        trainRoute.origin = origin;
        trainRoute.destination = destination;

        const newTrainRoute = await this.trainRouteService.create(trainRoute);
        if (newTrainRoute === undefined) throw new Error("Failed to save train route");

        await this.nsService.init("ns trips");

        return newTrainRoute;
    }

    @Put("/:id")
    async updateTrainRoute(@Body() body: TrainRouteRequest, @Param("id") id: string): Promise<TrainRoute> {
        const trainRoute = await this.trainRouteService.findByID(id);

        if (trainRoute === undefined) throw new BadRequestError("Train route not found");

        const origin = await this.trainStationService.findByID(body.origin);
        const destination = await this.trainStationService.findByID(body.destination);

        if (origin === undefined) throw new BadRequestError("Invalid origin station");
        if (destination === undefined) throw new BadRequestError("Invalid destination station");
        if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

        const trainRouteExists = await this.trainRouteService.findByOriginAndDestination(origin, destination);
        if (trainRouteExists !== undefined && trainRouteExists.id !== trainRoute.id) throw new BadRequestError("Train route is already defined");

        trainRoute.name = body.name;
        trainRoute.origin = origin;
        trainRoute.destination = destination;

        const updatedTrainRoute = await this.trainRouteService.update(trainRoute);
        if (updatedTrainRoute === undefined) throw new Error("Failed to update train route");

        await this.nsService.init("ns trips");

        return updatedTrainRoute;
    }

    @Delete("/:id")
    async deleteTrainRoute(@Param("id") id: string): Promise<string> {
        await this.trainRouteService.delete(id);
        return "OK";
    }
}
