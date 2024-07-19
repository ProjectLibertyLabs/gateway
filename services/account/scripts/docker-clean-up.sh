#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm account-service_redis_data
docker volume rm account-service_chainstorage

# Remove account-service images
echo "Removing account-service image..."
docker rmi account-service
