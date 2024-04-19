#!/bin/sh

if [ $# -ge 2 ]
then
    launch_type=${1}
    start_process=${2}
    shift 2
else
    cat << EOI
Error: missing launch type or application name

Usage:
   ${0} <launch type> <application name>

where:
    launch type:    watch or prod
    application:    api or worker

EOI
    exit 1
fi


# Wrapper script to launch the containerized app because we need to parse the environment
exec npm run start:${start_process}:${launch_type} -- $@
