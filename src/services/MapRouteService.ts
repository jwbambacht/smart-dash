import { Container, Service } from "typedi";
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { LoggerService } from './LoggerService';
import { MapRoute } from "../models/MapRoute";
import { Address } from "../models/Address";

@Service()
export class MapRouteService {
    log = Container.get(LoggerService);

    @InjectRepository(MapRoute)
    private repository: Repository<MapRoute>;

    public async create(mapRoute: MapRoute): Promise<MapRoute> {
        this.log.info('Create a maproute');
        return this.repository.save(mapRoute);
    }

    public async update(mapRoute: MapRoute): Promise<MapRoute> {
        this.log.info('Update a maproute');
        return this.repository.save(mapRoute);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a maproute');
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<MapRoute[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByOriginAndDestination(origin: Address, destination: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.repository.findOne({
            origin,
            destination
        }, options);
    }

    public findByOrigin(origin: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.repository.findOne({
            origin
        }, options);
    }

    public findByDestination(destination: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.repository.findOne({
            destination
        }, options);
    }
}
