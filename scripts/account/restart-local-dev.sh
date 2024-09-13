#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm -f gateway_redis_data
docker volume rm -f gateway_chainstorage

# Start specific services in detached mode
echo "Starting redis and frequency instant sealing services..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e up -d

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
cd apps/account-api/test/setup && npm install && npm run main

# Start api and worker apps in different terminals
echo "Please run 'npm run start:api:debug' in a separate terminal..."
echo "Please run 'npm run start:worker:debug' in a separate terminal..."
echo "This allows for easy log monitoring and debugging."
