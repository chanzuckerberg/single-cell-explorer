import * as ENV_DEFAULT from "../../../environment.default.json";

export const DATASET = "pbmc3k.cxg";
export const DATASET_TRUNCATE = "truncation-test.cxg";
export const SPATIAL_DATASET = "super-cool-spatial.cxg";
export const CELL_GUIDE_DATASET = "example.cxg";
export const CELLGUIDE_CXGS_PATH = "cellguide-cxgs";
export const APP_URL_BASE =
  process.env.CXG_URL_BASE || `http://localhost:${ENV_DEFAULT.CXG_CLIENT_PORT}`;

const DEFAULT_BASE_PATH = "d";

export const testURL = [APP_URL_BASE, DEFAULT_BASE_PATH, DATASET, ""].join("/");

export const pageURLTruncate = [
  APP_URL_BASE,
  DEFAULT_BASE_PATH,
  DATASET_TRUNCATE,
  "",
].join("/");

export const pageURLSpatial = [
  APP_URL_BASE,
  DEFAULT_BASE_PATH,
  SPATIAL_DATASET,
  "",
].join("/");

export const pageURLCellGuide = [
  APP_URL_BASE,
  DEFAULT_BASE_PATH,
  CELLGUIDE_CXGS_PATH,
  CELL_GUIDE_DATASET,
  "",
].join("/");

export const BLUEPRINT_SAFE_TYPE_OPTIONS = { delay: 50 };

export const ERROR_NO_TEST_ID_OR_LOCATOR =
  "Either testId or locator must be defined";
