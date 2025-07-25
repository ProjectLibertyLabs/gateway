#!/bin/bash
# Script to start all Frequency Developer Gateway services on the Frequency Paseo Testnet

# Load external functions
. ./bash_functions.sh

SKIP_CHAIN_SETUP=false

###################################################################################
# show_help
#
# Description: Display usage instructions for the script
#
###################################################################################
function show_help() {
    echo "Usage: ./start.sh [options]"
    echo "Options:"
    echo "  -h, --help                 Show this help message and exit"
    echo "  -n, --name                 Specify the project name"
    echo "  -s, --skip-setup           Skip running chain scenario setup (provider, capacity, etc)"
}

###################################################################################
# parse_arguments
#
# Description: Parse command-line arguments
#
###################################################################################
function parse_arguments() {
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            -h|--help) show_help; return 0 ;;
            -n|--name) BASE_NAME="$2"; shift ;;
            -s|--skip-setup) SKIP_CHAIN_SETUP=true ;;
            *) echo "Unknown parameter passed: $1"; show_help; return 1 ;;
        esac
        shift
    done
}

###################################################################################
# setup_environment
#
# Description: Set up environment variables and directories
#
###################################################################################
function setup_environment() {
    if [ ! -d "${BASE_DIR}" ]; then
        mkdir -p "${BASE_DIR}"
    fi

    ENV_FILE=${BASE_DIR}/.env.${BASE_NAME}
    COMPOSE_PROJECT_NAME=${BASE_NAME}

    if [[ -n $ENV_FILE ]]; then
        ${OUTPUT} "Using environment file: $ENV_FILE"
    fi
    return 0
}

###################################################################################
# check_dependencies
#
# Description: Ensure Docker and Docker Compose are installed
#
###################################################################################
function check_dependencies() {
    if ! command -v docker &> /dev/null || ! command -v docker compose &> /dev/null; then
        ${OUTPUT} "Docker and Docker Compose are required but not installed. Please install them and try again.\n"
        exit 1
    fi
}

###################################################################################
# handle_env_file
#
# Description: Manage existing environment files
#
###################################################################################
function handle_env_file() {
    if [ -f ${ENV_FILE} ]; then
        echo -e "Found saved environment from a previous run:\n"
        redacted_content=$(redact_sensitive_values "${ENV_FILE}")
        echo "${redacted_content}"

        if yesno "Do you want to re-use the saved parameters" Y; then
            ${OUTPUT} "Loading environment values from file..."
        else
            ${OUTPUT} "Removing previous saved environment..."

            rm ${ENV_FILE}
            # If the file fails to delete, exit the script
            if [ -f ${ENV_FILE} ]; then
                ${OUTPUT} "Failed to remove previous saved environment. Exiting..."
                exit 1
            fi
        fi
    fi
    return 0
}

###################################################################################
# prompt_for_configuration
#
# Description: Interactive prompts to gather necessary configuration
#
###################################################################################
function prompt_for_configuration() {
    ${OUTPUT} << EOI
Creating project environment file:
    ${ENV_FILE}
EOI
    # Setup some variables for easy port management
    STARTING_PORT=3010
    for i in {0..10}; do
        eval SERVICE_PORT_${i}=$(( STARTING_PORT + i ))
        export_save_variable SERVICE_PORT_${i} $(( STARTING_PORT + i ))
    done

    export_save_variable COMPOSE_PROJECT_NAME "${COMPOSE_PROJECT_NAME}"

    # Ask the user if they want to use published containers or build from source
    if yesno "Do you want to use the published Gateway Services containers" Y; then
        export_save_variable USE_PUBLISHED true
        echo
        read -p "Enter a tag to use to pull the Gateway Docker images [latest]: " tag
        export_save_variable DOCKER_TAG "${tag:-latest}"
        COMPOSE_FILES="docker-compose-published.yaml"
        ${OUTPUT} << EOI
Using Gateway Services published containers from Docker Hub with tag: ${DOCKER_TAG}
EOI
    else
        export_save_variable USE_PUBLISHED false
        COMPOSE_FILES="docker-compose.yaml docker-compose-local-selective.yaml"
        ${OUTPUT} << EOI
Using Gateway Services development containers built from local source...
EOI
    fi

    # Ask the user if they want to start on testnet or local
    if yesno "Do you want to start on Frequency Paseo Testnet" N; then
        TESTNET_ENV=true
        PROFILES="${PROFILES}"
    else
        TESTNET_ENV=false
        COMPOSE_FILES="${COMPOSE_FILES} docker-compose.local-frequency.yaml"
    fi
    export_save_variable TESTNET_ENV "${TESTNET_ENV}"

    # Ask the user which services they want to start
    ${OUTPUT} << EOI
Select the services you want to start.

If you only want to start selected services, enter 'n' to exclude the service.

Hit <ENTER> to accept the default value or enter new value and then hit <ENTER>
EOI
    if yesno "Start the account service" Y; then
        PROFILES="${PROFILES} account"
    fi
    if yesno "Start the mock webhook logger" Y; then
        PROFILES="${PROFILES} webhook"
    fi
    if yesno "Start the graph service" Y; then
        PROFILES="${PROFILES} graph"
    fi
    if yesno "Start the content-publishing service" Y; then
        PROFILES="${PROFILES} content-publishing"
    fi
    if yesno "Start the content-watcher service" Y; then
        PROFILES="${PROFILES} content-watcher"
    fi

    if [ "${TESTNET_ENV}" != true ]; then
        PROFILES="${PROFILES} local-node"
    fi

    ${OUTPUT} << EOI
Selected services to start:
${PROFILES}
EOI

    if [[ ${TESTNET_ENV} = true ]]; then
        ${OUTPUT} << EOI
Setting defaults for testnet...
Hit <ENTER> to accept the default value, or,
enter new value and then hit <ENTER>"
EOI
        DEFAULT_TESTNET_ENV="testnet"
        DEFAULT_FREQUENCY_API_WS_URL="wss://0.rpc.testnet.amplica.io"
        DEFAULT_SIWF_NODE_RPC_URL="https://0.rpc.testnet.amplica.io"
        DEFAULT_PROVIDER_ID="INPUT REQUIRED"
        DEFAULT_PROVIDER_ACCOUNT_SEED_PHRASE="INPUT REQUIRED"
    else
        echo -e "\nStarting on local..."
        DEFAULT_TESTNET_ENV="local"
        DEFAULT_FREQUENCY_API_WS_URL="ws://frequency:9944"
        DEFAULT_SIWF_NODE_RPC_URL="http://localhost:9944"
        DEFAULT_PROVIDER_ID="1"
        DEFAULT_PROVIDER_ACCOUNT_SEED_PHRASE="//Alice"
    fi

    DEFAULT_IPFS_VOLUME="/data/ipfs"
    DEFAULT_IPFS_ENDPOINT="http://ipfs:5001/api/v0"
    DEFAULT_IPFS_GATEWAY_URL='https://ipfs.io/ipfs/[CID]'
    DEFAULT_IPFS_BASIC_AUTH_USER=""
    DEFAULT_IPFS_BASIC_AUTH_SECRET=""
    DEFAULT_IPFS_UA_GATEWAY_URL="http://localhost:8080"
    DEFAULT_CONTENT_DB_VOLUME="content_db"

    ask_and_save FREQUENCY_API_WS_URL "Enter the Frequency API Websocket URL" "$DEFAULT_FREQUENCY_API_WS_URL"
    ask_and_save SIWF_NODE_RPC_URL "Enter the SIWF Node RPC URL" "$DEFAULT_SIWF_NODE_RPC_URL"
    box_text_attention -w ${BOX_WIDTH} << EOI
A Provider is required to start the services.

If you need to become a provider, visit
https://provider.frequency.xyz/ to get a Provider ID.
EOI

    ask_and_save PROVIDER_ID "Enter Provider ID" "$DEFAULT_PROVIDER_ID"
    ask_and_save PROVIDER_ACCOUNT_SEED_PHRASE "Enter Provider Seed Phrase" "$DEFAULT_PROVIDER_ACCOUNT_SEED_PHRASE" true

    ${OUTPUT} "Suggestion: Change to an IPFS Pinning Service for better persistence and availability."

    if yesno "===> Given this suggestion, would you like to change the IPFS settings?" N; then
        ask_and_save IPFS_VOLUME "Enter the IPFS volume" "$DEFAULT_IPFS_VOLUME"
        ask_and_save IPFS_ENDPOINT "Enter the IPFS Endpoint" "$DEFAULT_IPFS_ENDPOINT"
        ask_and_save IPFS_GATEWAY_URL "Enter the IPFS Gateway URL" "$DEFAULT_IPFS_GATEWAY_URL"
        ask_and_save IPFS_BASIC_AUTH_USER "Enter the IPFS Basic Auth User" "$DEFAULT_IPFS_BASIC_AUTH_USER" true
        ask_and_save IPFS_BASIC_AUTH_SECRET "Enter the IPFS Basic Auth Secret" "$DEFAULT_IPFS_BASIC_AUTH_SECRET" true
        ask_and_save IPFS_UA_GATEWAY_URL "Enter the browser-resolveable IPFS Gateway URL" "$DEFAULT_IPFS_UA_GATEWAY_URL"
    else
        # Add the IPFS settings to the .env-saved file so defaults work with local testing
        cat >> ${ENV_FILE} << EOI
IPFS_VOLUME="${DEFAULT_IPFS_VOLUME}"
IPFS_ENDPOINT="${DEFAULT_IPFS_ENDPOINT}"
IPFS_GATEWAY_URL="${DEFAULT_IPFS_GATEWAY_URL}"
IPFS_BASIC_AUTH_USER="${DEFAULT_IPFS_BASIC_AUTH_USER}"
IPFS_BASIC_AUTH_SECRET="${DEFAULT_IPFS_BASIC_AUTH_SECRET}"
IPFS_UA_GATEWAY_URL="${DEFAULT_IPFS_UA_GATEWAY_URL}"
EOI
    fi

    export_save_variable PROFILES "${PROFILES}"
    export_save_variable COMPOSE_FILES "${COMPOSE_FILES}"
}

###################################################################################
# local_setup_tasks
#
# Description: Perform tasks after starting services, such as setting up environments
#
###################################################################################
function local_setup_tasks() {
    if [ "${SKIP_CHAIN_SETUP}" != true ] && [ "${TESTNET_ENV}" != true ]; then
        # Wait 1 minute for Frequency node to be ready
        health_attempts=0
        while (( health_attempts < 60 )) && ! is_frequency_ready; do
            (( health_attempts += 1 ))
            echo "Waiting for Frequency node to respond..."
            sleep 1
        done

        if is_frequency_ready; then
            # Run npm run local:init
            echo "Running local setup script to provision Provider with capacity, etc..."
            npm run setup:common:chain
        else
            echo "Timed out waiting for Frequency node to be ready" >&2
        fi
    fi
}

###################################################################################
# start_services
#
# Description: Start Docker Compose services based on selected profiles
#
###################################################################################
function start_services() {
    set -a
    source ${ENV_FILE}
    set +a

    if [[ ${TESTNET_ENV} = false ]]; then
        # Start specific services in detached mode
        echo -e "\nStarting local frequency services..."
        docker compose up -d frequency
        local_setup_tasks
    fi

    # Start all services in detached mode
    echo -e "\nStarting selected services..."
    COMPOSE_CMD=$( prefix_postfix_values "${COMPOSE_FILES}" "-f ")
    PROFILE_CMD=$( prefix_postfix_values "${PROFILES}" "--profile ")

    echo -e "docker compose ${COMPOSE_CMD} ${PROFILE_CMD} up -d"
    docker compose ${COMPOSE_CMD} ${PROFILE_CMD} up -d
}

###################################################################################
# display_services_info
#
# Description: Display information about the running services
#
###################################################################################
function display_services_info() {
    SERVICES_STR="\
The selected services are running.
You can access the Gateway at the following local addresses:
"

    if [[ ${PROFILES} =~ account ]]; then
        SERVICES_STR="${SERVICES_STR}
    * account-service:
        - API:                http://localhost:${SERVICE_PORT_3}
        - Queue management:   http://localhost:${SERVICE_PORT_3}/queues
        - Swagger UI:         http://localhost:${SERVICE_PORT_3}/docs/swagger
        - Health check:       http://localhost:${SERVICE_PORT_3}/healthz
        - Prometheus metrics: http://localhost:${SERVICE_PORT_3}/metrics
        - Mock Webhook:       http://mock-webhook-logger:${ACCOUNT_WEBHOOK_PORT:-3001}/webhooks/account-service
          (View log messages in docker)
"
    fi
    if [[ ${PROFILES} =~ content-publishing ]]; then
        SERVICES_STR="${SERVICES_STR}
    * content-publishing-service:
        - API:                http://localhost:${SERVICE_PORT_0}
        - Queue management:   http://localhost:${SERVICE_PORT_0}/queues
        - Health check:       http://localhost:${SERVICE_PORT_0}/healthz
        - Prometheus metrics: http://localhost:${SERVICE_PORT_0}/metrics
        - Swagger UI:         http://localhost:${SERVICE_PORT_0}/docs/swagger
"
    fi
    if [[ ${PROFILES} =~ content-watcher ]]; then
        SERVICES_STR="${SERVICES_STR}
    * content-watcher-service:
        - API:                http://localhost:${SERVICE_PORT_1}
        - Queue management:   http://localhost:${SERVICE_PORT_1}/queues
        - Health check:       http://localhost:${SERVICE_PORT_1}/healthz
        - Prometheus metrics: http://localhost:${SERVICE_PORT_1}/metrics
        - Swagger UI:         http://localhost:${SERVICE_PORT_1}/docs/swagger
"
    fi
    if [[ ${PROFILES} =~ graph ]]; then
        SERVICES_STR="${SERVICES_STR}
    * graph-service:
        - API:                http://localhost:${SERVICE_PORT_2}
        - Queue management:   http://localhost:${SERVICE_PORT_2}/queues
        - Health check:       http://localhost:${SERVICE_PORT_2}/healthz
        - Prometheus metrics: http://localhost:${SERVICE_PORT_2}/metrics
        - Swagger UI:         http://localhost:${SERVICE_PORT_2}/docs/swagger
"
    fi

    box_text_attention -w 0 "${SERVICES_STR}"
}

###################################################################################
# main
#
# Description: Main function to execute the script logic
#
###################################################################################
function main() {
    # Call the check_pcre_grep function to initialize PCRE_GREP and OUTPUT
    check_pcre_grep
    parse_arguments "$@"
    setup_environment
    check_dependencies
    handle_env_file

    if [ ! -f "${ENV_FILE}" ]; then
        prompt_for_configuration
    fi

    start_services
    display_services_info

    exit 0
}

# Call main function if the script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
