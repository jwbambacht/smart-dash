import { Container } from "typedi";
import { BadRequestError, Body, Delete, Get, JsonController, Param, Post } from "routing-controllers";
import { LoggerService } from "../services/LoggerService";
import { TrainStationService } from "../services/TrainStationService";
import { TrainRouteService } from "../services/TrainRouteService";
import { NSService } from "../services/NSService";
import { TrainStation } from "../models/TrainStation";

@JsonController("/api/trainstations")
export class TrainStationController {
    log = Container.get(LoggerService);
    trainStationService = Container.get(TrainStationService);
    trainRouteService = Container.get(TrainRouteService);
    nsService = Container.get(NSService);

    @Get("/")
    async getTrainStations(): Promise<TrainStation[]> {
        return await this.trainStationService.findAll();
    }

    @Get("/:id")
    async getTrainStation(@Param("id") id: string): Promise<TrainStation> {
        return await this.trainStationService.findByID(id);
    }

    @Post("/")
    async addTrainStation(@Body() body: {stationCode: string}): Promise<TrainStation> {

        if (await this.trainStationService.findByCode(body.stationCode) !== undefined) throw new BadRequestError(`Station with code ${body.stationCode} is already added`);

        const station = ((await this.nsService.getStations()).find((station: { code: string }) => station.code === body.stationCode));
        if (station === undefined) throw new BadRequestError(`Station with code ${body.stationCode} is not found`);

        const trainStation = new TrainStation();
        trainStation.name = station.name;
        trainStation.stationCode = station.code;

        const newTrainStation = await this.trainStationService.create(trainStation);
        if (newTrainStation === undefined) throw new BadRequestError("Failed to save train station");

        return newTrainStation;
    }

    @Delete("/:id")
    async deleteTrainStation(@Param("id") id: string): Promise<string> {
        const trainStation = await this.trainStationService.findByID(id);

        if (trainStation !== undefined) {
            const originRoutes = await this.trainRouteService.findByOrigin(trainStation);
            const destinationRoutes = await this.trainRouteService.findByDestination(trainStation);

            if (originRoutes !== undefined || destinationRoutes !== undefined) throw new BadRequestError(`Cannot remove train station because it's in use by a train route`);
        }

        await this.trainStationService.delete(id);
        return "OK";
    }
}
