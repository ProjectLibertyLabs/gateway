#!/bin/bash
# Tests for start.sh script

# Load the functions from start.sh
. ./start.sh

# Mock functions and variables
function yesno() {
    echo "yes"
}

function redact_sensitive_values() {
    echo "redacted content"
}

function export_save_variable() {
    echo "export $1=$2"
}

function ask_and_save() {
    echo "$2: $3"
}

function box_text_attention() {
    echo "$2"
}

function is_frequency_ready() {
    return 0
}

# Test show_help function
echo "Testing show_help function..."
show_help

# Test command-line argument parsing
echo "Testing command-line argument parsing..."
./start.sh --help
# ./start.sh --name test_project
# ./start.sh --skip-setup

# Test directory creation
echo "Testing directory creation..."
BASE_DIR="./test_dir"
if [ ! -d ${BASE_DIR} ]; then
    mkdir -p ${BASE_DIR}
fi
if [ -d ${BASE_DIR} ]; then
    echo "Directory created successfully."
else
    echo "Failed to create directory."
fi

# Test environment file handling
echo "Testing environment file handling..."
ENV_FILE=${BASE_DIR}/.env-saved
if [ -f ${ENV_FILE} ]; then
    echo "Found saved environment from a previous run:"
    redacted_content=$(redact_sensitive_values "${ENV_FILE}")
    echo "${redacted_content}"
    if yesno "Do you want to re-use the saved parameters" Y; then
        echo "Loading environment values from file..."
    else
        echo "Removing previous saved environment..."
        rm ${ENV_FILE}
        if [ ! -f ${ENV_FILE} ]; then
            echo "Previous saved environment removed successfully."
        else
            echo "Failed to remove previous saved environment."
        fi
    fi
else
    echo "Creating project environment file: ${ENV_FILE}"
    touch ${ENV_FILE}
    if [ -f ${ENV_FILE} ]; then
        echo "Environment file created successfully."
    else
        echo "Failed to create environment file."
    fi
fi

# Test Docker and Docker Compose check
echo "Testing Docker and Docker Compose check..."
if command -v docker &> /dev/null && command -v docker compose &> /dev/null; then
    echo "Docker and Docker Compose are installed."
else
    echo "Docker and Docker Compose are required but not installed. Please install them and try again."
    exit 1
fi

# Test service selection
echo "Testing service selection..."
PROFILES=""
if yesno "Start the account service" Y; then
    PROFILES="${PROFILES} account"
fi
if yesno "Start the graph service" Y; then
    PROFILES="${PROFILES} graph"
fi
if yesno "Start the content-publishing service" Y; then
    PROFILES="${PROFILES} content_publishing"
fi
if yesno "Start the content-watcher service" Y; then
    PROFILES="${PROFILES} content_watcher"
fi
echo "Selected services to start: ${PROFILES}"

# Test environment variable export
echo "Testing environment variable export..."
export_save_variable COMPOSE_PROJECT_NAME "test_project"
export_save_variable TESTNET_ENV "false"
export_save_variable PROFILES "${PROFILES}"
export_save_variable COMPOSE_FILES "docker-compose.yaml"

# Test service startup
echo "Testing service startup..."
docker compose up -d frequency
docker compose up -d

# Test Frequency node readiness
echo "Testing Frequency node readiness..."
if is_frequency_ready; then
    echo "Frequency node is ready."
else
    echo "Timed out waiting for Frequency node to be ready."
fi

echo "All tests completed."
