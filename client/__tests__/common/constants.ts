type TestEnv =
  | "local"
  | "localProd"
  | "staging"
  | "prod"
  | "rdev"
  | "happy"
  | "dev";

export const TEST_ENV: TestEnv = (process.env.TEST_ENV as TestEnv) || "local";

const TEST_ENV_TO_TEST_URL = {
  dev: "https://cellxgene.dev.single-cell.czi.technology",
  happy: "https://frontend.corporanet.local:3000",
  local: "https://localhost:3000",
  localProd: "http://localhost:9000",
  prod: "https://cellxgene.cziscience.com",
  rdev: process.env.RDEV_LINK || "",
  staging: "https://cellxgene.staging.single-cell.czi.technology",
};

export const TEST_URL = TEST_ENV_TO_TEST_URL[TEST_ENV];

export const BLUEPRINT_SAFE_TYPE_OPTIONS = { delay: 50 };

export const ERROR_NO_TEST_ID_OR_LOCATOR =
  "Either testId or locator must be defined";
