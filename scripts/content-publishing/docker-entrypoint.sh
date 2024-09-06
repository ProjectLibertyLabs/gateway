#!/bin/sh

# Wrapper script to launch the containerized app because we need to parse the environment
exec npm run start:${START_PROCESS}:prod -- $@
