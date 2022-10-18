import { Container } from 'typedi';
import { Delete, Get, JsonController, Param, Post } from 'routing-controllers';
import { CryptoService } from '../services/CryptoService';
import { Asset } from '../models/Asset';
import { LoggerService } from '../services/LoggerService';

@JsonController("/api/crypto")
export class CryptoController {
	log = Container.get(LoggerService);
	cryptoService = Container.get(CryptoService);

	@Get("/")
	async getCrypto(): Promise<object> {
		return await this.cryptoService.getCrypto();
	}

	@Get("/coins")
	getCoins(): object {
		return this.cryptoService.getCoins();
	}

	@Get("/assets")
	async getAssets(): Promise<object> {
		return await this.cryptoService.getAssets();
	}

	@Post("/assets/:id")
	async addAsset(@Param("id") id: string): Promise<Asset> {
		this.log.info(id);
		return await this.cryptoService.addAsset(id);
	}

	@Delete("/assets/:id")
	async deleteAsset(@Param("id") id: string): Promise<boolean> {
		this.log.info(id);
		return await this.cryptoService.deleteAsset(id);
	}
}
