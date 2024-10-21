<!-- TODO: Update for Builder Track, see: https://github.com/ProjectLibertyLabs/gateway/issues/630 -->
# Running Account Service

## Prerequisites

In order to run this project you need:

- [Node.js](https://nodejs.org)
- [Docker](https://docs.docker.com/get-docker/)

## Environment Variables

Modify any environment variables in the `.env` file as needed. The complete set of environment variables is documented [here](./ENVIRONMENT.md), and a sample environment file is provided [here](../../env-files/account.template.env).

1. Copy the template values into the .env.account file.

  ```sh
     cp env-files/account.template.env .env.account
  ```

2. Replace template values with values appropriate to your environment.

## Install

Install NPM Dependencies:

```sh
  npm install
```

## Usage

Note: using [docker compose file](../../docker-compose.yaml) to start the services. This will start the services in development mode.

The following command will start all of the necessary containers for the account service to run in development mode.

```bash
./scripts/account/restart-chain-docker.sh
```

Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up, you can monitor the transactions on the blockchain.

```sh
docker compose up -d account-service-api account-service-worker
```

## Swagger UI

Check out the Swagger UI hosted on the app instance at [http://localhost:3000/api/docs/swagger](http://localhost:3000/docs/swagger) to view the API documentation and submit requests to the service.
