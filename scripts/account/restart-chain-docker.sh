#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm -f gateway_redis_data
docker volume rm -f gateway_chainstorage
docker volume rm -f gateway_acccount_api_node_cache
docker volume rm -f gateway_account_worker_node_cache

# Start specific services in detached mode
echo "Starting redis and frequency instant sealing services..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e up -d

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
cd apps/account-api/test/setup && npm install && npm run main
