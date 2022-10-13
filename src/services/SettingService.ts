import { Container } from "typedi";
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { LoggerService } from './LoggerService';
import { Setting } from '../models/Setting';

@Service()
export class SettingService {
    log = Container.get(LoggerService);

    @InjectRepository(Setting)
    private repository: Repository<Setting>;

    public async create(setting: Setting): Promise<Setting> {
        this.log.info('Create a setting');
        return this.repository.save(setting);
    }

    public async update(setting: Setting): Promise<Setting> {
        this.log.info('Update a setting');
        return this.repository.save(setting);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a setting');
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<Setting[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByTypeSpec(type: string, specification: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.repository.findOne({
            type,
            specification
        }, options);
    }

    public findAllByTypeSpec(type: string, specification: string): Promise<Setting[] | undefined> {
        return this.repository.find({
            type,
            specification
        });
    }
}
