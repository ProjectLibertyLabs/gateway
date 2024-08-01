#!/bin/sh

launch_type=${1}
shift

# Wrapper script to launch the containerized app because we need to parse the environment
exec npm run start:${START_PROCESS}:${launch_type} -- $@
