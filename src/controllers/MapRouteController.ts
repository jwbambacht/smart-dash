import { Container } from "typedi";
import { BadRequestError, Body, Delete, Get, JsonController, Param, Post, Put } from "routing-controllers";
import { IsNotEmpty, IsString } from "class-validator";
import { LoggerService } from "../services/LoggerService";
import { MapService } from "../services/MapService";
import { MapRouteService } from "../services/MapRouteService";
import { AddressService } from "../services/AddressService";
import { MapRoute } from "../models/MapRoute";

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

@JsonController("/api/maproutes")
export class MapRouteController {
    log = Container.get(LoggerService);
    addressService = Container.get(AddressService);
    mapRouteService = Container.get(MapRouteService);
    mapService = Container.get(MapService);

    @Get("/")
    async getMapRoutes(): Promise<MapRoute[]> {
        return await this.mapRouteService.findAll();
    }

    @Get("/:id")
    async getMapRoute(@Param("id") id: string): Promise<MapRoute> {
        return await this.mapRouteService.findByID(id);
    }

    @Post("/")
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

    @Put("/:id")
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

    @Delete("/:id")
    async deleteMapRoute(@Param("id") id: string): Promise<string> {
        await this.mapRouteService.delete(id);

        await this.mapService.init("map routes");

        return "OK";
    }
}
