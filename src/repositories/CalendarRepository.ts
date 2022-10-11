import { EntityRepository, Repository } from 'typeorm';
import { Calendar } from '../models/Calendar';

@EntityRepository(Calendar)
export class CalendarRepository extends Repository<Calendar> {}