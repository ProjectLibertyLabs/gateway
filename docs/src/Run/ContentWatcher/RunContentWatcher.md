<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Content Watcher

## Prerequisites

In order to run this project you need:

- [Nodejs](https://nodejs.org)
- [Docker](https://www.docker.com/get-docker/)

## Environment Variables

Use the provided [content-watcher.template.env](https://github.com/ProjectLibertyLabs/gateway/blob/main/env-files/content-watcher.template.env) file to create an initial environment for the application and edit as desired. Additional documentation on the complete set of environment variables is provided in the [ENVIRONMENT.md](https://github.com/ProjectLibertyLabs/gateway/blob/main/developer-docs/content-watcher/ENVIRONMENT.md) file.

1. For running locally, copy to the template file to `.env.content-watcher` and update as needed.

```sh
cp env-files/content-watcher.template.env .env.content-watcher
```

2. Replace template values with values appropriate to your environment.

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

Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up, you can monitor the transactions on the blockchain.

### 2. [Optional] Start the publishing services

```sh
docker compose up -d content-publishing-service-api content-publishing-service-worker
```

### 3. Start the application services

```sh
docker compose up [-d] content-watcher-service
```

## Swagger UI

Check out the Swagger UI hosted on the app instance at <http://localhost:3000/api/docs/swagger> to view the API documentation and submit requests to the service.
