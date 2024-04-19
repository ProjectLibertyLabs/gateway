# Graph-Service

A service enabling easy interaction with DSNP private and public graphs on Frequency

## Table of Contents

- [Graph-Service](#graph-service)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Running E2E tests](#running-e2e-tests)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

## Getting Started

Follow these steps to set up and run Content Watcher:

### 1. Clone the Repository
Clone the Graph Service repository to your local machine:
   ```bash
   git clone https://github.com/amplicalabls/graph-service.git
   ```

### 2. Configure the app
The application receives its configuration from the environment. Each method of launching the app has its own source for the environment. If you run a container image using Kubernetes, it is likely your environment injection will be configured in a Helm chart. For local Docker-based development, you may specifiy the environment or point to an environment file (the included [docker-compose.yaml](./docker-compose.yaml) relies on the included [.env.docker.dev](./.env.docker.dev) file). If running natively using the script included in `package.json`, the app will use a local `.env` file.

Environment files are documented [here](./ENVIRONMENT.md), and a sample environment file is provided [here](./env.template).

### 3. Start the service:
Run the following command to start the service:
   ```bash
   docker compose up [-d]
   ```

This will start Frequency, Redis and Graph Service api/worker containers.

### 4. Swagger UI
Check out the Swagger UI hosted on the app instance at [\<base url>/api/docs/swagger](http://localhost:3000/api/docs/swagger) to view the API documentation and submit requests to the service.

### 5. Queue Management
You may also view and manage the application's queue at [\<base url>/queues](http://localhost:3000/queues).

## Running E2E tests

Note: using [docker compose file](docker-compose.yaml) to start the services. This will start the services in development mode.

1. Start redis and frequency

   ```bash
   docker compose up  -d redis frequency
   ```

   This will start Frequency and Redis

2. Once [Frequency](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) is up. Run a graph setup with Alice as provider 1 and 2,3,4,5,6 as users.

      ```bash
         make setup
      ```

3. Run the following command to start the graph service api and worker containers.

   ```bash
      docker compose up -d api worker
   ```

   This will start the graph service api and worker in development mode.

4. Check the job in [BullUI](http://0.0.0.0:3000/queues/), to monitor job progress based on defined tests.

5. Run the tests

   ```bash
      make test-e2e
   ```

   This will run the tests in `apps/api/test` folder.

6. Check e2e test file for more details on the test.
