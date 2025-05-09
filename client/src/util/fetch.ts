import * as globals from "../globals";
import { doJsonRequest } from "./actionHelpers";

export function fetchJson<T>(pathAndQuery: string, apiPrefix?: string): Promise<T> {
  if (!globals.API) throw new Error("API not initialized");
  if (!apiPrefix) apiPrefix = globals.API.prefix;
  return doJsonRequest<T>(
    `${apiPrefix}${globals.API.version}${pathAndQuery}`
  ) as Promise<T>;
}