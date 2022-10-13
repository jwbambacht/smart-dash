import { Container } from "typedi";
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { LoggerService } from "./LoggerService";
import { Energy } from "../models/Energy";

@Service()
export class EnergyService {
    log = Container.get(LoggerService);

    @InjectRepository(Energy)
    private repository: Repository<Energy>;

    public async create(item: Energy): Promise<Energy> {
        return this.repository.save(item);
    }

    public async update(item: Energy): Promise<Energy> {
        return this.repository.save(item);
    }

    public async delete(id: string): Promise<void> {
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<Energy[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Energy | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByDate(date: number, options?: FindOneOptions): Promise<Energy | undefined> {
        return this.repository.findOne({
            date
        }, options);
    }
}
