module.exports = {
  "*.{js,ts,jsx,tsx}": "eslint --fix",
  "src/**/*": "prettier --write --ignore-unknown",
  "*.{ts,tsx}": "tsc --noEmit",
};
