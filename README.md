# Graph-Service

A service enabling easy interaction with DSNP private and public graphs on Frequency

## Table of Contents

- [Graph-Service](#graph-service)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  
## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

## Getting Started

1. Clone the repository

   ```bash
   git clone https://github.com/amplicalabls/graph-service.git
   ```

2. Start docker compose

   ```bash
   docker-compose -f docker-compose.dev.yaml --profile instant up 
   ```

   This will start Frequency, Redis and Graph Service api/worker containers.

3. Run a graph scenario from [frequency scenario templates](https://github.com/AmplicaLabs/frequency-scenario-template/tree/graph-service-setup). Note the use of branch `graph-service-setup` of the frequency scenario template repo.

   ```bash
    git clone https://github.com/AmplicaLabs/frequency-scenario-template.git
    cd frequency-scenario-template
    git checkout graph-service-setup
    npm run run-example --example=graph-migration-setup
    ```

    This will create `//Ferdie` as provider along with DSNPIds 2,3,4,5 and 6 as users. The template will also add a public key for each user in itemized storage needed for private graph operations.

4. Go to [BullUI](http://0.0.0.0:3000/queues/)  and check the graph service queue.
5. Check the [Swagger](http://0.0.0.0:3000/api/docs/swagger) for API documentation.

## Running E2E tests

1. Start redis and frequency with instant profile.

   ```bash
   docker-compose -f docker-compose.dev.yaml --profile instant up frequency redis
   ```

   This will start Frequency and Redis containers.

2. Using nest cli start the api and worker.

   ```bash
   npx nest start api
   npx nest start worker
   ```

   This will start the api and worker in watch mode.

3. Run a graph scenario from [frequency scenario templates](https://github.com/AmplicaLabs/frequency-scenario-template/tree/graph-service-setup). Note the use of branch `graph-service-setup` of the frequency scenario template repo.

   ```bash
    git clone https://github.com/AmplicaLabs/frequency-scenario-template.git
    cd frequency-scenario-template
    git checkout graph-service-setup
    npm run run-example --example=graph-migration-setup
    ```

    This will create `//Ferdie` as provider along with DSNPIds 2,3,4,5 and 6 as users. The template will also add a public key for each user in itemized storage needed for private graph operations.

4. Check the job in [BullUI](http://0.0.0.0:3000/queues/), to monitor job progress based on defined tests.

5. Run the tests

   ```bash
   npm run test:e2e
   ```

   This will run the tests in `apps/api/test` folder.

6. Check e2e test file for more details on the test.
