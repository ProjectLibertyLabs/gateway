#!/bin/bash

WATCH=
SILENT=--silent

while getopts "dw" OPTION
do
   case ${OPTION} in

      "d") SILENT=
         ;;

      "w") WATCH="--watch"
         ;;

      "?") exit 1
         ;;

   esac
done

export TOPDIR=$( dirname $( dirname $( dirname $( readlink -f ${0} ) ) ) )
pushd ${TOPDIR}/backend
npm ci
npm run build

# Make sure the correct set of services is running
set -a
. .env.dev
pm2 delete all
pm2 start --cwd ${TOPDIR} ${TOPDIR}/tools/scripts/test-pm2.config.js --only mock-service

# Run tests
echo "Running content watcher integration tests"
npm run test:e2e -- ${WATCH} ${SILENT}
popd
