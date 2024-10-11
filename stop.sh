#!/bin/bash

. ./bash_functions.sh

# Stop all services and optionally remove specified volumes to remove all state and start fresh

# Export the variables that are used in the docker-compose.yaml file
if [ -f .env-saved ]; then
    set -a; source .env-saved; set +a
fi

# Shutting down any running services
echo "Shutting down any running services..."
docker compose --profile local-node --profile backend --profile frontend --profile webhook down

# Ask the user if they want to remove specified volumes
if yesno "Do you want to remove specified volumes to remove all state and start fresh" N
then
    echo "Removing specified volumes..."
    # Docker volume names are lowercase versions of the directory name
    # In the root directory of the repository, we get from the system directory name
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_redis_data
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_ipfs_data
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_account_api_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_account_worker_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_graph_api_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_graph_worker_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_content_publishing_api_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_content_publishing_worker_node_cache
    docker volume rm -f ${COMPOSE_PROJECT_NAME}_content_watcher_node_cache
    if [[ ! $TESTNET_ENV =~ ^[Yy]$ ]]
    then
        docker volume rm ${COMPOSE_PROJECT_NAME}_chainstorage
    fi
else
    echo "Leaving Docker volumes alone."
fi
