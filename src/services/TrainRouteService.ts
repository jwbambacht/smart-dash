import { Container } from "typedi";
import { Service } from 'typedi';
import { FindOneOptions } from "typeorm";
import { OrmRepository } from 'typeorm-typedi-extensions';
import { LoggerService } from "../services/LoggerService";
import { TrainRouteRepository } from "../repositories/TrainRouteRepository";
import { TrainRoute } from "../models/TrainRoute";
import { TrainStation } from "../models/TrainStation";

@Service()
export class TrainRouteService {
    log = Container.get(LoggerService);

    constructor(@OrmRepository() private trainRouteRepository: TrainRouteRepository) {}

    public async create(mapRoute: TrainRoute): Promise<TrainRoute> {
        this.log.info('Create a train route');
        return this.trainRouteRepository.save(mapRoute);
    }

    public async update(mapRoute: TrainRoute): Promise<TrainRoute> {
        this.log.info('Update a train route');
        return this.trainRouteRepository.save(mapRoute);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a train route');
        await this.trainRouteRepository.delete(id);
        return;
    }

    public findAll(): Promise<TrainRoute[] | undefined> {
        return this.trainRouteRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.trainRouteRepository.findOne({
            id
        }, options);
    }

    public findByName(name: string, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.trainRouteRepository.findOne({
            name
        }, options);
    }

    public findByOriginAndDestination(origin: TrainStation, destination: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.trainRouteRepository.findOne({
            origin,
            destination
        }, options);
    }

    public findByOrigin(origin: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.trainRouteRepository.findOne({
            origin
        }, options);
    }

    public findByDestination(destination: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.trainRouteRepository.findOne({
            destination
        }, options);
    }
}
