#!/bin/bash

#  See Clinic documentation for more: https://clinicjs.org/documentation/
# PREPARATION
# 1. exit your IDE and any other memory intensive applications (clinic will complain about this)
# 2. edit .env.<app> and set RATE_LIMIT_TTL to something very short, or else adjust k6 script to fall under the limits
# 3. ensure redis, ipfs, and local frequency are running and populated:
#    docker compose up -d frequency redis ipfs && make setup-account
# 3. Run `npm run build:<target_under_test>` e.g. `npm run build:content-publishing`
#
# NOTE - passing in the npm script that runs -all- of a suite of k6 tests causes clinic to hang/fail
# NOTE2 - bubbleprof is not working as of 2025-09-26

export PATH="${PATH}:./node_modules/.bin"
CMD=${1:-'doctor'}

K6=`which k6`

if [[ -z $K6 ]] ; then
  echo "k6 not found; either add to PATH or install"
  exit 1
fi

if [[ "$CMD" != "doctor" ]] && [[ "$CMD" != "flame" ]] ; then
  cat << EOF

    Usage: clinic [command] [test-script] [target]

    runs clinic <command> memory profiling tool against a nodejs target.

    - command: optional, defaults to 'doctor'
    - test-script: optional, defaults to ./dist/apps/content-publishing-api/k6-test/script_sm_files.k6.js
    - target: optional, defaults to ./apps/content-publishing-api/k6-test/script_sm_files.k6.js

EOF
exit 0
fi

export PATH=$PATH:./node_modules/.bin

dotenvx run -f .env.content-publishing -- \
  clinic ${CMD} --on-port 'k6 --quiet --no-color run ./apps/content-publishing-api/k6-test/script_sm_files.k6.js' -- \
  node dist/apps/content-publishing-api/main.js
