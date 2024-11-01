#!/bin/bash

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e down

# Remove specified volumes
echo "Removing specified volumes..."
docker volume rm -f gateway_redis_data
docker volume rm -f gateway_chainstorage
docker volume rm -f gateway_account_api_node_cache
docker volume rm -f gateway_account_worker_node_cache
docker volume prune -f

# Remove account-service images
echo "Removing account-service image..."
docker rm -f gateway-gateway-base-1
docker rmi -f account-service gateway-dev
