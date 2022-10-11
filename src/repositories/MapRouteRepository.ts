import { EntityRepository, Repository } from 'typeorm';
import { MapRoute } from "../models/MapRoute";

@EntityRepository(MapRoute)
export class MapRouteRepository extends Repository<MapRoute> {}