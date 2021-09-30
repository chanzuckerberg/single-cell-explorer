/* App dependencies */
import { storageGet, storageRemove, storageSet } from "./localStorage";

/*
 Single use local storage with expiry.
 @param key - local storage key name
 @returns boolean
 */
export function storageGetWithExpiry(key: string): boolean {
  const storeValue = storageGet(key);
  storageRemove(key);

  try {
    if (storeValue) {
      const now = new Date();
      const expiryTime = JSON.parse(storeValue);
      return now.getTime() < expiryTime;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/*
 Sets local storage with expiry.
 @param key - local storage key name
 @param timeout - time in ms
 */
export function storageSetWithExpiry(key: string, timeout: number): void {
  const now = new Date();
  const expiryTime = now.getTime() + timeout;
  storageSet(key, JSON.stringify(expiryTime));
}
