import { storageGet, storageSet } from "../../components/util/localStorage";
import { FEATURES } from "./features";

const FEATURE_FLAG_PREFIX = "cxg-ff-";

const allowedKeys = Object.values(FEATURES) as string[];

export enum BOOLEAN {
  TRUE = "yes",
  FALSE = "no",
}

enum ParamBoolean {
  TRUE = "true",
  FALSE = "false",
}

export function checkFeatureFlags(): void {
  const params = getParams();

  if (!params) return;

  params.forEach((value, key) => {
    if (!allowedKeys.includes(key)) return;

    setFeatureFlag(key, value);
  });
}

export function getFeatureFlag(key: string): boolean {
  const params = getParams();

  const paramValue = params?.get(key);

  if (paramValue !== undefined) {
    setFeatureFlag(key, paramValue || "");
    return paramValue === ParamBoolean.TRUE;
  }

  return storageGet(FEATURE_FLAG_PREFIX + key) === BOOLEAN.TRUE;
}

function setFeatureFlag(key: string, value: string) {
  const URLValueAsBooleanString =
    value === ParamBoolean.TRUE ? BOOLEAN.TRUE : BOOLEAN.FALSE;

  storageSet(FEATURE_FLAG_PREFIX + key, URLValueAsBooleanString);
}

function getParams(): URLSearchParams | null {
  const { search } = window.location;

  if (!search) return null;

  return new URLSearchParams(search);
}
