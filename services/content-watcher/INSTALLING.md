# INSTALLING

## A Note about Redis Persistence

The application requires a Redis server that is configured with `Append-only file` persistence. This is so that application state can be maintained across Redis restarts. Notes on how to configure this are included below for each type of deployment.


## Deploying using prebuilt Docker images

### Standalone (complete) image

The standalone container image is meant to be a complete solution for a provider. It contains a single instance of the main application, plus a pre-configured Redis server. Simply download the latest [container image](https://hub.docker.com/r/amplicalabs/content-watcher-service/) and deploy using your favorite container management system.
```
    docker pull amplicalabs/content-watcher-service:standalone-latest
```

The internal Redis server included in the complete image is already configured for persistence; it is simply necessary to configure your container pod to map the directory `/var/lib/redis` to a persistent storage volume.

#### Note: The internal redis server runs as user:group 100:102, so mapped volume permissions must at minimum allow write access to this user. How this is provisioned will depend on the specifics of your persistent storage infrastructure. If this is not configured properly, the redis server will fail to start, and the application upon launch will throw `ECONNREFUSED` errors.

Follow the instructions below for [configuration](#configuration), with the exception that you should _not_ modify `REDIS_URL`, as it already points to the internal Redis server.

### App-only image

The app-only image is meant to be used for providers who would rather utilize a Redis instance in their own (or their cloud infrastructure provider's) external Redis instance or service. To download the latest [container image](https://hub.docker.com/r/amplicalabs/content-watcher-service/), simply:
```
    docker pull amplicalabs/content-watcher-service:apponly-latest
```
In this case, you need to ensure that the following settings are configured in your Redis instance:
```
appendonly true
dir <base directory for Redis storage>
appendonlydir <subdirectory of base directory where append-only persistence files are stored>
```

You must also minimally map `appendonlydir` (or the entire `dir`) to a persistent storage volume in your infrastructure environment

## Building and Deploying the Application

If you choose to build & deploy the application yourself, simply install the prerequisites:
* NodeJS 18

To build the application:
```
    npm run build
```

To run the application:
```
    npm start
```

## Configuration

For the application to start & run correctly, it is necessary to configure the environment with certain parameters. These should be injected into a container pod if running in a containerized environment.

The following is a list of environment variables that may be set to control the application's behavior and environment. The complete list can always be referenced [here](./env.template)

|Variable|required?|Description|Default|
|-|-|-|-|
|`FREQUENCY_URL`|**yes**|Blockchain URL|_none_|
|`STARTING_BLOCK`|**maybe**|Starting block for scanner to scan from|_none_|
|`REDIS_URL`|**yes**|URL used to connect to Redis instance|_none_<br/>\*preset to the internal Redis URL in the standalone container|
|`BLOCKCHAIN_SCAN_INTERVAL_SECONDS`|no|# of seconds to wait in between scans of the blockchain|12|
|`QUEUE_HIGH_WATER`|no|# of pending queue entries to allow before pausing blockchain scanning until the next scan cycle|1000|
