import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

import { TrainRoute } from "./TrainRoute";

@Entity({name: "stations"})
export class TrainStation {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "name", unique: true, nullable: false})
    public name: string;

    @Column({name: "station_code", nullable: false, unique: true})
    public stationCode: string;

    @OneToMany(() => TrainRoute, trainRoute => trainRoute.origin, {
        onDelete: 'CASCADE',
        cascade: true
    })
    public origins: TrainRoute[];

    @OneToMany(() => TrainRoute, trainRoute => trainRoute.destination, {
        onDelete: 'CASCADE',
        cascade: true
    })
    public destinations: TrainRoute[];
}
