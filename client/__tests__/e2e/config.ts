import * as ENV_DEFAULT from "../../../environment.default.json";

export const jestEnv = process.env.JEST_ENV || ENV_DEFAULT.JEST_ENV;

export const isDev = jestEnv === ENV_DEFAULT.DEV;
export const isDebug = jestEnv === ENV_DEFAULT.DEBUG;
