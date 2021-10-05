export const KEYS = {
  COOKIE_DECISION: "cxg.cookieDecision",
  WORK_IN_PROGRESS_WARN: "cxg.WORK_IN_PROGRESS_WARN",
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export function storageGet(key: any, defaultValue = null) {
  try {
    const val = window.localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val;
  } catch (e) {
    return defaultValue;
  }
}

/*
 Removes local storage item.
 @param key - local storage key name
 */
export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // continue
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export function storageSet(key: any, value: any) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // continue
  }
}
