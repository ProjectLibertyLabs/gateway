#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm account-service_redis_data
docker volume rm account-service_chainstorage

# Start specific services in detached mode
echo "Starting redis and frequency services..."
docker compose up -d redis frequency

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
make setup

# Start api and worker apps in different terminals
echo "Please run 'make mock-webhook' in a separate terminal..."
echo "Please run 'npm run start:api:debug' in a separate terminal..."
echo "Please run 'npm run start:worker:debug' in a separate terminal..."
echo "This allows for easy log monitoring and debugging."
