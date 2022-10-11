import { Calendar } from "../models/Calendar";

export type Event = {
    title: string;
    location?: string;
    week: number;
    start: number;
    startDate: number;
    startTime: string;
    end: number;
    endDate: number;
    endTime: string;
    recurring: boolean;
    calendar: Calendar;
    dayTextAbbrev?: string;
    dayText?: string;
    daysFromNow?: number;
    dayType?: string;
}
