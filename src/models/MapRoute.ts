import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Address } from "./Address";

@Entity({name: "map_routes"})
export class MapRoute {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "name", unique: true})
    public name: string;

    @ManyToOne(() => Address, address => address.origins, {
        eager: true
    })
    public origin: Address;

    @ManyToOne(() => Address, address => address.destinations, {
        eager: true
    })
    public destination: Address;
}
