# Custom Smart Home Dashboard (NodeJS + TypeScript)
A Smart Home Dashboard that is designed to display data and information in the browser of any device. An alternative to solutions like [Home Assistant](https://github.com/home-assistant/core) to let the client completely customize layouts and easily create any service/integration themselves in TypeScript. The features of the application can be integrated in a modular manner with/without dependencies to other features or services.

<center>
    <img src="https://user-images.githubusercontent.com/31626076/195676679-a847c984-1c6c-4aa0-9caa-133c89d5269e.gif" width="75%" height="auto" style="border: 2px solid #375a7f; border-radius: 10px;" />
</center>

The NodeJS backend makes use of modern JavaScript/TypeScript functionalities. The frontend is designed to work with older JavaScript browsers as well (ECMA2016+). Therefore, devices as old tablets are able to run the application as well. If support for older browsers is not an issue, modern syntax or even using frontend frameworks like [React](https://github.com/facebook/react) or [Angular](https://github.com/angular/angular) should be no problem. The application is unauthenticated and unidentified, meaning that every client that visits the application in the browser will see exactly the same.

WebSockets have been integrated using the [socket.io](https://github.com/socketio/socket.io) library (older version to support older browsers) with the goal to increase data freshness and to decrease the number of unnecessary HTTP requests between the client and the server. When the client navigates to a certain page it emits a message to the server to notify the services existing on that page that a client wants to be updated periodically. When the client leaves the page, this subscription ends and the data will not be fetched periodically anymore until a client subscribes again. This mechanism prevents the server from fetching an unnecessary amount of data from public APIs, therefore limiting the load on both the server and the number of API requests.

## Key Features:
* Full-stack unauthenticated application in NodeJS/TypeScript using the Express web application framework
* Server-side rendering using the EJS templating engine and Bootstrap for responsive layouts
* HTTPS server support using SSL certificates
* [socket.io](https://github.com/socketio/socket.io) for direct communication between backend and frontend
* [typeORM](https://github.com/typeorm/typeorm) for managing/synchronizing TypeScript models with PostgreSQL
* [typedi](https://github.com/typestack/typedi) handles dependency injection through decorators for services as Singleton-like classes in containers
* [routing-controllers](https://github.com/typestack/routing-controllers) to create controllers with methods as actions that handle Express requests
* [dotenv](https://github.com/motdotla/dotenv) to load environment variables (.env) into `process.env`
* [class-transformer](https://github.com/typestack/class-transformer) to transform plain objects to class instances
* [class-validator](https://github.com/typestack/class-validator) for decorator based validation
* [winston](https://github.com/winstonjs/winston) for multiple level logging
* [eslint](https://github.com/eslint/eslint) as linter for JavaScript and TypeScript

## Integrations
* [Spotify](https://developer.spotify.com/documentation/web-api/) playback to a local device and browse media for logged-in user
* Weather forecasting using [OpenWeatherMap API](https://openweathermap.org) and rain forecast using [Buienradar.nl](https://www.buienradar.nl/overbuienradar/gratis-weerdata)
* Map route estimation using [GoogleMaps API](https://mapsplatform.google.com) and train route estimation using [NS API](https://apiportal.ns.nl)
* Home automation control of various [KlikAanKlikUit (KaKu)](https://klikaanklikuit.nl) switches, dimmers, or coloring devices and energy usage/production monitoring using KaKu ICS-2000 and Smart Meter (with P1 port)
* Calendars and events browsing
* Tasks/Todo list

## Application Setup
### Installation instructions
1. Clone repo
2. Install `node` and `npm` (and possibly other package managers like `yarn`)
3. Install PostgreSQL manually or using `docker-compose.yml`. If using docker, adjust the user, password, and database name inside the YAML file. After starting postgres, create the database in PostgreSQL using the command-line or adjust the settings inside the `/tools/start-db.sh` executable and run `npm run db`.
4. Rename `.env.example` to `.env` in the root directory and adjust the settings for the application, postgres, or API urls
5. Run `npm install` to install all dependencies. In case there are some issues, run `npm install --force` or `npm install --legacy-peer-deps` instead. Then, you have to patch the modules defined inside the `/patches` directory using `npm run install:patch`.
6. Run `npm run dev` to build and start the application with active file monitoring using `nodemon`
7. To create a production version run `npm run build`, copy all files to the hosting provider or server (including `.env`), and run `npm start` or `forever .` inside the root directory

### Environment variables
Most environment variables are required to execute the application. To enable HTTPS you have to place the `key` and `certificate` files inside the `SSL_CERT_SRC_DIR` folder and edit the `SSL_KEY` and `SSL_CERT` variables to match the file names. The server will automatically try to find and use the files, and setup an HTTPS or HTTP based on the outcome.

| VARIABLE NAME  | VARIABLE VALUE | TYPE | DEFAULT VALUE | 
| :------------- |:-------------- |:-----|:--------------|
| IP | IP address of the server | string | |
| PORT | preferred port | number | 3002 |
| WEBSITE_TITLE | title of the application | string | ### DASH ### |
| SSL_CERT_SRC_DIR | directory of the SSL key/certificate | string | src |
| SSL_KEY | SSL key file name | string | key.pem |
| SSL_CERT | SSL certificate file name | string | cert.pem |
| TYPEORM_HOST | Host for the Postgres database | string | localhost |
| TYPEORM_USERNAME | Database username | string | |
| TYPEORM_PASSWORD | Database password | string | | 
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

## Application Structure
The `index.ts` file contains imports and definitions to start the server, connect to the database and initialize to the services.

### Loaders <span style='float: right;'>`/loaders`</span>
The loaders are used to add and setup functionality to the server and application. This application uses three such loaders. The first loader `typeORMLoader` makes the connection with the database using `typeORM`. It connects to the database and synchronizes all TypeScript models with the PostgresQL database entities. After this, it automatically seeds the database with some predefined settings (if missing) as defined in the same file that are deemed required by the application or services.

Another loader `expressLoader` sets the `Express` server up with all controllers, middleware, HTTPS/HTTP, sockets, and listens for incoming requests.

The third loader `serviceLoader` makes sure that all services that require initializion, i.e. must be constructed before it is usable, are available inside a `typedi Container`. Every service that must explicitly be initialized must be defined inside this loader using `Container.get(...)`.

### Middleware <span style='float: right;'>`/middlewares`</span>
The middleware functions add functionality to the Express server before a request is sent or after a response is received. The application only uses a middleware that is fired after receipt of a response to handle errors.

### Models <span style='float: right;'>`/models` & `/repositories`</span>
The models describe and handle the entities with the database. TypeORM makes sure the TypeScript models are automatically adjusted in the database during initialization when the `synchronize` property is set to true in the `/loaders/typeORMLoader.ts` file. Each model, as defined in the `expressLoader.ts` file, is added to and synchronized with the database using typeORM.

### Services <span style='float: right;'>`/services`</span>
Services are the base for the functionalies of the dashboard and represent features consisting of static/dynamic functionalities with/without data from the database and/or API requests. Services are containerized such that these services are represented as Singleton instances that are available application-wide using `Container.get(NameService)` in any backend TypeScript file.

If a service wants to communicate with the database it can use a repository. These repositories allow you to conveniently handle the communication with the database using Object-Relational Mapping. A repository must be injected into a service to be able to use the built-in functions like find, save, or delete of the `Repository`. You can also choose to define your own repository in a separate file that allows you to extend the default functionality with your own.

```typescript
@Service()
export class SettingService {
    @InjectRepository(Setting)
    private repository: Repository<Setting>;
    
    ...
}
```

As the application is modular, new services can easily be created and integrated. A service can extend the `BaseService` class that includes integration for for example sockets. When the service should only handle ORM functionalities it must include the repository import the corresponding respoitory file in the constructor using `constructor(@OrmRepository() private modelRepository: ModelRepository) {}`. To create a service execute the following steps.

1. Create a file `NameService.ts` inside the `services` directory
2. Initialize the service in the `/loaders/serviceLoader.ts` file by adding `Container.get(NameService)` to the `initializeServices` method
3. Inside the service define the class with the service decorator. In the constructor define the code that is executed once on initialization

```typescript
@Service()                                  @Service()
export class NameService {                  export class NameService extends BaseService {
    constructor() {                             constructor() {
        ...                                         super("NameService");
    }                                               ...
}                                               }
                                            }
```

4. By extending the `BaseService`, you can choose to communicate with clients through sockets and get access to some reusable methods. The `BaseService` automatically registers the service to the `SocketService` that handles the setup of the sockets and actions like emitting and listening for messages between server and client. In your custom service you therefore have to extend the `init` and `activate` methods from the `BaseService` to add your own functionality.
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

5. If you want to communicate with the database using ORM you can inject the repository of the corresponding as properties. You have then access to the repository methods like `this.repository.find()` or `this.repository.save(new Calendar(...))` from the `Repository` class from `typeORM`.

```typescript
@Service()
export class CalendarService extends BaseService {
    @InjectRepository(Calendar)
    private repository: Repository<Calendar>;
    
    constructor () {
        super("CalendarService")
    }
}
```

#### Application Services (required)
The Application Services are required as it provides functionality for other services.

##### BaseService
The `BaseService` contains basic functionality with regard to the `SocketService`. Every service that extends this service will be able to communicate with clients using WebSockets. The service will register itself as a listener to the `SocketService` upon initialization. Then, the incoming messages will only be forwarded to this service when the message is designated for it. The service that extends the `SocketService` must extend the `init` and `activate` methods to add it's own logic. To send a message to a client the service can execute the `emit` method with the event name (string) and data (generic type) as arguments.

Every service can be enabled or disabled using an HTTP request from the frontend to the backend API. The `BaseService` provides a method `isServiceEnabled()` that returns the current state of the service, stored in the database. It furthermore contains methods to get or set settings in the database and a direct method to get an API key from the database as well.

The `BaseService` provides entrypoints for the `LoggerService` and `SettingService` such that childs of the `BaseService` have direct access to them as well. It can easily be extended or modified to provide default functionality for its child services.

##### SocketService
The `SocketService` setups the sockets with clients and exists out of several socket listeners. To connect with clients it listens for `connection` requests and keeps track of the currently connected clients. It will register `disconnect` events as well. Requests on the `init` and `activate` events will be forwarded to one of the registered services, if available.

##### LoggerService
The `LoggerService` enables server-side logging using the `winston` module. There are multiple levels of logging available: error, warn, info, debug, and http.

##### SettingService
The `SettingService` handles the ORM of the `Setting` model. It is used to store data that is required by the application and services. On the settings page every piece of information can be created, edited or deleted. With the default integrated services is stores:

* API keys (OpenWeatherMap API, Google API, NS API)
* Spotify client ID and secret, name of local Spotify speaker, device ID to turn speaker on/off (requires DevicesService)
* KlikAanKlikUit username and password, local IP address of ICS-2000 hub, blacklisted devices
* Integrated service states. The state of a service is implicitly enabled by default, meaning that the state of the service is not stored in the database.
* Other settings like a manual location for the `WeatherService`

On the `settings` page there is a button on the top right that restarts the server from the frontend without the command line. In some situations it may be necessary to restart the server due to changes in settings or errors.

#### Feature Services (optional)
These services define the functionality of the features. You can choose to edit or remove integrated services or to add your own service.

##### SpotifyService <span style='float: right;'>BaseService | API | Socket</span>
The `SpotifyService` communicates with the authenticated Spotify API using a client ID and secret. First you have to create an application in the [Spotify API console](https://developer.spotify.com/dashboard/applications) that will generate a client ID and secret. You also have to set the redirect URL of the application to the `/spotify/callback` endpoint of this application, e.g. `https://localhost:3002/spotify/callback`. That will make sure that the browser will redirect to this URL after it has logged in. Inside the service we have defined a set of scopes/permission that define the actions we can execute on behalf of the logged-in user. These scopes are sent along during the login request. The Spotify API returns an access token, which is required in any subsequent request to authorize the user, a refresh token to get a new access token after the previous has expired, and an expiration time of 3600 seconds. The service is then able to change playback of Spotify (play, pause, next, previous), read and play content like playlists, artists, albums, and tracks, search and like content, and set volume of device (plus/min 5% of current volume).

The service has been implemented for a Spotify-enabled RaspberryPI and an old amplifier that is controlled by a KlikAanKlikUit switch. Therefore, the service may not be working as expected for other users that use a dedicated Spotify-enabled device. Every time the user changes playback it tries to set the playback device to the Spotify device that is named as defined, and can be changed, in the `SettingService` with specification `spotify_device_name`. This is account specific and should be changed to be named equal to your own Spotify speaker name in your [Spotify API console](https://developer.spotify.com/console/get-users-available-devices/). We additionally provide an option to turn on/off the switch connected with the amplifier as defined in the `SettingService` as well, with specification `spotify_speaker_id` that equals the device ID from the `DevicesService`. It is however very likely that this option can be removed as most dedicated Spotify speakers will be on standby and not controlled using KlikAanKlikUit.

The Spotify player on the `home` and `spotify` pages will automatically update when the playback status of the Spotify speaker changes. The RaspberryPi will send an API request to the backend when it detects a change in playback. This should be modified in some way or another to make it work for your own setup.

Internally, the service is dependent on the `spotify-web-api-node` module that handles all communication with the Spotify API. The service will return its current state based on the authorization status, and will show errors when available. This service can be enabled or disabled manually using the `service` setting. When fetching of data fails it will automatically be disabled.

##### WeatherService <span style='float: right;'>BaseService | API | Socket</span>
The `WeatherService` fetches the geolocation of the server, the weather forecast from the OpenWeatherMap API for the coming seven days and the rain forecast for the coming next hours. Before the weather and rain forecast can be fetched we must have a location in terms of the latitude, longitude, and city. You can either define the location manually in the settings or fetch it from a website based on the server's IP address. The manual location must be inserted into the settings with type `weather` and specification `location` and the value is a JSON object-string consisting of the lat, lon, and city: `{ "lat": 50.000, "lon": 4.000, "city": "MyCity" }`. If this manual location could not be fetched or is not deemed to be correct, the service will automatically fallback to fetching the server's location.

Both the forecast and rain will be fetched when a location exists. The weather forecast will request the OpenWeatherAPI and then format the data in a defined format. The rain forecast will be fetched and converted to a HTML SVG element and stored as a string.

This service can be enabled or disabled manually using the `service` setting. When fetching of data fails it will automatically be disabled.

##### MapService (requires AddressService & MapRouteService) <span style='float: right;'>BaseService | API | Socket</span>
The `MapService` fetches the routes between two addresses in both directions using the Google Distance Matrix API. It will then return the reformatted data consisting of the origin, destination, distance, duration, and traffic. A route is defined by the `MapRoute` model and `Address` model. Next to fetching route information, this service also makes use of the Google Geocode API to transform an address-string to a latitude-longitude object as this information is needed to determine the origin and destination.

The frontend additionally makes use of the Google Maps API to display the route on an embedded map, including traffic.

This service can be enabled or disabled manually using the `service` setting. When fetching of data fails it will automatically be disabled.

###### AddressService (required for MapService) <span style='float: right;'>Database</span>
The `AddressService` handles the ORM of the `Address` model and represent the origin and destination in a `MapRoute`. The user must add such an address manually in the `travel` page to then use it in a route. The service itself only cares about the database actions.

###### MapRouteService (required for MapService) <span style='float: right;'>Database</span>
The `MapRouteService` handles the ORM of the `MapRoute` model and uses the addresses defined in the `Address` model. The routes must be defined manually in the `travel` page. The routes between these addresses are then used to fetch route information in the `MapService`. The service itself only cares about the database actions.

##### NSService (requires TrainStationService & TrainRouteService) <span style='float: right;'>BaseService | API | Socket</span>
The `NSService` fetches the routes between stations using the NS API. To be able to fetch information about the train routes, the service has to fetch the existing stations from the API first. The user can then add the stations fetched from the API to the database using the `TrainStation` model and then select one of these stored stations as origin or destination in the `TrainRoute` model. Each stored train route the information is periodically fetched from the API, formatted, and stored inside the service.

This service can be enabled or disabled manually using the `service` setting. When fetching of data fails it will automatically be disabled.

###### TrainStationService (required for NSService) <span style='float: right;'>Database</span>
The `TrainStationService` handles the ORM of the `TrainStation` model and represent the origin and destination in a `TrainRoute`. The service itself only cares about the database actions.

###### TrainRouteService (required for NSService) <span style='float: right;'>Database</span>
The `TrainRouteService` handles the ORM of the `TrainRoute` model and uses the train stations defined in the `TrainStation` model. The routes must be defined manually in the `travel` page. The routes between these stations are then used to fetch route information in the `NSService`. The service itself only cares about the database actions.

##### DevicesService <span style='float: right;'>BaseService | API | Socket</span>
The `DevicesService` fetches the devices from the KlikAanKlikUit API, communicates with the local ICS-2000 hub, executes commands to devices, and is able to fetch energy readings when the hub is conncected to a smart energy meter. First the service must login to the API to retrieve information as the `homeID`, `AES key` and `MAC` address of the hub that is used in every subsequent request. Then the service tries to discover the hub locally, or fallback to a defined local hub address in the settings. With knowledge of the local hub the service can directly send commands to the hub instead of having to request the API. The devices, scenes, and energy readings all have to be fetched from the API. The former two are stored inside the service and the energy readings are stored using the `Energy` model and `EnergyService`. The retrieved data is encrypted and can be decrypted locally using the `AES key` received from the API. The decrypted data contains information about the device such as its type, functions, and current state.

Each device and switch can be different in type, model, brand, etc. Currently, only a selection of models are defined inside the service and each model has a different id and functions. There is also a difference in settings, such as minimum and maximum dim value, for each brand and model, and therefore requires custom handling inside the service.

* KlikAanKlikUit: Switch, Light, Dimmer
* Zigbee: Switch, Light, Dimmer, Color (RGB + Tunable)
* Energy module

Each device supports different functions which are defined in the service for the devices mentioned above. All devices, except the energy module allow the device to be turned on or off. Devices are dimmable only if the device is a dimmer or coloring. Only for coloring devices you can determine the warmth of the light. Apart from the device actions, we can also execute scenes as defined in the KlikAanKlikUit API and application. Scenes execute (multiple) actions at the same time. As mentioned in the `SpotifyService`, there is a connection between the `DevicesService` and the `SpotifyService` as it is possible to turn a Spotify device on or off when it is connected with for example a switch. We can therefore set and get the `spotify_speaker_id` value from the settings to turn the device on or off.

Energy readings are obtained directly from the API. We can fetch live energy readings and historical energy readings. The former fetches a list of numbers that denote the current power usage and production, the total power and gas usage, the total power production, and water usage (if connected to the smart meter). The live energy readings are stored inside the service and the historical readings are processed to showcase the total usage and information of every day and stored in the database using the `EnergyService`. The API only keeps the energy readings for the last 30 days.

This service can be enabled or disabled manually using the `service` setting. When fetching of data fails it will automatically be disabled.

##### EnergyService (requires DevicesService) <span style='float: right;'>Database</span>
The `EnergyService` handles the ORM of the `Energy` model which is also used in the `DevicesService`. The service itself only cares about the database actions.

##### CalendarService <span style='float: right;'>BaseService | Database</span>
The `CalendarService` handles the ORM of the `Calendar` model and fetches the events of these calendars. On the `calendar` page the user can add, edit, or delete a calendar. The service additionally fetches and parses the calendars with their corresponding events, and stores these events in the service.

This service can be enabled or disabled manually using the `service` setting. It will not be disabled when fetching of a calendar fails.

##### TaskService <span style='float: right;'>Database</span>
The `TaskService` handles the ORM of the `Task` model and is independent from any other service and API. It gives the user a possibility to create flagged or unflagged tasks, and finish or delete tasks. The inserted, updated, or removed tasks are automatically synchronized using the sockets.

This service can be enabled or disabled manually using the `service` setting.

### Controllers  <span style='float: right;'>`/controllers`</span>
The controllers define the routes inside the application for the pages and API. The frontend routes are defined in `RouteController` and contain routes that are conveniently composed using decorators with the `routing-controllers` module. The return object contains all the data that is required in the view template. All routes either use the `@Render("index.ejs")` decorator to set the view template of the response or redirects to another route using the `@Redirect()` decorator. The request method must be set using `@Get(path)` decorator (or other HTTP method) with its path as argument.

For every other service, apart from services that do not need an API or it has a parent service, a separate controller is defined. Each controller is setup using the `@JsonController()` decorator which returns serialized JSON data with the content type of the response set to `application/json`. The `AppController` contains API endpoints for the application itself. The `TravelController` is responsible for the API endpoints of both the `MapService` and `NSService`, and its dependents `AddressService`, `MapRouteService`, `TrainStationService`, and `TrainRouteService`. The other controllers are responsible for the endpoints of the corresponding service.

### Events <span style='float: right;'>`/events`</span>
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

### Views <span style='float: right;'>`/views`</span>
The fronted views are defined in the `/views` directory. The `index.ejs` acts as entrypoint for all pages. It defines the basic page structure and inserts partial files like the `head` and `nav`, and the dynamic templates based on the current page. The `/views/pages` directory contains the templates of the individual pages that are inserted in the `index.ejs` file. The `/views/widgets` directory contains all templates that are inserted an re-used in other page or widget templates. These templates are also fetched and rendered in the DOM in the frontend scripts.

| DIRECTORY  | DESCRIPTION | 
| :------------- |:-------------- |
| `/views/` | contains `index.ejs` and all template files in the subfolders, copied to the `dist` directory after build |
| `/views/partials` | contains partial template files to be included in the general layout (`head`, `nav`, `footer`, ...) |
| `/views/pages` | contains the page template files |
| `/views/widgets` | contains small element template files |

### Assets <span style='float: right;'>`/assets`</span>
Contains static files like `css`, `fonts`, `img`, and `js`. The entire directory is copied to the `/dist` folder during the build process of the application. The files are then included in the template views.

### Types <span style='float: right;'>`/types`</span>
The types folder contains custom defined types and TypeScript module declaration files. It is not required to put all custom types in separate files inside this folder, however, it is a common convention to do so as it groups all the types together and keeps other files cleaner.

## License
Copyright &copy; 2022. This project is [MIT](LICENSE.md) licensed.
