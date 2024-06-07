import { ElementHandle, expect, Locator, Page } from "@playwright/test";

import { ERROR_NO_TEST_ID_OR_LOCATOR } from "../common/constants";
import { waitUntilNoSkeletonDetected } from "../e2e/cellxgeneActions";

export const TIMEOUT_MS = 3 * 1000;
export const WAIT_FOR_TIMEOUT_MS = 3 * 1000;

const GO_TO_PAGE_TIMEOUT_MS = 2 * 60 * 1000;

export async function goToPage(page: Page, url = ""): Promise<void> {
  await tryUntil(
    async () => {
      await Promise.all([
        page.waitForLoadState("networkidle"),
        page.goto(url, { timeout: GO_TO_PAGE_TIMEOUT_MS }),
      ]);
    },
    { page }
  );
  await waitUntilNoSkeletonDetected(page);
}

export async function scrollToPageBottom(page: Page): Promise<void> {
  return page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
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

  /*  eslint-disable no-await-in-loop -- awaits need to be sequential   */
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
  /*  eslint-enable no-await-in-loop -- awaits need to be sequential   */

  if (hasMaxedOutRetry()) {
    savedError.message = `tryUntil() failed - Maxed out retries of ${maxRetry}: ${savedError.message}`;
    throw savedError;
  }

  if (hasTimedOut()) {
    savedError.message = `tryUntil() failed - Maxed out timeout of ${timeoutMs}ms: ${savedError.message}`;
    throw savedError;
  }
}

export async function getInnerText(
  selector: string,
  page: Page
): Promise<string> {
  await tryUntil(() => page.waitForSelector(selector), { page });

  const element = (await page.$(selector)) as ElementHandle<
    SVGElement | HTMLElement
  >;

  return element.innerText();
}

export async function waitForElementToBeRemoved(
  page: Page,
  selector: string
): Promise<void> {
  await tryUntil(
    async () => {
      const element = await page.$(selector);
      await expect(element).toBeNull();
    },
    { page }
  );
}

export async function selectNthOption(
  page: Page,
  number: number
): Promise<void> {
  // (thuang): Since the first option is now active, we need to offset by 1
  const step = number - 1;

  await Promise.all(
    Array.from({ length: step }, async () => {
      await page.keyboard.press("ArrowDown");
    })
  );

  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
}

export async function waitForElement(
  page: Page,
  testId: string
): Promise<void> {
  await tryUntil(
    async () => {
      await expect(page.getByTestId(testId)).not.toHaveCount(0);
    },
    { page }
  );
}

export async function getButtonAndClick(
  page: Page,
  testID: string
): Promise<void> {
  await tryUntil(
    async () => {
      await page.getByTestId(testID).click();
    },
    { page }
  );
}

// for when there are multiple buttons with the same testID
export async function getFirstButtonAndClick(
  page: Page,
  testID: string
): Promise<void> {
  await tryUntil(
    async () => {
      const buttons = await page.getByTestId(testID).elementHandles();
      await buttons[0].click();
    },
    { page }
  );
}

export async function clickDropdownOptionByName({
  page,
  testId,
  name,
}: {
  page: Page;
  testId: string;
  name: string;
}): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole("option").filter({ hasText: name }).click();
  await page.keyboard.press("Escape");
}

// (alec) use this instead of locator.count() to make sure that the element is actually present
// when counting
export async function countLocator(locator: Locator): Promise<number> {
  return (await locator.elementHandles()).length;
}

export async function clickUntilOptionsShowUp({
  page,
  testId,
  locator,
}: {
  page: Page;
  testId?: string;
  locator?: Locator;
}): Promise<void> {
  // either testId or locator must be defined, not both
  // locator is used when the element cannot be found using just the test Id from the page
  await tryUntil(
    async () => {
      if (testId) {
        await page.getByTestId(testId).click();
      } else if (locator) {
        await locator.click();
      } else {
        throw Error(ERROR_NO_TEST_ID_OR_LOCATOR);
      }
      await page.getByRole("tooltip").getByRole("option").elementHandles();
    },
    { page }
  );
}

// (thuang): This only works when a dropdown is open
export async function selectFirstOption(page: Page): Promise<void> {
  await selectFirstNOptions(1, page);
}

export async function selectFirstNOptions(
  count: number,
  page: Page
): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, async () => {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    })
  );

  await page.keyboard.press("Escape");
}

export async function isElementVisible(
  page: Page,
  testId: string
): Promise<void> {
  await tryUntil(
    async () => {
      const element = page.getByTestId(testId);
      await element.waitFor({ timeout: WAIT_FOR_TIMEOUT_MS });
      const isVisible = await element.isVisible();
      expect(isVisible).toBe(true);
    },
    { page }
  );
}

export async function checkTooltipContent(
  page: Page,
  text: string
): Promise<void> {
  // check role tooltip is visible
  const tooltipLocator = page.getByRole("tooltip");

  await tryUntil(
    async () => {
      await tooltipLocator.waitFor({ timeout: WAIT_FOR_TIMEOUT_MS });
      const tooltipLocatorVisible = await tooltipLocator.isVisible();
      expect(tooltipLocatorVisible).toBe(true);
    },
    { page }
  );

  // check that tooltip contains text
  const tooltipText = await tooltipLocator.textContent();
  expect(tooltipText).toContain(text);
}
