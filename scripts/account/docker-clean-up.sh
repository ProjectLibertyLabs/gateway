#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down frequency redis account-service-api account-service-worker

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm gateway_redis_data
docker volume rm gateway_chainstorage
docker volume rm gateway_account_node_cache

# Remove account-service images
echo "Removing account-service image..."
docker rmi account-service
