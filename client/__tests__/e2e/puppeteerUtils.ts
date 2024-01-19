/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions */

import { Page } from "@playwright/test";

const TEST_TIMEOUT = 5000;

export async function typeInto(
  testId: string,
  text: string,
  page: Page
): Promise<void> {
  // blueprint's  typeahead is treating typing weird, clicking & waiting first solves this
  // only works for text without special characters
  const selector = page.getByTestId(testId);
  // type ahead can be annoying if you don't pause before you type
  await selector.click();
  await page.waitForTimeout(200);
  await selector.fill(text);
}

export async function clearInputAndTypeInto(
  testId: string,
  text: string,
  page: Page
): Promise<void> {
  const selector = page.getByTestId(testId);
  // only works for text without special characters
  // type ahead can be annoying if you don't pause before you type
  await selector.click();
  await page.waitForTimeout(200);
  // select all
  await selector.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");

  await selector.fill(text);
}

export async function getElementCoordinates(
  testId: string,
  label: string,
  page: Page
): Promise<[number, number]> {
  const box = await page.getByTestId(testId).getByText(label).boundingBox();
  if (!box) {
    throw new Error(`Could not find element with text "${label}"`);
  }
  return [box.x, box.y];
}

interface TryUntilConfigs {
  maxRetry?: number;
  page: Page;
  silent?: boolean;
  timeoutMs?: number;
}

const RETRY_TIMEOUT_MS = 3 * 60 * 1000;

export async function tryUntil(
  assert: () => void,
  {
    maxRetry = 50,
    timeoutMs = RETRY_TIMEOUT_MS,
    page,
    silent = false,
  }: TryUntilConfigs
): Promise<void> {
  const WAIT_FOR_MS = 200;

  const startTime = Date.now();

  let retry = 0;

  let savedError: Error = new Error();

  const hasTimedOut = () => Date.now() - startTime > timeoutMs;
  const hasMaxedOutRetry = () => retry >= maxRetry;

  while (!hasMaxedOutRetry() && !hasTimedOut()) {
    try {
      await assert();

      break;
    } catch (error) {
      retry += 1;
      savedError = error as Error;

      if (!silent) {
        console.log("⚠️ tryUntil error-----------------START");
        console.log(savedError.message);
        console.log("⚠️ tryUntil error-----------------END");
      }

      await page.waitForTimeout(WAIT_FOR_MS);
    }
  }

  if (hasMaxedOutRetry()) {
    savedError.message = `tryUntil() failed - Maxed out retries of ${maxRetry}: ${savedError.message}`;
    throw savedError;
  }

  if (hasTimedOut()) {
    savedError.message = `tryUntil() failed - Maxed out timeout of ${timeoutMs}ms: ${savedError.message}`;
    throw savedError;
  }
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions */
