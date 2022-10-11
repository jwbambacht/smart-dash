import { EntityRepository, Repository } from 'typeorm';
import { Energy } from "../models/Energy";

@EntityRepository(Energy)
export class EnergyRepository extends Repository<Energy> {}