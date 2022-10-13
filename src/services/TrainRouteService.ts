import { Container, Service } from "typedi";
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { LoggerService } from './LoggerService';
import { TrainRoute } from "../models/TrainRoute";
import { TrainStation } from "../models/TrainStation";

@Service()
export class TrainRouteService {
    log = Container.get(LoggerService);

    @InjectRepository(TrainRoute)
    private repository: Repository<TrainRoute>;

    public async create(mapRoute: TrainRoute): Promise<TrainRoute> {
        this.log.info('Create a train route');
        return this.repository.save(mapRoute);
    }

    public async update(mapRoute: TrainRoute): Promise<TrainRoute> {
        this.log.info('Update a train route');
        return this.repository.save(mapRoute);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a train route');
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<TrainRoute[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByName(name: string, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.repository.findOne({
            name
        }, options);
    }

    public findByOriginAndDestination(origin: TrainStation, destination: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.repository.findOne({
            origin,
            destination
        }, options);
    }

    public findByOrigin(origin: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.repository.findOne({
            origin
        }, options);
    }

    public findByDestination(destination: TrainStation, options?: FindOneOptions): Promise<TrainRoute | undefined> {
        return this.repository.findOne({
            destination
        }, options);
    }
}
