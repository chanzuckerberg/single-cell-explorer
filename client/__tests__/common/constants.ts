import * as ENV_DEFAULT from "../../../environment.default.json";

export const DATASET = "pbmc3k.cxg";
export const DATASET_TRUNCATE = "truncation-test.cxg";

export const APP_URL_BASE =
  process.env.CXG_URL_BASE || `http://localhost:${ENV_DEFAULT.CXG_CLIENT_PORT}`;

const DEFAULT_BASE_PATH = "d";
export const TEST_URL = APP_URL_BASE.includes("localhost")
  ? [APP_URL_BASE, DEFAULT_BASE_PATH, DATASET].join("/")
  : APP_URL_BASE;
console.log(`TEST_URL: ${TEST_URL}`);
export const PAGE_URL_TRUNCATE = [
  APP_URL_BASE,
  DEFAULT_BASE_PATH,
  DATASET_TRUNCATE,
].join("/");

export const BLUEPRINT_SAFE_TYPE_OPTIONS = { delay: 50 };

export const ERROR_NO_TEST_ID_OR_LOCATOR =
  "Either testId or locator must be defined";
