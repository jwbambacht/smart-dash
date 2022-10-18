import { Service } from "typedi";
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';
import * as lodash from 'lodash';
import moment from "moment";

import * as ical from 'node-ical';
import { BaseService } from './BaseService';
import { Calendar } from "../models/Calendar";
import { Event } from "../types/CalendarTypes";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const daysAbbrev = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const daysAbbrevShort = ["M", "T", "W", "T", "F", "S", "S"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthNamesAbbrev = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

@Service()
export class CalendarService extends BaseService {

    minimumDate = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    maximumDate = new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0, 0);
    events: Event[] = [];
    enabled = true;
    error = '';
    updatedAt: number;
    calendarUpdateInterval = 10 * 60 * 1000;

    @InjectRepository(Calendar)
    private repository: Repository<Calendar>;

    constructor() {
        super("CalendarService");

        this.startService();
    }

    async startService(): Promise<void> {
        await this.repository;

        this.fetchCalendarEvents().then(() => {
            setInterval(async () => {
                await this.fetchCalendarEvents();

            }, this.calendarUpdateInterval);
        });
    }

    async checkServiceStatus(): Promise<boolean> {
        if (!await this.isServiceEnabled()) {
            this.events = [];
            this.enabled = false;
            this.error = '';
            this.updatedAt = new Date().getTime();

            return false;
        }

        return true;
    }

    async getCalendars(): Promise<Calendar[] | undefined> {
        return this.repository.find();
    }

    async getCalendar(id: string): Promise<object> {
        return this.repository.findOne({id});
    }

    async addCalendar(body: {url: string; customName: string; color: string}): Promise<string> {
        const calendar = new Calendar();
        calendar.url = body.url;
        calendar.customName = body.customName;
        calendar.color = body.color;
        calendar.updatedAt = new Date().getTime();

        if (await this.repository.save(calendar) !== undefined) {
            await this.fetchCalendarEvents();
            return "OK";
        }

        return;
    }

    async setCalendar(body: {url: string; customName: string; color: string}, id: string): Promise<string> {

        const calendar = await this.repository.findOne(id);

        if (calendar === undefined) return;

        calendar.url = body.url;
        calendar.customName = body.customName;
        calendar.color = body.color;
        calendar.updatedAt = new Date().getTime();

        if (await this.repository.save(calendar) !== undefined) {
            await this.fetchCalendarEvents();
            return "OK";
        }

        return;
    }

    async deleteCalendar(id: string): Promise<string> {
        const calendar = await this.repository.findOne(id);

        if (calendar === undefined) return;

        if (await this.repository.delete(calendar)) {
            await this.fetchCalendarEvents();
            return "OK";
        }

        return;
    }

    async setCalendarStatus(id: string, enable: boolean): Promise<string> {
        const calendar = (await this.getCalendars()).find((cal) => cal.id === id);
        calendar.enabled = enable;

        if (await this.repository.save(calendar) !== null) {
            await this.fetchCalendarEvents();

            return "OK";
        }

        throw new Error("Failed to update calendar status");
    }

    async getCalendarEvents(
        year: number = new Date().getFullYear(),
        week: number = moment(new Date()).isoWeek()
    ): Promise<object> {
        let filtered: lodash.Dictionary<Event[]> = {};
        const weekStart = moment().year(year).isoWeek(week).startOf("isoWeek").toDate().getTime();
        const weekEnd = moment().year(year).isoWeek(week).endOf("isoWeek").toDate().getTime();

        if (await this.checkServiceStatus()) {
            const filteredEvents = this.events
                .filter((event: Event) => event.start >= weekStart && event.start <= weekEnd)
                .sort((a, b) => a.start - b.start);
            filtered = lodash.groupBy(filteredEvents, 'startDate');
        }

        return {
            serviceEnabled: await this.isServiceEnabled(),
            year: year,
            week: week,
            weekStart: weekStart,
            weekEnd: weekEnd,
            events: filtered,
            updatedAt: this.updatedAt
        };
    }

    async getCalendarEventsBetween(
        startDate: Date = new Date(),
        nDays = 2
    ): Promise<object> {
        let filteredEvents: object[] = [];

        if (await this.checkServiceStatus()) {
            const endDate = new Date(startDate.getTime());
            endDate.setDate(endDate.getDate() + nDays + 1);
            endDate.setHours(0);
            endDate.setMinutes(0);

            filteredEvents = this.events
                .filter((event: Event) => event.end >= startDate.getTime() && event.end < endDate.getTime())
                .sort((a, b) => a.start - b.start)
                .map((event): object => {
                    const obj = event;
                    obj.dayTextAbbrev = moment(event.start).format("ddd");
                    obj.dayText = moment(event.start).format("dddd");

                    const daysFromNow = moment(event.start).diff(moment(startDate.getTime()).startOf('day'), 'days');
                    obj.daysFromNow = daysFromNow;
                    obj.dayType = daysFromNow === 0 ? "Today" : (daysFromNow === 1 ? "Tomorrow" : moment(event.start).format("dddd"));

                    return obj;
                });
        }

        return {
            serviceEnabled: await this.isServiceEnabled(),
            events: filteredEvents,
            updatedAt: this.updatedAt
        };
    }

    async fetchCalendarEvents(): Promise<void> {
        if (!await this.checkServiceStatus()) return;

        this.log.info("CalendarService", "Fetching calendars");

        this.events = [];
        const calendars = await this.getCalendars();

        for (const calendar of calendars) {
            if (!calendar.enabled) continue;

            await this.fetchCalendarFromURL(calendar);
            calendar.updatedAt = new Date().getTime();
        }

        this.updatedAt = new Date().getTime();

        return;
    }

    async fetchCalendarFromURL(calendar: Calendar): Promise<void> {

        fetch(calendar.url).then(async (req) => {
            if (req.status === 200) {
                calendar.error = false;
                await this.repository.save(calendar);

                return await this.parseCalendarData(calendar, await req.text());
            }
        })
        .catch(async () => {
            calendar.error = true;
            await this.repository.save(calendar);
        });
    }

    async parseCalendarData(calendar: Calendar, data: string): Promise<void> {

        await ical.async.parseICS(data).then((res) => {

            for (const k in res) {
                if (!Object.prototype.hasOwnProperty.call(res, k)) continue;

                const event = res[k];

                if (event.type === "VTIMEZONE") continue;

                if (event.type === "VCALENDAR") {
                    calendar.defaultName = event['WR-CALNAME'];
                    this.repository.save(calendar);
                    continue;
                }

                if (moment(event.start).toDate().getTime() < this.minimumDate.getTime()) continue;

                if (event.type === 'VEVENT' && !event.rrule) {
                    this.events.push({
                        title: event.summary,
                        location: event.location,
                        week: moment(event.start).isoWeek(),
                        start: event.start.getTime(),
                        startDate: new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate()).getTime(),
                        startTime: moment(event.start).format("HH:mm"),
                        end: event.end.getTime(),
                        endDate: new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate()).getTime(),
                        endTime: moment(event.end).format("HH:mm"),
                        recurring: event.rrule === null,
                        calendar: calendar
                    });
                }

                if (event.type !== 'VEVENT' || !event.rrule) continue;

                const dates = event.rrule.between(this.minimumDate, this.maximumDate);

                if (dates.length === 0) continue;

                const duration = event.end.getTime() - event.start.getTime();

                dates.forEach(date => {
                    let start;
                    let end;
                    if (event.rrule.origOptions.tzid) {

                        start = moment(date).toDate();
                        end = moment(new Date(start.getTime() + duration)).toDate();

                    } else {

                        start = new Date(date.setHours(date.getHours() - ((event.start.getTimezoneOffset() - date.getTimezoneOffset()) / 60)));
                        end = moment(new Date(start.getTime() + duration)).toDate();
                    }

                    this.events.push({
                        title: event.summary,
                        location: event.location,
                        week: moment(start).isoWeek(),
                        start: start.getTime(),
                        startDate: new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime(),
                        startTime: moment(start).format("HH:mm"),
                        end: end.getTime(),
                        endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime(),
                        endTime: moment(end).format("HH:mm"),
                        recurring: true,
                        calendar: calendar
                    });
                });

            }
        }).catch(async (err) => {
            this.log.info("CalendarService", "No calendar data found: " + err);

            calendar.enabled = false;
            await this.repository.save(calendar);
            throw new Error("No calendar data found for " + calendar.url);
        });
    }

    getCalendarMonth(
        year: number = new Date().getFullYear(),
        month: number = new Date().getMonth()
    ): object {
        const today = new Date();
        const date = new Date(year, month, 1);

        const dates = [];

        while (date.getMonth() === month) {
            const day = new Date(date);
            const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1;

            const obj = {
                time: day.getTime(),
                date: day.getDate(),
                dayOfWeek: dayOfWeek,
                days: days[dayOfWeek],
                dayAbbrev: daysAbbrev[dayOfWeek],
                dayAbbrevShort: daysAbbrevShort[dayOfWeek],
                week: moment(day).isoWeek(),
                weekend: dayOfWeek >= 5,
                today: date.toDateString() === today.toDateString()
            };

            dates.push(obj);
            date.setDate(date.getDate() + 1);
        }

        return {
            year: year,
            month: {
                number: month,
                name: monthNames[month],
                nameAbbrev: monthNamesAbbrev[month]
            },
            weekDays: {
                days,
                daysAbbrev,
                daysAbbrevShort
            },
            dates: dates,
        };
    }
}
