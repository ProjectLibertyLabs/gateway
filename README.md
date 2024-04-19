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

Follow these steps to set up and run the Account Service:

### 1. Clone the Repository

Clone the Account Service repository to your local machine:

```bash
git clone https://github.com/AmplicaLabs/account-service.git
```

### 2. Configure the application
Modify any environment variables in the `.env` file as needed. For docker compose env `.env.docker.dev` file is used. The complete set of environment variables is documented [here](./ENVIRONMENT.md), and a sample environment file is provided [here](./env.template)

### 3. Start the service:
Run the following command to start the service:
```bash
docker-compose up
```

### 4. Swagger UI
Check out the Swagger UI hosted on the app instance at [\<base url>/api/docs/swagger](http://localhost:3000/api/docs/swagger) to view the API documentation and submit requests to the service.

### 5. Queue Management
You may also view and manage the application's queue at [\<base url>/queues](http://localhost:3000/queues).

## Running E2E tests

Note: using [docker compose file](docker-compose.yaml) to start the services. This will start the services in development mode.

1. Start redis and frequency with instant profile.

   ```bash
   docker-compose up  -d redis frequency
   ```

   This will start Frequency and Redis

2. Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up. Run an account setup with Alice as provider 1 and 2,3,4,5,6 as users.

      ```bash
         make setup
      ```

3. Run the following command to start the account service api and worker containers.

   ```bash
      docker-compose up -d api worker
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
   docker-compose up -d redis frequency
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

   Any API functions that require an extrinsic to be submitted to the blockchain will be queued here. The queue will manage the amount of `capacity` this service is allowed to use.

   Reference the [Frequency Docs](https://docs.frequency.xyz/) for more information about extrinsics and capacity.

5. Use [Swagger](http://0.0.0.0:3000/api/docs/swagger) to test the API.

**Note:** Reference `.vscode/launch.json` for more details on the debug configurations and apply the concepts to your preferred debugger.

## Architecture

The account-service is a NestJS application that is split into two main parts: the API and the Worker.

The API is responsible for handling incoming HTTP requests and the Worker is responsible for processing jobs that require blockchain interaction.

The architecture block [diagram](./docs/account_service_arch.drawio) is referenced in the `docs` folder.
