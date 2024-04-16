# Account-Service

A service enabling easy interaction with DSNP accounts on Frequency.
For example, here are some interactions that are provided by account-service:

- Account creation (and behind the scenes delegation to the provider)
- Username, or handle, claiming
- Exporting private graph keys
- Easy integration with Web3 wallets
- Sessions??

## Table of Contents

- [Account-Service](#account-service)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Running E2E tests](#running-e2e-tests)
  - [Devlopment Envirionment](#development-environment)
  - [Architecture](#architecture)
  
## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

## Getting Started

1. Clone the repository

   ```bash
   git clone https://github.com/amplicalabls/account-service.git
   ```
2. Create an .env file by executing `npm run pretest`
2. Start docker compose

   ```bash
   docker-compose -f docker-compose.dev.yaml --profile instant up 
   ```

   This will start Frequency, Redis and Account Service api/worker containers.

3. Go to [BullUI](http://0.0.0.0:3000/queues/)  and check the account service queue.
4. Check the [Swagger](http://0.0.0.0:3000/api/docs/swagger) for API documentation.

## Running E2E tests

Note: using [docker compose file](docker-compose.yaml) with `instant` profile to start the services. This will start the services in development mode.

1. Start redis and frequency with instant profile.

   ```bash
   docker-compose --profile instant up  -d redis frequency
   ```

   This will start Frequency and Redis

2. Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up. Run an account setup with Alice as provider 1 and 2,3,4,5,6 as users.

      ```bash
         make setup
      ```

3. Run the following command to start the account service api and worker containers.

   ```bash
      docker-compose --profile instant up -d api worker
   ```

   This will start the account service api and worker in development mode.

4. Check the job in [BullUI](http://0.0.0.0:3000/queues/), to monitor job progress based on defined tests.

5. Run the tests

   ```bash
      make test-e2e
   ```

   This will run the tests in `apps/api/test` folder.

6. Check e2e test file for more details on the test.

## Development Environment

In order to run the account-service in development mode without containers, you can use the following commands:

1. Start the redis server container and the frequency container. You can view the logs with your Docker setup.

   ```bash
   docker-compose --profile instant up -d redis frequency
   ```

2. In a new terminal window, start the account-service api app. Logs will be displayed in the terminal for easy reference.

    ```bash
    npm run start:api:debug
    ```

3. In another terminal window, start the account-service worker app.

    ```bash
    npm run start:worker:debug
    ```

### Using the Debugger with VSCode

1. Follow step 1 from the Development Environment section above to setup the redis and frequency containers.

2. Use the debug panel and start the `Debug Api (NestJS via ts-node)` configuration, if you wish to debug the api.

   Use the debug panel and start the `Debug Worker (NestJS via ts-node)` configuration, if you wish to debug the worker.

3. Set breakpoints in the code and debug your code.

4. Monitor the service worker jobs in [BullUI](http://0.0.0.0:3000/queues/).
  
   Any API functions that require an extrinsic to submitted to the blockchain will be queued here. The queue will manage the amount of `capacity` this service is allowed to use.

   Reference the [Frequency Docs](https://docs.frequency.xyz/) for more information about extrinsics and capacity.

5. Use [Swagger](http://0.0.0.0:3000/api/docs/swagger) to test the API.

**Note:** Reference `.vscode/launch.json` for more details on the debug configurations and apply the concepts to your preferred debugger.

## Architecture

The account-service is a NestJS application that is split into two main parts: the API and the Worker.

The API is responsible for handling incoming HTTP requests and the Worker is responsible for processing jobs that require blockchain interaction.

The architecture block [diagram](./docs/account_service_arch.drawio) is referenced in the `docs` folder.
