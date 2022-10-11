import { Address } from "../models/Address";
import { TrainStation } from "../models/TrainStation";

export type MRoute = {
    origin: {
        name: string;
        address: string;
        location: LatLong;
    };
    destination: {
        name: string;
        address: string;
        location: LatLong;
    };
    distance: {
        text: string;
        value: number;
    };
    duration: {
        text: string;
        value: number;
    };
    traffic: {
        text: string;
        value: number;
    };
}

export type TrainTransfer = {
    origin: {
        name: string;
        planned: {
            dateTime: Date;
            time: string;
            platform: string;
        };
        actual: {
            dateTime: Date;
            time: string;
            platform: string;
        };
        delay: number;
    };
    destination: {
        name: string;
        planned: {
            dateTime: Date;
            time: string;
            platform: string;
        };
        actual: {
            dateTime: Date;
            time: string;
            platform: string;
        };
        delay: number;
    };
    direction: string;
    trainOperator: string;
    trainType: string;
    trainTypeShort: string;
    trainTypeColor: string;
    cancelled: boolean;
    maintenance: boolean;
    maintenanceAt: TrainTransferMessageResponseObj[];
}

export type TRoute = {
    id: string;
    departure: {
        plannedDateTime: Date;
        plannedTime: string;
        actualDateTime: Date;
        actualTime: string;
        delay: number;
    };
    arrival: {
        plannedDateTime: Date;
        plannedTime: string;
        actualDateTime: Date;
        actualTime: string;
        delay: number;
    };
    duration: {
        plannedDateTime: number;
        plannedTime: string;
        actualDateTime: number;
        actualTime: string;
    };
    delayed: boolean;
    delayInMinutes: number;
    cancelled: boolean;
    maintenance: boolean;
    crowdForecast: string;
    nTransfers: number;
    transfers: TrainTransfer[];
}

export type TrainTripResponseObj = {
    plannedDurationInMinutes: number;
    actualDurationInMinutes: number;
    status: string;
    crowdForecast: string;
    transfers: number;
    legs: TrainTransferResponseObj[];
};

export type TrainTransferResponseObj = {
    origin: {
        name: string;
        plannedDateTime: number;
        actualDateTime: number;
        plannedTrack: string;
        actualTrack: string;
    };
    destination: {
        name: string;
        plannedDateTime: number;
        actualDateTime: number;
        plannedTrack: string;
        actualTrack: string;
    };
    product: {
        operatorName: string;
        longCategoryName: string;
        shortCategoryName: string;
    };
    direction: string;
    cancelled: boolean;
    messages: TrainTransferMessageResponseObj[];
};

export type TrainTransferMessageResponseObj = {
    text: string;
    type: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
}

export type Route = {
    id: string;
    name: string;
    type: string;
    origin?: Address | TrainStation;
    destination?: Address | TrainStation;
    routes: MRoute[] | TRoute[];
}

export type LatLong = {
    lat: number;
    lon: number;
}

export type OriginDestination = {
    origin: Address | TrainStation;
    destination: Address | TrainStation;
}

export type NSStation = {
    name: string;
    code: string;
    uicCode: string;
}

export type NSStationResponseObj = {
    namen: {
        lang: string;
    };
    code: string;
    UICCode: string;
}
