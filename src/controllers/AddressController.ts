import { Container } from "typedi";
import { BadRequestError, Body, Delete, Get, JsonController, Param, Post, Put } from "routing-controllers";
import { IsNotEmpty, IsString } from "class-validator";
import { LoggerService } from "../services/LoggerService";
import { AddressService } from "../services/AddressService";
import { MapRouteService } from "../services/MapRouteService";
import { Address } from "../models/Address";
import { LatLong } from "../types/TravelTypes";
import { MapService } from "../services/MapService";

class AddressRequest {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    address: string;
}

@JsonController("/api/addresses")
export class AddressController {
    log = Container.get(LoggerService);
    addressService = Container.get(AddressService);
    mapRouteService = Container.get(MapRouteService);
    mapService = Container.get(MapService);

    @Get("/")
    async getAddresses(): Promise<Address[]> {
        return await this.addressService.findAll();
    }

    @Get("/:id")
    async getAddress(@Param("id") id: string): Promise<Address> {
        return await this.addressService.findByID(id);
    }

    @Post("/")
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

    @Put("/:id")
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

    @Delete("/:id")
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
}
