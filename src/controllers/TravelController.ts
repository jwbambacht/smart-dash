import { BadRequestError, Body, Delete, Get, JsonController, Param, Post, Put } from 'routing-controllers';
import { Container } from 'typedi';
import { IsNotEmpty, IsString } from 'class-validator';
import { MapService } from '../services/MapService';
import { AddressService } from '../services/AddressService';
import { MapRouteService } from '../services/MapRouteService';
import { NSService } from '../services/NSService';
import { TrainStationService } from '../services/TrainStationService';
import { TrainRouteService } from '../services/TrainRouteService';
import { Address } from '../models/Address';
import { MapRoute } from '../models/MapRoute';
import { TrainStation } from '../models/TrainStation';
import { TrainRoute } from '../models/TrainRoute';
import { LatLong } from '../types/TravelTypes';

class TrainRouteRequest {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	origin: string;

	@IsString()
	@IsNotEmpty()
	destination: string;
}

class AddressRequest {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	address: string;
}

class MapRouteRequest {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	origin: string;

	@IsString()
	@IsNotEmpty()
	destination: string;
}

@JsonController("/api/travel")
export class TravelController {
	mapService = Container.get(MapService);
	nsService = Container.get(NSService);
	trainStationService = Container.get(TrainStationService);
	trainRouteService = Container.get(TrainRouteService);
	addressService = Container.get(AddressService);
	mapRouteService = Container.get(MapRouteService);

	/**
	 * TRAINSTATIONS
	 */
	@Get("/trainstations")
	async getTrainStations(): Promise<TrainStation[]> {
		return await this.trainStationService.findAll();
	}

	@Get("/trainstations/:id")
	async getTrainStation(@Param("id") id: string): Promise<TrainStation> {
		return await this.trainStationService.findByID(id);
	}

	@Post("/trainstations")
	async addTrainStation(@Body() body: {stationCode: string}): Promise<TrainStation> {

		if (await this.trainStationService.findByCode(body.stationCode) !== undefined) throw new BadRequestError(`Station with code ${body.stationCode} is already added`);

		const station = ((await this.nsService.getStations()).find((station: { code: string }) => station.code === body.stationCode));
		if (station === undefined) throw new BadRequestError(`Station with code ${body.stationCode} is not found`);

		const trainStation = new TrainStation();
		trainStation.name = station.name;
		trainStation.stationCode = station.code;

		const newTrainStation = await this.trainStationService.create(trainStation);
		if (newTrainStation === undefined) throw new BadRequestError("Failed to save train station");

		return newTrainStation;
	}

	@Delete("/trainstations/:id")
	async deleteTrainStation(@Param("id") id: string): Promise<string> {
		const trainStation = await this.trainStationService.findByID(id);

		if (trainStation !== undefined) {
			const originRoutes = await this.trainRouteService.findByOrigin(trainStation);
			const destinationRoutes = await this.trainRouteService.findByDestination(trainStation);

			if (originRoutes !== undefined || destinationRoutes !== undefined) throw new BadRequestError(`Cannot remove train station because it's in use by a train route`);
		}

		await this.trainStationService.delete(id);
		return "OK";
	}

	/**
	 * TRAINROUTES
	 */
	@Get("/trainroutes")
	async getTrainRoutes(): Promise<TrainRoute[]> {
		return await this.trainRouteService.findAll();
	}

	@Get("/trainroutes/:id")
	async getTrainRoute(@Param("id") id: string): Promise<TrainRoute> {
		return await this.trainRouteService.findByID(id);
	}

	@Post("/trainroutes")
	async addTrainRoute(@Body() body: TrainRouteRequest): Promise<TrainRoute> {
		const origin = await this.trainStationService.findByID(body.origin);
		const destination = await this.trainStationService.findByID(body.destination);

		if (origin === undefined) throw new BadRequestError("Invalid origin station");
		if (destination === undefined) throw new BadRequestError("Invalid destination station");
		if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

		if (await this.trainRouteService.findByOriginAndDestination(origin, destination) !== undefined) throw new BadRequestError("Train route is already defined");

		const trainRoute = new TrainRoute();
		trainRoute.name = body.name;
		trainRoute.origin = origin;
		trainRoute.destination = destination;

		const newTrainRoute = await this.trainRouteService.create(trainRoute);
		if (newTrainRoute === undefined) throw new Error("Failed to save train route");

		await this.nsService.init("ns trips");

		return newTrainRoute;
	}

	@Put("/trainroutes/:id")
	async updateTrainRoute(@Body() body: TrainRouteRequest, @Param("id") id: string): Promise<TrainRoute> {
		const trainRoute = await this.trainRouteService.findByID(id);

		if (trainRoute === undefined) throw new BadRequestError("Train route not found");

		const origin = await this.trainStationService.findByID(body.origin);
		const destination = await this.trainStationService.findByID(body.destination);

		if (origin === undefined) throw new BadRequestError("Invalid origin station");
		if (destination === undefined) throw new BadRequestError("Invalid destination station");
		if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

		const trainRouteExists = await this.trainRouteService.findByOriginAndDestination(origin, destination);
		if (trainRouteExists !== undefined && trainRouteExists.id !== trainRoute.id) throw new BadRequestError("Train route is already defined");

		trainRoute.name = body.name;
		trainRoute.origin = origin;
		trainRoute.destination = destination;

		const updatedTrainRoute = await this.trainRouteService.update(trainRoute);
		if (updatedTrainRoute === undefined) throw new Error("Failed to update train route");

		await this.nsService.init("ns trips");

		return updatedTrainRoute;
	}

	@Delete("/trainroutes/:id")
	async deleteTrainRoute(@Param("id") id: string): Promise<string> {
		await this.trainRouteService.delete(id);
		return "OK";
	}

	/**
	 * ADDRESSES
	 */
	@Get("/addresses")
	async getAddresses(): Promise<Address[]> {
		return await this.addressService.findAll();
	}

	@Get("/addresses/:id")
	async getAddress(@Param("id") id: string): Promise<Address> {
		return await this.addressService.findByID(id);
	}

	@Post("/addresses")
	async addAddress(@Body() body: AddressRequest): Promise<Address> {
		if (await this.addressService.findByAddress(body.address) !== undefined) throw new BadRequestError("Address already exists");

		const address = new Address();
		address.name = body.name;
		address.address = body.address;

		const geoLocation: LatLong = await this.mapService.addressToLocation(body.address);
		if (typeof geoLocation === "object" && "lat" in geoLocation && "lon" in geoLocation) {
			address.lat = geoLocation.lat;
			address.lon = geoLocation.lon;

			const newAddress = await this.addressService.create(address);
			if (newAddress === undefined) throw new Error("Failed to save address");

			await this.mapService.init("map routes");

			return newAddress;
		}

		throw new Error("Failed to fetch geolocation for the address");
	}

	@Put("/addresses/:id")
	async updateAddress(@Body() body: AddressRequest, @Param("id") id: string): Promise<Address> {
		const address = await this.addressService.findByID(id);
		if (address === undefined) throw new BadRequestError("Address not found");

		address.name = body.name;

		if (address.address !== body.address) {
			const geoLocation: LatLong = await this.mapService.addressToLocation(body.address);
			if (typeof geoLocation === "object" && "lat" in geoLocation && "lon" in geoLocation) {
				address.lat = geoLocation.lat;
				address.lon = geoLocation.lon;
			}
		}

		address.address = body.address;

		const updatedAddress = await this.addressService.update(address);
		if (updatedAddress === undefined) throw new Error("Failed to update address");

		await this.mapService.init("map routes");

		return updatedAddress;
	}

	@Delete("/addresses/:id")
	async deleteAddress(@Param("id") id: string): Promise<string> {
		const address = await this.addressService.findByID(id);

		if (address !== undefined) {
			const originRoutes = await this.mapRouteService.findByOrigin(address);
			const destinationRoutes = await this.mapRouteService.findByDestination(address);

			if (originRoutes !== undefined || destinationRoutes !== undefined) throw new BadRequestError(`Cannot remove address because it's in use by a map route`);
		}

		await this.addressService.delete(id);

		return "OK";
	}

	/**
	 * MAPROUTES
	 */
	@Get("/maproutes")
	async getMapRoutes(): Promise<MapRoute[]> {
		return await this.mapRouteService.findAll();
	}

	@Get("/maproutes/:id")
	async getMapRoute(@Param("id") id: string): Promise<MapRoute> {
		return await this.mapRouteService.findByID(id);
	}

	@Post("/maproutes")
	async addMapRoute(@Body() body: MapRouteRequest): Promise<MapRoute> {
		const origin = await this.addressService.findByID(body.origin);
		const destination = await this.addressService.findByID(body.destination);

		if (origin === undefined) throw new BadRequestError("Invalid origin address");
		if (destination === undefined) throw new BadRequestError("Invalid destination address");
		if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

		if (await this.mapRouteService.findByOriginAndDestination(origin, destination) !== undefined) throw new BadRequestError("Map route is already defined");

		const mapRoute = new MapRoute();
		mapRoute.name = body.name;
		mapRoute.origin = origin;
		mapRoute.destination = destination;

		const newMapRoute = await this.mapRouteService.create(mapRoute);
		if (newMapRoute === undefined) throw new Error("Map route couldn't be saved");

		this.mapService.init("map routes");

		return newMapRoute;
	}

	@Put("/maproutes/:id")
	async updateMapRoute(@Body() body: MapRouteRequest, @Param("id") id: string): Promise<MapRoute> {
		const mapRoute = await this.mapRouteService.findByID(id);

		if (mapRoute === undefined) throw new BadRequestError("Map route not found");

		const origin = await this.addressService.findByID(body.origin);
		const destination = await this.addressService.findByID(body.destination);

		if (origin === undefined) throw new BadRequestError("Invalid origin address");
		if (destination === undefined) throw new BadRequestError("Invalid destination address");
		if (body.origin === body.destination) throw new BadRequestError("Origin and destination cannot be equal");

		const mapRouteExists = await this.mapRouteService.findByOriginAndDestination(origin, destination);
		if (mapRouteExists !== undefined && mapRouteExists.id !== mapRoute.id) throw new BadRequestError("Map route is already defined");

		mapRoute.name = body.name;
		mapRoute.origin = origin;
		mapRoute.destination = destination;

		const updatedMapRoute = await this.mapRouteService.update(mapRoute);
		if (updatedMapRoute === undefined) throw new Error("Map route couldn't be updated");

		await this.mapService.init("map routes");

		return updatedMapRoute;
	}

	@Delete("/maproutes/:id")
	async deleteMapRoute(@Param("id") id: string): Promise<string> {
		await this.mapRouteService.delete(id);

		await this.mapService.init("map routes");

		return "OK";
	}
}
