#!/bin/bash
# Stop all services and optionally remove specified volumes to remove all state and start fresh

. ./bash_functions.sh

BASE_DIR=${HOME}/.projectliberty
BASE_NAME=gateway-dev
ENV_FILE="${BASE_DIR}/.env.${BASE_NAME}"

# Usage: ./stop.sh [options]
# Options:
#   -h, --help                 Show this help message and exit
#   -n, --name                 Specify the project name

# Function to display help message
show_help() {
    echo "Usage: ./stop.sh [options]"
    echo "Options:"
    echo "  -h, --help                 Show this help message and exit"
    echo "  -n, --name                 Specify the project name"
}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help; exit 0 ;;
        -n|--name) BASE_NAME="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; show_help; exit 1 ;;
    esac
    shift
done

if [ ! -f "${BASE_DIR}/.env.${BASE_NAME}" ]; then
   echo -e "Unable to find '${BASE_DIR}/.env.${BASE_NAME}'; using '${ENV_FILE}' instead.\n"
else
   ENV_FILE="${BASE_DIR}/.env.${BASE_NAME}"
    echo -e "Using environment file: '${ENV_FILE}'\n"
fi


# Export the variables that are used in the docker-compose.yaml file
if [ -f ${ENV_FILE} ]; then
    set -a; source ${ENV_FILE}; set +a
fi

COMPOSE_CMD=$( prefix_postfix_values "${COMPOSE_FILES}" "-f ")
PROFILE_CMD=$( prefix_postfix_values "${PROFILES}" "--profile ")

# Shutting down any running services
${OUTPUT} "Shutting down any running services..."
docker compose ${COMPOSE_CMD} ${PROFILE_CMD} down

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
    ${OUTPUT} "Leaving Docker volumes alone."
fi
