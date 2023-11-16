#!/bin/bash

PROFILE=instant
PROJECT_NAME=cr
MODE=startup

function help() {
    cat << EOI
Usage: $( basename ${1} ) -i|-d [-s scenario] [-p profile-name] [-n project-name] [-h]

Where:
    -i              initialize services

    -d              delete services

    -p profile-name 'profile-name' is the name of a Docker profile from
                    docker-compose.dev.yaml. Options are:
                        'instant'   - Use an instant-seal Frequency node (default)
                        'interval'  - Use an interval-seal Frequency node

    -n project-name 'project-name' is the prefix that will be added to container,
                    volume, and network names in Docker. (default: 'cw')

EOI
}

while getopts "hp:n:ids:" OPTION
do
   case ${OPTION} in

      "h") help $0
           exit 0
        ;;

      "n") PROJECT_NAME="${OPTARG}"
         ;;

      "p") if [ "${OPTARG}" = "''" ]
           then
              PROFILE=
           else
              PROFILE="${OPTARG}"
           fi
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

if [ -n "${PROFILE}" ]
then
    if [[ ${PROFILE} = "interval" || ${PROFILE} = "instant" ]]
    then
        PROFILE="--profile ${PROFILE}"
    else
        echo "Invalid profile specified: ${PROFILE}"
        help $0
        exit 1
    fi
else
    PROFILE="--profile interval"
fi

export TOPDIR=$( dirname ${0} )/..

function teardown() {
    # Stop previously running containers
    docker compose --project-name ${PROJECT_NAME} -f ${TOPDIR}/docker-compose.dev.yaml ${PROFILE} down

    # Remove chain, ipfs & redis volumes
    docker volume rm ${PROJECT_NAME}_chainstorage 2>/dev/null
    docker volume rm ${PROJECT_NAME}_redis_data 2>/dev/null
    docker volume rm ${PROJECT_NAME}_ipfs_data 2>/dev/null

    # Stop running services
    pm2 delete ${TOPDIR}/scripts/test-pm2.config.js
}

function startup() {
    # Start containers for chain & DB
    docker compose --project-name ${PROJECT_NAME} -f ${TOPDIR}/docker-compose.dev.yaml ${PROFILE} up -d

    # Set up chain scenario
    ( cd ${TOPDIR}/scripts/chain-setup && npm i && npm run main)

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
