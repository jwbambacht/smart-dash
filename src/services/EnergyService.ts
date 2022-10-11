import { Container } from "typedi";
import { Service } from 'typedi';
import { FindOneOptions } from "typeorm";
import { OrmRepository } from 'typeorm-typedi-extensions';
import { LoggerService } from "./LoggerService";
import { Energy } from "../models/Energy";
import { EnergyRepository } from "../repositories/EnergyRepository";

@Service()
export class EnergyService {
    log = Container.get(LoggerService);

    constructor(@OrmRepository() private energyRepository: EnergyRepository) {}

    public async create(item: Energy): Promise<Energy> {
        return this.energyRepository.save(item);
    }

    public async update(item: Energy): Promise<Energy> {
        return this.energyRepository.save(item);
    }

    public async delete(id: string): Promise<void> {
        await this.energyRepository.delete(id);
        return;
    }

    public findAll(): Promise<Energy[] | undefined> {
        return this.energyRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Energy | undefined> {
        return this.energyRepository.findOne({
            id
        }, options);
    }

    public findByDate(date: number, options?: FindOneOptions): Promise<Energy | undefined> {
        return this.energyRepository.findOne({
            date
        }, options);
    }
}
