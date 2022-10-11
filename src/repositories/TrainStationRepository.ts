import { EntityRepository, Repository } from 'typeorm';
import { TrainStation } from "../models/TrainStation";

@EntityRepository(TrainStation)
export class TrainStationRepository extends Repository<TrainStation> {}