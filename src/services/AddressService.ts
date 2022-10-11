import { Container } from "typedi";
import { Service } from 'typedi';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { FindOneOptions } from "typeorm";
import { LoggerService } from "../services/LoggerService";
import { AddressRepository } from "../repositories/AddressRepository";
import { Address } from "../models/Address";

@Service()
export class AddressService {
    log = Container.get(LoggerService);

    constructor(@OrmRepository() private addressRepository: AddressRepository) {}

    public async create(address: Address): Promise<Address> {
        this.log.info('Create an address');
        return this.addressRepository.save(address);
    }

    public async update(address: Address): Promise<Address> {
        this.log.info('Update an address');
        return this.addressRepository.save(address);
    }

    public async delete(id: string): Promise<void> {
        this.log.info('Delete an address');
        await this.addressRepository.delete(id);
        return;
    }

    public findAll(): Promise<Address[] | undefined> {
        return this.addressRepository.find();
    }

    public findByID(id: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.addressRepository.findOne({
            id
        }, options);
    }

    public findByName(name: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.addressRepository.findOne({
            name
        }, options);
    }

    public findByAddress(address: string, options?: FindOneOptions): Promise<Address | undefined> {
        return this.addressRepository.findOne({
            address
        }, options);
    }
}
