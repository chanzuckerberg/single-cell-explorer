cd $(git rev-parse --show-toplevel)
sed -e "s/STACK_NAME/${1}/g" scripts/explorer-with-portal-rdev.patch | patch
