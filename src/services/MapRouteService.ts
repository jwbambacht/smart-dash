import { Container } from "typedi";
import { Service } from 'typedi';
import { FindOneOptions } from "typeorm";
import { OrmRepository } from 'typeorm-typedi-extensions';
import { LoggerService } from './LoggerService';
import { MapRouteRepository } from "../repositories/MapRouteRepository";
import { MapRoute } from "../models/MapRoute";
import { Address } from "../models/Address";

@Service()
export class MapRouteService {

    log = Container.get(LoggerService);

    constructor(@OrmRepository() private mapRouteRepository: MapRouteRepository) {}

    public async create(mapRoute: MapRoute): Promise<MapRoute> {
        this.log.info('Create a maproute');
        return this.mapRouteRepository.save(mapRoute);
    }

    public async update(mapRoute: MapRoute): Promise<MapRoute> {
        this.log.info('Update a maproute');
        return this.mapRouteRepository.save(mapRoute);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a maproute');
        await this.mapRouteRepository.delete(id);
        return;
    }

    public findAll(): Promise<MapRoute[] | undefined> {
        return this.mapRouteRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.mapRouteRepository.findOne({
            id
        }, options);
    }

    public findByOriginAndDestination(origin: Address, destination: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.mapRouteRepository.findOne({
            origin,
            destination
        }, options);
    }

    public findByOrigin(origin: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.mapRouteRepository.findOne({
            origin
        }, options);
    }

    public findByDestination(destination: Address, options?: FindOneOptions): Promise<MapRoute | undefined> {
        return this.mapRouteRepository.findOne({
            destination
        }, options);
    }
}
