module.exports = {
  "*.{js,ts,jsx,tsx}": [
    // (thuang): Run tsc against the whole project, so we get all the type information
    () => "tsc --project tsconfig.json",
    "eslint --fix",
  ],
  "src/**/*": "prettier --write --ignore-unknown",
};
