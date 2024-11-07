#!/usr/bin/env bats

# Load the functions from start.sh
source './start.sh'
BASE_NAME="test-dev"
ENV_FILE="${BASE_DIR}/.env.${BASE_NAME}"

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

# Ensure BASE_DIR is set for tests
BASE_DIR="./test_dir"

# Clean up before tests
setup() {
    rm -rf "${BASE_DIR}"
}

# Test show_help function
@test "show_help displays usage instructions" {
    run show_help
    [ "$status" -eq 0 ]
    [[ "$output" == *"Usage: ./start.sh [options]"* ]]
}

# Test parse_arguments function
@test "parse_arguments handles --help" {
    run parse_arguments --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"Usage: ./start.sh [options]"* ]]
}

@test "parse_arguments handles --name" {
    parse_arguments --name test_project
    echo "BASE_NAME=$BASE_NAME"
    [ "$BASE_NAME" == "test_project" ]
}

@test "parse_arguments handles --skip-setup" {
    parse_arguments --skip-setup
    [ "$SKIP_CHAIN_SETUP" == "true" ]
}

# Test setup_environment function
@test "setup_environment creates BASE_DIR" {
    run setup_environment
    [ "$status" -eq 0 ]
    [ -d "${BASE_DIR}" ]
}

# Test check_dependencies function (Assuming Docker and Docker Compose are installed)
@test "check_dependencies verifies Docker and Docker Compose" {
    run check_dependencies
    [ "$status" -eq 0 ]
}

# Test handle_env_file function when ENV_FILE does not exist
@test "handle_env_file handles non-existing ENV_FILE" {
    run handle_env_file
    [ "$status" -eq 0 ]
}

# Create a mock ENV_FILE for further tests
setup_file() {
    touch "${ENV_FILE}"
}

# Test handle_env_file function when ENV_FILE exists
@test "handle_env_file handles existing ENV_FILE" {
    setup_file
    run handle_env_file
    [ "$status" -eq 0 ]
}

# Test start_services function (Mocked Docker Compose commands)
@test "start_services starts services" {
    function docker() {
        echo "Mocked docker command: $@"
    }
    run start_services
    [ "$status" -eq 0 ]
}

# Test display_services_info function
@test "display_services_info displays service information" {
    run display_services_info
    [ "$status" -eq 0 ]
}
