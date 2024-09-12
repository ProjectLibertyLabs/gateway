#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down frequency redis account-service-api account-service-worker

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm gateway_redis_data
docker volume rm gateway_chainstorage
docker volume rm gateway_acccount_api_node_cache
docker volume rm gateway_account_worker_node_cache

# Start specific services in detached mode
echo "Starting redis and frequency instant sealing services..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e --profile account up -d

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
cd apps/account-api/test/setup && npm install && npm run main

# Start the mock web server
echo "Please run 'make mock-webhook' in a separate terminal..."

