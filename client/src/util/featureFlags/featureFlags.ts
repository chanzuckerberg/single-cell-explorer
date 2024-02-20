import { storageGet, storageSet } from "../../components/util/localStorage";
import { FEATURES } from "./features";

const FEATURE_FLAG_PREFIX = "cxg-ff-";

const allowedKeys = Object.values(FEATURES) as string[];

export enum BOOLEAN {
  TRUE = "yes",
  FALSE = "no",
}

export function checkFeatureFlags(): void {
  const { search } = window.location;

  if (!search) return;

  const params = new URLSearchParams(search);

  params.forEach((value, key) => {
    if (!allowedKeys.includes(key)) return;

    setFeatureFlag(key, value);
  });
}

export function getFeatureFlag(key: string): boolean {
  return storageGet(FEATURE_FLAG_PREFIX + key) === BOOLEAN.TRUE;
}

function setFeatureFlag(key: string, value: string) {
  const URLValueAsBooleanString =
    value === "true" ? BOOLEAN.TRUE : BOOLEAN.FALSE;

  storageSet(FEATURE_FLAG_PREFIX + key, URLValueAsBooleanString);
}
