#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm gateway_redis_data
docker volume rm gateway_chainstorage

# Start specific services in detached mode
echo "Starting redis and frequency services..."
docker compose up -d redis frequency

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
cd apps/account-api/test/setup && npm install && npm run main

# Start all services in detached mode
echo "Starting account-service, api and worker apps..."
docker compose up -d account-service-api account-service-worker

# Start the mock web server
echo "Please run 'make mock-webhook' in a separate terminal..."

