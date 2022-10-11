import { EntityRepository, Repository } from 'typeorm';
import { TrainRoute } from "../models/TrainRoute";

@EntityRepository(TrainRoute)
export class TrainRouteRepository extends Repository<TrainRoute> {}