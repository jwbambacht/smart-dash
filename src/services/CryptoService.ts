import { Service } from 'typedi';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Repository } from 'typeorm';
import { URL, URLSearchParams } from "url";

import { BaseService } from './BaseService';
import { Asset } from '../models/Asset';
import { Coin, MarketResponseObj } from '../types/CryptoTypes';

const defaultFilterSettings = {
	perPage: 10,
	page: 1,
	perPageOptions: [10, 20, 50, 100, 200]
};

@Service()
export class CryptoService extends BaseService {
	apiURL = new URL(process.env.CRYPTO_MARKETS_URL);
	coins: Coin[] = [];
	nCoins = 100;
	filterSettings = defaultFilterSettings;
	updatedAt: Date = new Date();
	updateActivated = false;
	updateInterval = 5 * 60 * 1000;
	enabled = true;
	error = '';

	@InjectRepository(Asset)
	private repository: Repository<Asset>;

	constructor() {
		super("CryptoService");

		this.fetchCoins().then(() => {
			setInterval(async () => {
				if (this.updateActivated) this.emit<object>("crypto update", await this.getCrypto(true));

				this.updateActivated = false;
			}, this.updateInterval);
		});
	}

	setFilterSettings(value: { page?: number; perPage?: number }): void {
		this.filterSettings.page = value?.page || defaultFilterSettings.page;
		this.filterSettings.perPage = value?.perPage || defaultFilterSettings.perPage;
	}

	async init(type: string, value: { page?: number; perPage?: number }): Promise<void> {
		await super.init(type, value);

		if (type === "crypto") {
			this.updateActivated = true;
			this.setFilterSettings(value);
			this.emit<object>("crypto update", await this.getCrypto(true));
		}
	}

	activate(type: string, value: { page?: number; perPage?: number }): void {
		super.activate(type, value);

		if (type === "crypto") {
			this.updateActivated = true;
			this.setFilterSettings(value);
		}
	}

	async event(type: string, value: { page?: number; perPage?: number }): Promise<void> {
		await super.event(type, value);

		if (type === "crypto coin pagination") {
			this.setFilterSettings(value);
			this.emit<object>("crypto update", await this.getCrypto(true));
		}
	}

	async checkServiceStatus(): Promise<boolean> {
		if (!await this.isServiceEnabled()) {
			this.coins = [];
			this.enabled = false;
			this.error = '';
			this.updatedAt = new Date();

			return false;
		}

		return true;
	}

	async getCrypto(force = false, all = false): Promise<object> {
		if (force) await this.fetchCoins();

		const assets = await this.getAssets();

		let limitedCoins: Coin[] = this.coins;
		if (!all) limitedCoins = this.coins.slice(
			(this.filterSettings.page - 1) * this.filterSettings.perPage,
			this.filterSettings.page * this.filterSettings.perPage
		);

		limitedCoins = limitedCoins.sort((c1, c2) => c1.market.rank - c2.market.rank);

		return {
			serviceEnabled: await this.isServiceEnabled(),
			coins: limitedCoins,
			assets: this.coins.filter((coin) => assets.some((asset) => asset.id === coin.asset.id)),
			perPageOptions: this.filterSettings.perPageOptions,
			pages: Array.from({
				length: Math.ceil(this.nCoins / this.filterSettings.perPage)
			}, (_, i) => i + 1),
			updatedAt: this.updatedAt.getTime(),
			enabled: this.enabled,
			error: this.error
		};
	}

	async fetchCoins(): Promise<void> {
		if (!(await this.checkServiceStatus())) return;

		const assets = await this.getAssets();

		const params = {
			"vs_currency": "usd",
			"order": "market_cap_desc",
			"per_page": this.nCoins.toString(),
			"page": "1",
			"sparkline": "true",
			"price_change_percentage": "1h,24h,7d"
		};

		this.apiURL.search = new URLSearchParams(params).toString();

		const req = await fetch(this.apiURL.toString());
		const resp = await req.json();

		if (req.status === 200) {
			this.coins = resp
				.map((market: MarketResponseObj): Coin => {
					let asset = assets.find((asset) => asset.id === market.id);
					const isFavorite = !!asset;

					if (!asset) {
						asset = new Asset();
						asset.id = market.id;
						asset.name = market.name;
						asset.symbol = market.symbol;
						asset.image = market.image;
					}

					// const svg = this.createSparkLines(
					// 	market.sparkline_in_7d.price,
					// 	market.price_change_percentage_7d_in_currency > 0 ? "#00bc8c" : "#e74c3c",
					// 	"0.5"
					// );
					// const svgPath = "/assets/img/" + asset.id + ".svg";
					// fs.writeFile(path.join(__dirname, "/.."+ svgPath), svg, (err) => {
					// 	if (err) this.log.error("CryptoService", JSON.stringify(err));
					// });

					return {
						asset: asset,
						isFavorite: isFavorite,
						market: {
							rank: market.market_cap_rank,
							marketCap: market.market_cap,
							price: market.current_price,
							high24h: market.high_24h,
							low24h: market.low_24h,
							volume: market.total_volume,
							change1hPercentage: market.price_change_percentage_1h_in_currency,
							change24h: market.price_change_24h,
							change24hPercentage: market.price_change_percentage_24h,
							change7dPercentage: market.price_change_percentage_7d_in_currency,
						},
						// svg: svgPath
					};
				});

			this.enabled = true;
			this.error = '';
			this.updatedAt = new Date();

		} else {
			this.enabled = false;
			this.error = resp.error || `Unknown error occurred (${req.status})`;
			this.log.error("CryptoService", `Error fetching coins (${this.error})`);
		}
	}

	getCoins(): Coin[] {
		return this.coins;
	}

	async getAssets(): Promise<Asset[]> {
		return await this.repository.find();
	}

	async getAsset(id: string): Promise<Asset> {
		const asset = await this.repository.findOne({
			id
		});

		this.log.info(JSON.stringify(asset));

		return asset;
	}

	async addAsset(id: string): Promise<Asset> {
		this.log.info('trying to add asset');

		const coin = this.coins.find((c) => c.asset.id === id);
		this.log.info(JSON.stringify(coin));
		if (!coin) return undefined;

		const asset = await this.repository.save(coin.asset);
		if (asset) this.emit<object>("crypto update", await this.getCrypto(true));

		return asset;
	}

	async deleteAsset(id: string): Promise<boolean> {
		this.log.info('trying to delete asset');
		const asset = await this.getAsset(id);
		if (!asset) return true;

		const deleted = !!(await this.repository.delete(asset));
		if (deleted) this.emit<object>("crypto update", await this.getCrypto(true));

		return deleted;
	}

	createSparkLines(data: number[], strokeColor: string, opacity: string): string {
		const yMin = Math.min(...data);
		const yMax = Math.max(...data);
		const range = yMax - yMin;
		const width = 250;
		const height = 50;
		const spacing = width / (data.length - 1);
		const pixelsPerUnit = height / range;
		let x = 0;
		let y1 = 0;
		let y2 = 0;

		const lines: string[] = [];
		for(let i = 0, l = data.length - 1; i < l; i++) {
			y1 = height - ((data[i] - yMin) * pixelsPerUnit);
			y2 = height - ((data[i+1] - yMin) * pixelsPerUnit);
			lines.push(`<line x1="${x}" y1="${y1}" x2="${x + spacing}" y2="${y2}" stroke="${strokeColor}" opacity="${opacity}" stroke-width="2"></line>`);
			x += spacing;
		}

		return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" loading="lazy">` +
				lines.join('/n') +
			`</svg>`;
	}
}