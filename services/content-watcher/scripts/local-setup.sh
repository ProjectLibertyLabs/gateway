#!/bin/bash

PROJECT_NAME=cr
MODE=startup

function help() {
    cat << EOI
Usage: $( basename ${1} ) -i|-d [-s scenario] [-n project-name] [-h]

Where:
    -i              initialize services

    -d              delete services

    -n project-name 'project-name' is the prefix that will be added to container,
                    volume, and network names in Docker. (default: 'cw')

EOI
}

while getopts "hn:ids:" OPTION
do
   case ${OPTION} in

      "h") help $0
           exit 0
        ;;

      "n") PROJECT_NAME="${OPTARG}"
         ;;

      "i") MODE=startup
        ;;

      "d") MODE=teardown
        ;;

      "?") help $0
           exit 1
         ;;

   esac
done

export TOPDIR=$( dirname ${0} )/..

function teardown() {
    # Stop previously running containers
    docker compose --project-name ${PROJECT_NAME} down

    # Remove chain, ipfs & redis volumes
    docker volume rm ${PROJECT_NAME}_chainstorage 2>/dev/null
    docker volume rm ${PROJECT_NAME}_redis_data 2>/dev/null
    docker volume rm ${PROJECT_NAME}_ipfs_data 2>/dev/null

    # Stop running services
    pm2 delete ${TOPDIR}/scripts/test-pm2.config.js
}

function startup() {
    # Start containers for chain, ipfs & redis
    ## start frequency service first as we want to set the chain state
    docker compose --project-name ${PROJECT_NAME} up -d frequency

    # Set up chain scenario, i.e. set provider, delegation and schemas
    ( cd ${TOPDIR} && npm i && npm run local:init )

    # start rest of services
    docker compose --project-name ${PROJECT_NAME} up -d

    # sleep for 5 seconds to wait for chain to start and service to be registered
    sleep 5

    # publish some content
    ( cd ${TOPDIR}/scripts/content-setup && npm i && npm run main)

    # Make sure pm2 is installed
    if ! which pm2 >| /dev/null
    then
        echo "Installing pm2"
        npm i --global pm2
    fi
}

if [ ${MODE} = "startup" ]
then
    startup
else
    teardown
fi
