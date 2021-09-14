/* eslint-disable @typescript-eslint/no-var-requires -- JS file */
const Environment = require("jest-environment-jsdom");
const { TextEncoder, TextDecoder } = require("util");

module.exports = class CustomTestEnvironment extends Environment {
  async setup() {
    await super.setup();
    // (thuang): Polyfill things JSDOM doesn't have
    // https://github.com/jsdom/jsdom/issues/2524#issuecomment-736672511
    if (typeof this.global.TextEncoder === "undefined") {
      this.global.TextEncoder = TextEncoder;
      this.global.TextDecoder = TextDecoder;
    }
  }
};
/* eslint-enable @typescript-eslint/no-var-requires -- JS file */
