#!/bin/bash
# Stop all services and optionally remove specified volumes to remove all state and start fresh

. ./bash_functions.sh

# Set the output function
check_pcre_grep

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
VOLUMES=
VOLUMES_MSG=
# Ask the user if they want to remove specified volumes
if yesno "Do you want to remove specified volumes to remove all state and start fresh" N
then
    VOLUMES="--volumes"
    VOLUMES_MSG=" and removing all volumes"
else
    ${OUTPUT} "Leaving Docker volumes alone."
fi

${OUTPUT} "Shutting down any running services${VOLUMES_MSG}..."
docker compose ${COMPOSE_CMD} ${PROFILE_CMD} down ${VOLUMES}
