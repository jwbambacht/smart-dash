import { Container, Service } from "typedi";
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { LoggerService } from './LoggerService';
import { TrainStation } from "../models/TrainStation";

@Service()
export class TrainStationService {
    log = Container.get(LoggerService);

    @InjectRepository(TrainStation)
    private repository: Repository<TrainStation>;

    public async create(address: TrainStation): Promise<TrainStation> {
        this.log.info('Create a train station');
        return this.repository.save(address);
    }

    public async update(address: TrainStation): Promise<TrainStation> {
        this.log.info('Update a train station');
        return this.repository.save(address);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a train station');
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<TrainStation[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<TrainStation | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByCode(stationCode: string, options?: FindOneOptions): Promise<TrainStation | undefined> {
        return this.repository.findOne({
            stationCode
        }, options);
    }
}
