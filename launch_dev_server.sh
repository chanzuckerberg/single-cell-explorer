#!/usr/bin/env bash
set -e

PROJECT_ROOT=$(git rev-parse --show-toplevel)
PROJECT_ROOT=${PROJECT_ROOT} python -m server.cli.launch $@
