import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { bigIntToNumber } from "../util/Util";

@Entity("calendars", {
    orderBy: {
        customName: "ASC",
        defaultName: "ASC"
    }
})
export class Calendar {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "custom_name", nullable: true})
    public customName: string;

    @Column({name: "default_name", nullable: true})
    public defaultName: string;

    @Column({name: "url", nullable: false})
    public url: string;

    @Column({name: "color", nullable: false})
    public color: string;

    @Column({name: "enabled", type: "boolean", default: true})
    public enabled: boolean;

    @Column({name: "error", type: "boolean", default: false})
    public error: boolean;

    @Column({name: "updated_at", type: "bigint", nullable: false, default: new Date().getTime()})
    public updatedAt: number;

    @AfterLoad()
    convertBalanceToNumber(): void {
        this.updatedAt = bigIntToNumber(this.updatedAt);
    }
}
