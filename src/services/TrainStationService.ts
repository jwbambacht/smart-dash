import { Container } from "typedi";
import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { FindOneOptions } from "typeorm";
import { LoggerService } from "../services/LoggerService";
import { TrainStationRepository } from "../repositories/TrainStationRepository";
import { TrainStation } from "../models/TrainStation";

@Service()
export class TrainStationService {
    log = Container.get(LoggerService);

    constructor(@OrmRepository() private trainStationRepository: TrainStationRepository) {}

    public async create(address: TrainStation): Promise<TrainStation> {
        this.log.info('Create a train station');
        return this.trainStationRepository.save(address);
    }

    public async update(address: TrainStation): Promise<TrainStation> {
        this.log.info('Update a train station');
        return this.trainStationRepository.save(address);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a train station');
        await this.trainStationRepository.delete(id);
        return;
    }

    public findAll(): Promise<TrainStation[] | undefined> {
        return this.trainStationRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<TrainStation | undefined> {
        return this.trainStationRepository.findOne({
            id
        }, options);
    }

    public findByName(name: string, options?: FindOneOptions): Promise<TrainStation | undefined> {
        return this.trainStationRepository.findOne({
            name
        }, options);
    }

    public findByCode(stationCode: string, options?: FindOneOptions): Promise<TrainStation | undefined> {
        return this.trainStationRepository.findOne({
            stationCode
        }, options);
    }
}
