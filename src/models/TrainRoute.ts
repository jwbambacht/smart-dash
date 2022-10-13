import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { TrainStation } from "./TrainStation";

@Entity({name: "train_routes"})
export class TrainRoute {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "name", unique: true})
    public name: string;

    @ManyToOne(() => TrainStation, trainStation => trainStation.origins, {
        eager: true,
        nullable: false
    })
    public origin: TrainStation;

    @ManyToOne(() => TrainStation, trainStation => trainStation.destinations, {
        eager: true,
        nullable: false
    })
    public destination: TrainStation;
}
