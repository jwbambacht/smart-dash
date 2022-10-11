import { EntityRepository, Repository } from 'typeorm';
import { Setting } from "../models/Setting";

@EntityRepository(Setting)
export class SettingRepository extends Repository<Setting> {}