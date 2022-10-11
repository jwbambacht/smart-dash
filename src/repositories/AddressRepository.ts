import { EntityRepository, Repository } from 'typeorm';
import { Address } from "../models/Address";

@EntityRepository(Address)
export class AddressRepository extends Repository<Address> {}