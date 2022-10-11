# Custom Smart Home Dashboard (NodeJS + TypeScript)
A Smart Home Dashboard that is designed to display data and information in the browser of any device. An alternative to solutions like [Home Assistant](https://github.com/home-assistant/core) to let the client completely customize layouts and easily create services/integrations themselves in JavaScript/TypeScript. The features of the application can be integrated in a modular manner with/without dependencies to other features or services.

The NodeJS backend makes use of modern JavaScript/TypeScript functionalities. The frontend is designed to work with older JavaScript browsers as well (ECMA2016+). Therefore, devices as old tablets are perfectly able to run the application as well. If support for older browsers is not an issue, modern syntax or even using frontend frameworks like [React](https://github.com/facebook/react) or [Angular](https://github.com/angular/angular) should be no problem.

WebSockets have been integrated using the [sockets.io](https://github.com/socketio/socket.io) lirbary with the goal to decrease the number of unnecessary HTTP requests between the client and the server. When the client navigates to a certain page it emits a message to the server to notify the services that a client wants to be updated periodically. When the client leaves the page, this subscription ends and the data will not be fetched periodically anymore until a client subscribes again. This mechanism prevents the server from fetching an unnecessary amount of data from public APIs, therefore limiting the load on both the server and the number of API requests.

### Key Features:
* Full-stack unauthenticated application in NodeJS/TypeScript using the Express web application framework
* Server-side rendering using the EJS templating engine and Bootstrap for responsive layouts
* HTTPS server support using SSL certificates
* WebSockets for direct communication between backend and frontend
* typeORM for managing the database interactions to PostgreSQL
* typedi for services as Singleton-like classes in containers
* Routing-controllers for REST routes in Express
* DotEnv for system configuration in the `.env` file
* class-transformer and class-validator to transform and validate class instantiations from plain JSON objects
* Winston for multiple level logging
* eslint as linter for JavaScript and TypeScript

### Integrations
* Weather forecasting using [OpenWeatherMap API](https://openweathermap.org) and rain expectation using [Buienradar.nl](https://www.buienradar.nl/overbuienradar/gratis-weerdata)
* [Spotify](https://developer.spotify.com/documentation/web-api/) playback to a local device and browse media from logged-in user
* Traffic route estimation using [NS API](https://apiportal.ns.nl) and [GoogleMaps API](https://mapsplatform.google.com)
* Home automation control of various [KlikAanKlikUit (KaKu)](https://klikaanklikuit.nl) switches, dimmers, or coloring devices
    * Energy usage/production monitoring using KaKu ICS-2000 and Smart Meter (P1 port)
* Calendars and events browsing
* Tasks/Todo list

## Application Setup
### Installation instructions
1. Clone repo
2. Install `node` and `npm` (and possibly other package managers like `yarn`)
3. Install PostgreSQL manually or using `docker-compose.yml`. If using docker, adjust the user, password, and database name inside the YAML file to your preference. After starting postgres, create the database in PostgreSQL using the command-line or adjust the settings inside the `tools/start-db.sh` executable and run `npm run db`.
4. Rename `.env.example` to `.env` and adjust the settings for the application, postgres, or API urls
5. Run `npm install` to install all dependencies. In case there are some issues, run `npm install --force` instead. Then, you have to patch the modules defined inside the `patch` directory using `npm run install:patch`.
6. Run `npm run dev` to build and start the application with active file monitoring using `nodemon`

### Environment variables
Most environment variables are required to execute the application. To enable HTTPS you have to place the `key` and `certificate` files inside the `SSL_CERT_SRC_DIR` folder and edit the `SSL_KEY` and `SSL_CERT` variables to match the file names. The server will automatically try to find and use the files, and setup an HTTPS or HTTP based on the outcome.

| VARIABLE NAME  | VARIABLE VALUE | TYPE | DEFAULT VALUE | 
| :------------- |:-------------- |:-----|:--------------|
| IP | IP address of the server | string | localhost |
| PORT | preferred port | number | 3002 |
| WEBSITE_TITLE | title of the application | string | ### DASH ### |
| SSL_CERT_SRC_DIR | directory of the SSL key/certificate | string | src |
| SSL_KEY | SSL key file name | string | key.pem |
| SSL_CERT | SSL certificate file name | string | cert.pem |
| TYPEORM_HOST | Host for the Postgres database | string | localhost |
| TYPEORM_USERNAME | Database username | string | myusername |
| TYPEORM_PASSWORD | Database password | string | mypassword | 
| TYPEORM_DATABASE | Database name | string | nodets_dash_dev |
| TYPEORM_PORT | Database port | number | 5432 |
| TYPEORM_SYNCHRONIZE | Sync entity with the database upon application execution | boolean | true |
| TYPEORM_LOGGING | Database logging [options](https://orkhan.gitbook.io/typeorm/docs/logging) | boolean, string, string[], Logger | true |
| NS_TRIPS_URL | NS API Trips url | string | https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips |
| SPOTIFY_TOKEN_URL | Spotify API Token url | string | https://accounts.spotify.com/api/token |
| SPOTIFY_PLAYER_URL | Spotify API Player url | string | https://api.spotify.com/v1/me/player/ |
| GOOGLE_DISTANCE_URL | Google API Distance url | string | https://maps.googleapis.com/maps/api/distancematrix/json |
| GOOGLE_GEOCODE_URL | Google API Geocode url | string | https://maps.googleapis.com/maps/api/geocode/json |
| WEATHER_LOCATION_URL | Location url based on external IP address | string | http://ip-api.com/json/ |
| WEATHER_FORECAST_URL | OpenWeatherMap API url | string | https://api.openweathermap.org/data/2.5/onecall |
| WEATHER_RAIN_URL | Buienradar url | string | https://gpsgadget.buienradar.nl/data/raintext/ |
| KAKU_ACCOUNT_URL | KlikAanKlikUit API Account url | string | https://trustsmartcloud2.com/ics2000_api/account.php |
| KAKU_GATEWAY_URL | KlikAanKlikUit API Gateway url (if local HTTP requests, put `./tools/gateway.php` on some server to bypass CORS issue) | string | https://trustsmartcloud2.com/ics2000_api/gateway.php or `./tools/gateway.php` in repo |
| KAKU_ENTITY_URL | KlikAanKlikUit API Entity url | string | https://trustsmartcloud2.com/ics2000_api/entity.php |
| KAKU_P1_URL | KlikAanKlikUit API Energy url | string | https://trustsmartcloud2.com/ics2000_api/p1.php |

### Scripts
The following scripts can run using `npm run ${script}` except `npm start` which reserved by `npm`.

| SCRIPT NAME  | DESCRIPTION | 
| :------------- |:-------------- |
| `clean` | removes the `/dist` directory |
| `copy-assets` | copies static folders/files to the `/dist` directory as defined in `/tools/copyAssets.ts` |
| `lint` | lints and fixed all `.js` and `.ts` files |
| `tsc` | runs the typescript compiler |
| `db` | create/start the Postgres database script as defined in `/tools/start-db.sh` |
| `browserify` | bundles and converts the frontend scripts, including modules |
| `build` | build the application by cleaning, copying assets, linting, compiling, bundling scripts |
| `dev:start` | builds and starts the application |
| `dev` | nodemon that watches changes `.ts`, `.ejs`, `.css` files in `/src` and rebuilds and starts the application |
| `start` | starts the application using `forever` |
| `force-install` | force install all modules with `npm` |
| `patch` | patches modules as defined in the `/patches` directory |
| `install:patch` | executes both `force-install` and `patch` |

### Database


## Application Structure
The `index.ts` file contains imports and definitions to start the server, connect to the database and initialize to the services.
### Models & Repositories
The models describe and handle the objects with the database. TypeORM makes sure the TypeScript models are automatically adjusted in the database during initialization. Each model, as defined in the `expressLoader.ts` file, is added to the database using `typeORM`.

The repositories allow you to conveniently handle the communication with the database using Object-Relational Mapping. To create such a repository, create a new file called `ModelRepository.ts` inside the repositories directly and define the model to the type of the repo. The created repo must extends the `Repository<Model>` class to include basic entity functionalities as create, update or delete. You can additionally provide your own entity methods if required.

```typescript
@EntityRepository(Model)
export class ModelRepository extends Repository<Model> {
    ...
}
```

### Services
Services are the base for the functionalies of the dashboard and represent features consisting of static/dynamic functionalities with/without data from the database and/or API requests. Services are containerized such that these services are represented as Singleton instances that are available application-wide using `Container.get(NameService)` in any backend TypeScript file.

As the application is modular, new services can easily be created and integrated. A service can extend the `BaseService` class that includes integration for for example sockets. When the service should only handle ORM functionalities it must include the repository import the corresponding respoitory file in the constructor using `constructor(@OrmRepository() private modelRepository: ModelRepository) {}`. To create a service execute the following steps.

1. Create a file `NameService.ts` inside the `services` directory
2. Initialize the service in the `index.ts` file using `Container.get(NameService)`
3. Inside the service define the class service using the service decorator. In the constructor define the code that is executed once on initialization.

```typescript
@Service()                                  @Service()
export class NameService {                  export class NameService extends BaseService {
    constructor() {                             constructor() {
        ...                                         super("NameService");
    }                                               ...
}                                               }
                                            }
```

4. If extending the `BaseService`, you can choose to communicate with clients through sockets. The `BaseService` automatically registers the service to the `SocketService` that handles the setup of the sockets and actions like emitting and listening for messages between server and client. In you custom service you therefore have to extend the `init` and `activate` methods from the `BaseService` to add your own functionality.
* The `init` method contains the code that is executed everytime the client announces itself to the service, e.g. enables periodic data fetching.
* The `activate` method contains the code that is executed everytime the client acknowledges receipt of the previous emitted data/information by the server. It is therefore perfectly suited to let the corresponding service know that a client is still interested to keep updating and receiving the data. Instead of periodically fetching data from public APIs, the service is able to temporarily stop fetching the data while there is no client currently expecting or listening to this data.
* The client JavaScript code must contain the code to receive and emit messages from/to the server. Upon the page load the client emits the `init` message to the server with data that consists out of the service name and a message identifier that can be recognized by the server. When the client receives a message from the server it firstly acknowledges it by emitting an `activate` message and secondly do something with the received data.

```typescript
socket.emit("init", { service: "NameService", type: "message emit id..."});

socket.on("message receive id...", function (data: object) {
    socket.emit("activate", { service: "NameService", type: "message emit id..."});

    ... // do something with the received data
});
```

#### Integrated Services

| SERVICE  | SERVICE TYPE | DESCRIPTION | 
| :--------|:-----|:------------|
| `AddressService.ts` | Database | ORM of the `Address` model that belongs with the `MapService` and used in `MapRoute` objects | 
| `CalendarService` | BaseService, Database | stores calendars in database and fetches events from these calendar URLs | 
| `DevicesService.ts` | BaseService, API, Socket | fetches KaKu devices/energy from API, sends device commands to local hub/API, send data to clients through sockets | 
| `EnergyService.ts` | Database | ORM of the `Energy` model that is fetched in the `DevicesService` | 
| `LoggerService.ts` | App Service | enables logging using `winston` | 
| `MapRouteService.ts` | Database | ORM of the `MapRoute` model that belongs with the `MapService`, defines inter-`Address` routes | 
| `MapService.ts` | BaseService, API, Socket | fetches routes distances/duration for the `MapRoute` objects using Google DistanceMatrix API, converts an address string to a geolocation using Google Geocode API | 
| `NSService.ts` | BaseService, API, Socket | fetches `TrainStations` and `TrainRoutes` from the NS API using | 
| `SettingService.ts` | Database | ORM of the `Setting` model that stores API keys and login data, service enable state, and service specific data | 
| `SocketService.ts` | App Service | setups the socket connections, endpoint for receiving and sending messages | 
| `SpotifyService.ts` | BaseService, API, Socket | connects to Spotify API, controls user playback, set `IP` in `.env` to redirect back to the dashboard after logging into Spotify. In [Spotify API console](https://developer.spotify.com/dashboard/applications) create a new application, generate client ID and Secret, set redirect URL to dashboard endpoint (https://IP:PORT/spotify/callback) | 
| `TaskService.ts` | BaseService, Database, Socket | ORM of the `Task` model, creates and modifies tasks | 
| `TrainRouteService.ts` | Database | ORM of the `TrainRoute` model that is used in the `NSService`, defines inter-`TrainStation` routes | 
| `TrainStationService.ts` | Database | ORM of the `TrainStation` model that belongs with the `NSService` and used in `TrainRouteService` | 
| `WeatherService.ts` | BaseService, API, Socket | fetches the weather forecast from the OpenWeatherMap API and short-term rain forecast from BuienRadar based on location of server | 

### Controllers
The controllers define the routes inside the application for the pages and API. The frontend routes are defined in `RouteController` and contain routes that are conveniently composed using decorators with the `routing-controllers` module. The return object contains all the data that is required in the view template. Most routes render the `index.ejs` view template in which the requested subviews are included. Therefore it is required to include the name of the page that should be rendered in the return object.

We also use the `@JsonController()` that acts as an API instead. The `WidgetController` contains all API routes and methods, but it could be further separated into multiple controllers if wanted.

### Events
The event script define the JavaScript functionality for the frontend pages. These scripts are compiled, bundled and placed in the `dist/events` directory. To not execute the JavaScript code before the entire page has been loaded we have added an event listener for the `DOMContentLoaded` event. Unfortunately, the script currently does not use event delegation. This should increase the performance of the application as less event listeners have to be added and re-added after the DOM has been updated with new data. The frontend script must connect and reconnect to sockets before it is able to emit and receive messages. These listeners can be defined when the page hasn't been loaded yet.

```typescript
const io = require("socket.io-client");

const socket = io();

socket.on("connect", function () {
    console.log("Connected to server with id: ", socket.id);
});

socket.on("disconnect", function (reason: string) {
    console.log("Disconnected from server and reconnecting: ", reason);
    socket.connect();
});

function ...() {}

function ...() {}

function onPageLoad(): void {
    // do something when the page has been loaded
    ...
}

document.addEventListener("DOMContentLoaded", onPageLoad);
```

This application is build to support older browsers (ECMA2016+), and therefore arrow functions and other modern functionalities cannot be used. If you don't care about older browsers you could use modern JavaScript syntax and functionalities.

### Views
The fronted views are defined in the `views` directory. The `index.ejs` acts as entrypoint for all pages. It defines the basic page structure and inserts partial files like the `head` and `nav`, and the dynamic templates based on the current page. The `pages` directory contains the templates of the individual pages that are inserted in the `index.ejs` file. The `widgets` directory contains all templates that are inserted an re-used in other page or widget templates. These templates are also fetched and rendered in the DOM in the frontend scripts.

| DIRECTORY  | DESCRIPTION | 
| :------------- |:-------------- |
| `views/` | contains `index.ejs` and all template files in the subfolders, copied to the `dist` directory after build |
| `views/partials` | contains partial template files to be included in the general layout (`head`, `nav`, `footer`, ...) |
| `views/pages` | contains the page template files |
| `views/widgets` | contains small element template files |
