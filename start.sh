#!/bin/bash
. ./bash_functions.sh
# Script to start all Gateway services on the Frequency Paseo Testnet

# Function to ask for input with a default value and write to .env-saved
#ask_and_save() {
#    local var_name=${1}
#    local prompt=${2}
#    local default_value=${3}
#    read -rp $'\n'"${prompt} [${default_value}]: " input
#    local value=${input:-$default_value}
#    echo "${var_name}=\"${value}\"" >> .env-saved
#}

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null || ! command -v docker compose &> /dev/null; then
    printf "Docker and Docker Compose are required but not installed. Please install them and try again.\n"
    exit 1
fi

BASE_DIR=./
ENV_FILE=${BASE_DIR}/.env-saved
COMPOSE_PROJECT_NAME=${BASE_NAME}

if [[ -n $ENV_FILE ]]; then
    echo -e "Using environment file: $ENV_FILE\n"
fi


# Load existing .env-saved file if it exists
if [ -f .env-saved ]; then
    echo -e "Found saved environment from a previous run:\n"
    cat .env-saved
    echo
    read -p  "Do you want to re-use the saved paramters? [Y/n]: " REUSE_SAVED
    REUSE_SAVED=${REUSE_SAVED:-y}

    if [[ ${REUSE_SAVED} =~ ^[Yy] ]]
    then
      box_text -w 96 'Loading existing .env-saved file environment values...'
    else
      box_txt -w 96 'Removing previous saved environment...'
    rm .env-saved
    fi
fi

if [ ! -f .env-saved ]
then
    # Setup some variables for easy port management
    STARTING_PORT=3010
    for i in {0..10}
    do
    eval SERVICE_PORT_${i}=$(( STARTING_PORT + i ))
    export_save_variable SERVICE_PORT_${i} $(( STARTING_PORT + i ))
#    eval "export SERVICE_PORT_${i}=\${SERVICE_PORT_${i}}"
#    eval "echo SERVICE_PORT_${i}=\${SERVICE_PORT_${i}}" >> .env-saved
    done

    # Create .env-saved file to store environment variables
    box_text -w 96 'Creating .env-saved file to store environment variables... '
    echo "COMPOSE_PROJECT_NAME='gateway-dev'" >> .env-saved
    # Ask the user if they want to start on testnet or local
    read -p "Do you want to start on Frequency Paseo Testnet [y/N]: " TESTNET_ENV
    export_save_variable TESTNET_ENV ${TESTNET_ENV}
#    echo "TESTNET_ENV=\"$TESTNET_ENV\"" >> .env-saved

    if [[ $TESTNET_ENV =~ ^[Yy]$ ]]
    then
        box_text -w 96 "Setting defaults for testnet...
Hit <ENTER> to accept the default value, or,
enter new value and then hit <ENTER>"
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
    DEFAULT_IPFS_ENDPOINT="http://ipfs:5001"
    DEFAULT_IPFS_GATEWAY_URL='https://ipfs.io/ipfs/[CID]'
    DEFAULT_IPFS_BASIC_AUTH_USER=""
    DEFAULT_IPFS_BASIC_AUTH_SECRET=""
    DEFAULT_IPFS_UA_GATEWAY_URL="http://localhost:8080"
    DEFAULT_CONTENT_DB_VOLUME="content_db"


    ask_and_save FREQUENCY_API_WS_URL "Enter the Frequency API Websocket URL" "$DEFAULT_FREQUENCY_API_WS_URL"
    ask_and_save SIWF_NODE_RPC_URL "Enter the SIWF Node RPC URL" "$DEFAULT_SIWF_NODE_RPC_URL"
    box_text_attention -w 88 "A Provider is required to start the services.

If you need to become a provider, visit
https://provider.frequency.xyz/ to get a Provider ID."

    ask_and_save PROVIDER_ID "Enter Provider ID" "$DEFAULT_PROVIDER_ID"
    ask_and_save PROVIDER_ACCOUNT_SEED_PHRASE "Enter Provider Seed Phrase" "$DEFAULT_PROVIDER_ACCOUNT_SEED_PHRASE"

    box_text -w 88 "Suggestion: Change to an IPFS Pinning Service for better persistence and availability."
    if yesno "===> Given this suggestion, would you like to change the IPFS settings?"
    then
        ask_and_save IPFS_VOLUME "Enter the IPFS volume" "$DEFAULT_IPFS_VOLUME"
        ask_and_save IPFS_ENDPOINT "Enter the IPFS Endpoint" "$DEFAULT_IPFS_ENDPOINT"
        ask_and_save IPFS_GATEWAY_URL "Enter the IPFS Gateway URL" "$DEFAULT_IPFS_GATEWAY_URL"
        ask_and_save IPFS_BASIC_AUTH_USER "Enter the IPFS Basic Auth User" "$DEFAULT_IPFS_BASIC_AUTH_USER"
        ask_and_save IPFS_BASIC_AUTH_SECRET "Enter the IPFS Basic Auth Secret" "$DEFAULT_IPFS_BASIC_AUTH_SECRET"
        ask_and_save IPFS_UA_GATEWAY_URL "Enter the browser-resolveable IPFS Gateway URL" "$DEFAULT_IPFS_UA_GATEWAY_URL"
    else
    # Add the IPFS settings to the .env-saved file so defaults work with local testing
        cat >> .env-saved << EOI
IPFS_VOLUME="${DEFAULT_IPFS_VOLUME}"
IPFS_ENDPOINT="${DEFAULT_IPFS_ENDPOINT}"
IPFS_GATEWAY_URL="${DEFAULT_IPFS_GATEWAY_URL}"
IPFS_BASIC_AUTH_USER="${DEFAULT_IPFS_BASIC_AUTH_USER}"
IPFS_BASIC_AUTH_SECRET="${DEFAULT_IPFS_BASIC_AUTH_SECRET}"
IPFS_UA_GATEWAY_URL="${DEFAULT_IPFS_UA_GATEWAY_URL}"
EOI
    fi
fi
set -a; source .env-saved; set +a

if [[ ! $TESTNET_ENV =~ ^[Yy]$ ]]
then
    # Start specific services in detached mode
    echo -e "\nStarting local frequency services..."
    docker compose up -d frequency
fi

# Start all services in detached mode
echo -e "\nStarting all services..."
docker compose  --profile webhook --profile backend up -d

box_text -w 96 "🚀 You can access the Gateway at the following local addresses: 🚀
* account-service:
  - API:              http://localhost:${SERVICE_PORT_3}
  - Queue management: http://localhost:${SERVICE_PORT_3}/queues
  - Swagger UI:       http://localhost:${SERVICE_PORT_3}/docs/swagger

* content-publishing-service
  - API:              http://localhost:${SERVICE_PORT_0}
  - Queue management: http://localhost:${SERVICE_PORT_0}/queues
  - Swagger UI:       http://localhost:${SERVICE_PORT_0}/docs/swagger

* content-watcher-service
  - API:              http://localhost:${SERVICE_PORT_1}
  - Queue management: http://localhost:${SERVICE_PORT_1}/queues
  - Swagger UI:       http://localhost:${SERVICE_PORT_1}/docs/swagger

* graph-service
  - API:              http://localhost:${SERVICE_PORT_2}
  - Queue management: http://localhost:${SERVICE_PORT_2}/queues
  - Swagger UI:       http://localhost:${SERVICE_PORT_2}/docs/swagger
"
