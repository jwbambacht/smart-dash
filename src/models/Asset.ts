import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity("crypto_assets", {
	orderBy: {
		name: "ASC"
	}
})
export class Asset {
	@Exclude()
	@PrimaryGeneratedColumn("uuid", {name: "asset_id"})
	public assetID: string;

	@Column({ name: "id", nullable: false, unique: true })
	public id: string;

	@Column({ name: "name", nullable: false, unique: true })
	public name: string;

	@Column({ name: "symbol", nullable: false, unique: true })
	public symbol: string;

	@Column({ name: "image", nullable: false })
	public image: string;
}
