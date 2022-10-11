import { Container } from "typedi";
import { Service } from 'typedi';
import { FindOneOptions } from "typeorm";
import { OrmRepository } from 'typeorm-typedi-extensions';
import { LoggerService } from './LoggerService';
import { SettingRepository } from '../repositories/SettingRepository';
import { Setting } from '../models/Setting';

@Service()
export class SettingService {
    log = Container.get(LoggerService);

    constructor(@OrmRepository() private settingRepository: SettingRepository) {}

    public async create(setting: Setting): Promise<Setting> {
        this.log.info('Create a setting');
        return this.settingRepository.save(setting);
    }

    public async update(setting: Setting): Promise<Setting> {
        this.log.info('Update a setting');
        return this.settingRepository.save(setting);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete a setting');
        await this.settingRepository.delete(id);
        return;
    }

    public findAll(): Promise<Setting[] | undefined> {
        return this.settingRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.settingRepository.findOne({
            id
        }, options);
    }

    public findBySpec(specification: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.settingRepository.findOne({
            specification
        }, options);
    }

    public findByType(type: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.settingRepository.findOne({
            type
        }, options);
    }

    public findAllByType(type: string): Promise<Setting[] | undefined> {
        return this.settingRepository.find({
            type
        });
    }

    public findByTypeSpec(type: string, specification: string, options?: FindOneOptions): Promise<Setting | undefined> {
        return this.settingRepository.findOne({
            type,
            specification
        }, options);
    }

    public findAllByTypeSpec(type: string, specification: string): Promise<Setting[] | undefined> {
        return this.settingRepository.find({
            type,
            specification
        });
    }
}
