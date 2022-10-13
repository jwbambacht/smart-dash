import { Container } from 'typedi';
import { Body, Delete, Get, JsonController, Param, Post, Put } from 'routing-controllers';

import { TaskService } from '../services/TaskService';

@JsonController("/api/tasks")
export class UserController {
	tasksService = Container.get(TaskService);

	@Get("/")
	async getTasks(): Promise<object> {
		return await this.tasksService.getTasks();
	}

	@Post("/")
	async addTask(@Body() body: { task: string; flagged: boolean }): Promise<string> {
		return await this.tasksService.addTask(body);
	}

	@Put("/:id")
	async editTask(@Param("id") id: string, @Body() body: { description: string }): Promise<string> {
		return await this.tasksService.editTask(id, body.description);
	}

	@Delete("/:id")
	async deleteTask(@Param("id") id: string): Promise<string> {
		return await this.tasksService.deleteTask(id);
	}

	@Post("/complete/:id/:toggle")
	async setCompleteTask(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
		return await this.tasksService.setTaskComplete(id, toggle);
	}

	@Post("/flag/:id/:toggle")
	async setFlagTask(@Param("id") id: string, @Param("toggle") toggle: boolean): Promise<string> {
		return await this.tasksService.setTaskFlag(id, toggle);
	}
}
