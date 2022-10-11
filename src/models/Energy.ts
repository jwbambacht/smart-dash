import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Exclude } from "class-transformer";
import { bigIntToNumber } from "../util/Util";

@Entity("energy", {
    orderBy: {
        date: "ASC",
    }
})
export class Energy {
    @Exclude()
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "date", type: "bigint", nullable: false, unique: true})
    public date: number;

    @Column({name: "power_high", nullable: false})
    public powerHigh: number;

    @Column({name: "power_low", nullable: false})
    public powerLow: number;

    @Column({name: "solar_high", nullable: false})
    public solarHigh: number;

    @Column({name: "solar_low", nullable: false})
    public solarLow: number;

    @Column({name: "gas", nullable: false})
    public gas: number;

    @Column({name: "water", nullable: false})
    public water: number;

    @AfterLoad()
    convertBalanceToNumber(): void {
        this.date = bigIntToNumber(this.date);
    }
}