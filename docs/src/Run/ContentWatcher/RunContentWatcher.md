<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Content Watcher

## Prerequisites

In order to run this project you need:

- [Nodejs](https://nodejs.org)
- [Docker](https://www.docker.com) or Docker-compatible container system for running Gateway Services

## Environment Variables

Use the provided [env.template](./env.template) file to create an initial environment for the application, and edit as desired. Additional documentation on the complete set of environment variables is provided in the [ENVIRONMENT.md](./ENVIRONMENT.md) file.

1. For running locally, copy to the template file to `.env` and update as needed.

```sh
cp env.template .env
```

2. Configure the environment variable values according to your environment.

   - Docker: `.env.docker.dev`
   - Local: `.env`

## Install

Install NPM Dependencies:

```sh
  npm install
```

## Usage

To run the project, execute the following command:

### 1. Start the required auxiliary services

Frequency node, Redis, IPFS

```sh
docker compose up -d frequency redis ipfs
```

### 2. [Optional] Start the publishing services

Run the following command to start the content publishing service api and worker containers. This will start the content publishing service api and worker in development mode.

```sh
docker compose up -d content-publishing-service-api content-publishing-service-worker
```

### 3. Start the application services

Run the following command to start the content watcher service container. This will start the content watcher service in development mode.

```sh
docker compose up [-d] content-watcher-service
```

## Swagger UI

Check out the Swagger UI hosted on the app instance at <http://localhost:3000/api/docs/swagger> to view the API documentation and submit requests to the service.
