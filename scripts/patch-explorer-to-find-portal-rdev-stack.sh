# This script applies a (temporary) patch to Explorer so that the RDev
# stack can find the associated Portal RDev stack and successfully
# make Portal API calls during manual testing.
#
# Usage patch-explorer-to-find-portal-rdev-stack.sh

cd $(git rev-parse --show-toplevel)
sed -e "s/STACK_NAME/${1}/g" scripts/explorer-with-portal-rdev.patch | patch
