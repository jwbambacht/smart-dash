import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MapRoute } from "./MapRoute";

@Entity({name: "addresses"})
export class Address {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "name", unique: true, nullable: false})
    public name: string;

    @OneToMany(() => MapRoute, mapRoute => mapRoute.origin, {
        onDelete: 'CASCADE',
        cascade: true
    })
    public origins: Address[];

    @OneToMany(() => MapRoute, mapRoute => mapRoute.destination, {
        onDelete: 'CASCADE',
        cascade: true
    })
    public destinations: Address[];

    @Column({name: "address", unique: true, nullable: false})
    public address: string;

    @Column({name: "lat", nullable: true, default: 52.0613252, type: "double precision"})
    public lat: number;

    @Column({name: "lon", nullable: true, default: 4.3345751, type: "double precision"})
    public lon: number;


}
