#!/bin/bash

function exit_err() {
  echo "💥 ${1}"
  exit 1
}

# Stop and remove containers, networks
echo "Stopping and removing containers, networks..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e down || exit_err "Stopping docker failed.."

# Remove specified volumes
# these return nonzero if the volume doesn't exist; it's ok if they fail.
echo "Removing specified volumes..."
docker volume rm -f gateway_redis_data
docker volume rm -f gateway_chainstorage
docker volume rm -f gateway_acccount_api_node_cache
docker volume rm -f gateway_account_worker_node_cache

# Start specific services in detached mode
echo "Starting redis and frequency instant sealing services..."
docker compose -f docker-compose.yaml -f docker-compose-e2e.account.yaml --profile e2e up -d || exit_err "Docker compose failed."

# Wait for 15 seconds
echo "Waiting 15 seconds for Frequency to be ready..."
sleep 15

# Run make setup
echo "Running make setup to provision Provider with capacity, etc..."
cd apps/account-api/test/setup || exit_err "test setup failed."
npm install || exit_err "Running npm install failed."
npm run main || exit_err "Running main failed."
