<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Graph Service

## Prerequisites

In order to run this project you need:

- [Docker](https://docs.docker.com/get-docker/)
- [Nodejs](https://nodejs.org)

## Install

Install NPM Dependencies:

```sh
  npm install
```

## Environment Variables

The application receives its configuration from the environment. Each method of launching the app has its own source for the environment. If you run a container image using Kubernetes, it is likely your environment injection will be configured in a Helm chart. For local Docker-based development, you may specify the environment or point to an environment file (the included [docker-compose.yaml](./docker-compose.yaml) has a self-contained environment which may be edited to suit your purposes).

Environment files are documented [here](./ENVIRONMENT.md), and a sample environment file is provided [here](./env.template).

1. Copy the template values into the .env file.

   ```sh
   cp env.template .env
   ```

2. Replace template values with values appropriate to your environment.

## Usage

Note: using [docker compose file](docker-compose.yaml) to start the services. This will start the services in development mode.

### 1. Start the Redis server container and the Frequency container. You can view the logs with your Docker setup

```sh
docker compose up -d redis frequency
```

Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up, you can monitor the transactions on the blockchain

### 2. Start the application services

Run the following command to start the graph service api and worker containers. This will start the account service api and worker in development mode.

```sh
docker compose up -d graph-service-api graph-service-worker
```

## Swagger UI

Check out the Swagger UI hosted on the app instance at <http://localhost:3000/docs/swagger> to view the API documentation and submit requests to the service.
