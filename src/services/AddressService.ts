import { Container, Service } from "typedi";
import { InjectRepository } from 'typeorm-typedi-extensions';
import { FindOneOptions, Repository } from 'typeorm';

import { LoggerService } from './LoggerService';
import { Address } from "../models/Address";

@Service()
export class AddressService {
    log = Container.get(LoggerService);

    @InjectRepository(Address)
    private repository: Repository<Address>;

    public async create(address: Address): Promise<Address> {
        this.log.info('Create an address');
        return this.repository.save(address);
    }

    public async update(address: Address): Promise<Address> {
        this.log.info('Update an address');
        return this.repository.save(address);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete an address');
        await this.repository.delete(id);
        return;
    }

    public findAll(): Promise<Address[] | undefined> {
        return this.repository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.repository.findOne({
            id
        }, options);
    }

    public findByName(name: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.repository.findOne({
            name
        }, options);
    }

    public findByAddress(address: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.repository.findOne({
            address
        }, options);
    }
}
