#!/usr/bin/env bash
set -e

client_port=${CXG_CLIENT_PORT:-`jq -r '.CXG_CLIENT_PORT' environment.default.json`}
echo -n "localhost:${client_port}/" > .test_base_url.txt

PROJECT_ROOT=$(git rev-parse --show-toplevel)

export PYTHONPATH=${PROJECT_ROOT}  # permits module discovery when run from somewhere other than top level dir

# Use multi-dataset mode with both /d/ and /w/ dataroots for testing authorization
# Both point to the same example dataset directory
# Usage: ./launch_dev_server.sh example-dataset
DATAROOT_PATH=${1:-example-dataset}

PROJECT_ROOT=${PROJECT_ROOT} python -m server.cli.launch \
    --multi-dataroots "d:${DATAROOT_PATH}" \
    --multi-dataroots "w:${DATAROOT_PATH}" \
    --debug

