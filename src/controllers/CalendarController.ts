import { Body, Delete, Get, JsonController, Param, Params, Post } from 'routing-controllers';
import { Container } from 'typedi';
import { CalendarService } from '../services/CalendarService';

@JsonController("/api/calendar")
export class CalendarController {
	calendarService = Container.get(CalendarService);

	@Get("/month/:year/:month")
	async getCalendarMonth(@Param("year") year: number, @Param("month") month: number): Promise<object> {
		return this.calendarService.getCalendarMonth(year, month);
	}

	@Get("/events/:year/:week")
	async getCalendarEvents(@Param("year") year: number, @Param("week") week: number): Promise<object> {
		return await this.calendarService.getCalendarEvents(year, week);
	}

	@Get("/find/:id?")
	async getCalendars(@Params() { id = 'all' }: { id: string }): Promise<object> {
		if (id === "all") {
			return await this.calendarService.getCalendars();
		} else {
			return await this.calendarService.getCalendar(id);
		}
	}

	@Get("/preview/events")
	async getCalendarPreviewEvents(): Promise<object> {
		return await this.calendarService.getCalendarEventsBetween();
	}

	@Post("/add")
	async addCalendar(@Body() body: { customName: string; url: string; color: string }): Promise<string> {
		return await this.calendarService.addCalendar(body);
	}

	@Post("/update/:id")
	async updateCalendar(@Param("id") id: string, @Body() body: { customName: string; url: string; color: string }): Promise<string> {
		return await this.calendarService.setCalendar(body, id);
	}

	@Delete("/delete/:id")
	async deleteCalendar(@Param("id") id: string): Promise<string> {
		return await this.calendarService.deleteCalendar(id);
	}

	@Post("/toggle/:id/:toggle")
	async setCalendarStatus(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
		return await this.calendarService.setCalendarStatus(id, toggle);
	}
}
