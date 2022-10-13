import { Service } from "typedi";
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { BaseService } from './BaseService';
import { Task } from "../models/Task";

@Service()
export class TaskService extends BaseService {
    taskUpdateInterval = 60 * 1000;
    tasksUpdateActivated = false;

    @InjectRepository(Task)
    private repository: Repository<Task>;

    constructor() {
        super("TaskService");

        setInterval(async () => {
            if (this.tasksUpdateActivated) this.emit<object>("tasks update", await this.getTasks());

            this.tasksUpdateActivated = false;
        }, this.taskUpdateInterval);
    }

    async init(type: string): Promise<void> {
        await super.init(type);

        if (type === "tasks") {
            this.tasksUpdateActivated = true;
            this.emit<object>("tasks update", await this.getTasks());
        }
    }

    activate(type: string): void {
        super.activate(type);

        if (type === "tasks") {
            this.tasksUpdateActivated = true;
        }
    }

    async getTasks(): Promise<object> {
        const isEnabled = await this.isServiceEnabled();
        return {
            serviceEnabled: isEnabled,
            items: isEnabled ? await this.repository.find() : []
        };
    }

    async getTask(id: string): Promise<Task> {
        return await this.repository.findOne(id);
    }

    async addTask(body: {task: string; flagged: boolean}): Promise<string> {
        const task = new Task();
        task.task = body.task;
        task.flagged = body.flagged;

        if (await this.repository.save(task)) {
            this.emit<object>("tasks update", await this.getTasks());

            return "OK";
        }

        return;
    }

    async editTask(id: string, description: string): Promise<string> {
        const task = await this.getTask(id);

        if (task === undefined) return;

        task.task = description;

        if (await this.repository.save(task)) {
            this.emit<object>("tasks update", await this.getTasks());

            return "OK";
        }

        return;
    }

    async deleteTask(id: string): Promise<string> {
        const task = await this.getTask(id);

        if (task === undefined) return;

        if (await this.repository.delete(task)) {
            this.emit<object>("tasks update", await this.getTasks());

            return "OK";
        }

        return;
    }

    async setTaskComplete(id: string, completed: boolean): Promise<string> {
        const task = await this.getTask(id);

        if (task === undefined) return;

        task.completed = completed;
        task.completedAt = completed ? new Date().getTime() : null;

        if (await this.repository.save(task)) {
            this.emit<object>("tasks update", await this.getTasks());

            return "OK";
        }

        return;
    }

    async setTaskFlag(id: string, flagged: boolean): Promise<string> {
        const task = await this.getTask(id);

        if (!task) return;

        task.flagged = flagged;

        if (await this.repository.save(task)) {
            this.emit<object>("tasks update", await this.getTasks());

            return "OK";
        }

        return;
    }
}
