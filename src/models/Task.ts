import { Entity, PrimaryGeneratedColumn, Column, AfterLoad } from 'typeorm';
import { bigIntToNumber } from "../util/Util";

@Entity({
    name: "tasks",
    orderBy: {
        flagged: "DESC",
        createdAt: "ASC"
    }
})
export class Task {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "task"})
    public task: string;

    @Column({name: "completed", default: false, nullable: false})
    public completed: boolean;

    @Column({name: "created_at", type: "bigint", nullable: false, default: new Date().getTime()})
    public createdAt: number;

    @Column({name: "completed_at", type: "bigint", nullable: true})
    public completedAt: number;

    @Column({name: "flagged", default: false, nullable: false})
    public flagged: boolean;

    @AfterLoad()
    convertBalanceToNumber(): void {
        this.createdAt = bigIntToNumber(this.createdAt);
        this.completedAt = this.completedAt !== null ? bigIntToNumber(this.completedAt) : null;
    }
}
