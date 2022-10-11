import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({name: "settings"})
export class Setting {
    @PrimaryGeneratedColumn("uuid", {name: "id"})
    public id: string;

    @Column({name: "type", nullable: false})
    public type: string;

    @Column({name: "description", nullable: true})
    public description: string;

    @Column({name: "specification", unique: false, nullable: false})
    public specification: string;

    @Column({name: "value", nullable: false})
    public value: string;
}
