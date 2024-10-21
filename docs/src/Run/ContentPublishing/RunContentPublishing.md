<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Content Publisher

## Prerequisites

In order to run this project you need:

- [Nodejs](https://nodejs.org)
- [Docker](https://www.docker.com) or Docker-compatible container system for running Gateway Services

## Environment Variables

Use the provided [env.template](../../env-files/content-publishing.template.env) file to create an initial environment for the application, and edit as desired. Additional documentation on the complete set of environment variables is provided in the [ENVIRONMENT.md](./ENVIRONMENT.md) file.

1. For running the application under Docker, copy the environment template to `.env.docker.dev`; for running bare-metal, copy to `.env`.

```sh
cp env-files/content-publishing.template.env .env
```

2. Configure the environment variable values according to your environment.

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

### 2. Start the application services

```sh
docker compose up [-d] content-publishing-service-api content-publishing-service-worker
```

## Swagger UI

Check out the Swagger UI hosted on the app instance at <http://localhost:3000/docs/swagger> to view the API documentation and submit requests to the service.
