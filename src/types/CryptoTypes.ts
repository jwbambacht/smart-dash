import { Asset } from '../models/Asset';

export type Coin = {
	asset: Asset;
	market?: Market;
	isFavorite: boolean;
};

export type Market = {
	rank: number;
	marketCap: number;
	price: number;
	high24h: number;
	low24h: number;
	volume: number;
	change1hPercentage: number;
	change24h: number;
	change24hPercentage: number;
	change7dPercentage: number;
}

export type MarketResponseObj = {
	"id": string;
	"symbol": string;
	"name": string;
	"image": string;
	"current_price": number;
	"market_cap": number;
	"market_cap_rank": number;
	"total_volume": number;
	"high_24h": number;
	"low_24h": number;
	"price_change_24h": number;
	"price_change_percentage_24h": number;
	"market_cap_change_24h": number;
	"market_cap_change_percentage_24h": number;
	"price_change_percentage_1h_in_currency": number;
	"price_change_percentage_24h_in_currency": number;
	"price_change_percentage_7d_in_currency": number;
};
