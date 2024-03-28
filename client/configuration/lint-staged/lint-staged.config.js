module.exports = {
  "*.{js,ts,jsx,tsx}": [() => "tsc --project tsconfig.json", "eslint --fix"],
  "src/**/*": "prettier --write --ignore-unknown",
};
