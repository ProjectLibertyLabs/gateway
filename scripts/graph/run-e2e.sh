#!/bin/bash

 export COMPOSE_PROJECT_NAME=graph-service-e2e

# Clear existing volumes
    docker volume rm ${COMPOSE_PROJECT_NAME}_redis_data 2>/dev/null
    docker volume rm ${COMPOSE_PROJECT_NAME}_chainstorage 2>/dev/null

# Start chain & cache
docker compose up -d frequency redis

# Initialize chain
npm run chain-setup

# Start API
docker compose up -d api

# Run E2E tests
npm run test:e2e

# Stop containers
docker compose down
