#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose down frequency redis account-service-api account-service-worker

# Remove specified volumes
echo "Removing specified volumes..."
docker -f volume rm gateway_redis_data
docker -f volume rm gateway_chainstorage
docker -f volume rm gateway_account_api_node_cache
docker -f volume rm gateway_account_worker_node_cache
docker volume prune -f

# Remove account-service images
echo "Removing account-service image..."
docker rm gateway-gateway-base-1
docker rmi account-service gateway-dev
