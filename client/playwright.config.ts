import { ReporterDescription, defineConfig, devices } from "@playwright/test";
import { ChromaticConfig } from "@chromatic-com/playwright";
import { testURL } from "./__tests__/common/constants";

export const VIEWPORT_SIZE = {
  width: 1440,
  height: 960,
};

/**
 * (thuang): Add `czi-checker`, so Plausible will ignore it.
 * NOTE: This changes all browsers to use Desktop Chrome UA, so please look
 * out for bugs that could be caused by this.
 * https://github.com/matomo-org/device-detector/blob/master/regexes/bots.yml#L2762
 */
const CZI_CHECKER = " czi-checker";

/**
 * Set this environment variable to enable retry
 */
const SHOULD_RETRY = process.env.RETRY?.toLowerCase() !== "false";
if (!SHOULD_RETRY) {
  console.log('Skipping retry because "RETRY" is set to false');
}

const isHeadful =
  process.env.HEADFUL === "true" || process.env.HEADLESS === "false";

if (isHeadful) {
  console.log("Running tests in headful mode");
}
/**
 * (thuang): Playwright takes retries as part of the maxFailures count, so we
 * need to set maxFailures to a high number to allow retries.
 */
const CICD_MAX_FAILURE = 5;

// 'github' for GitHub Actions CI to generate annotations, default otherwise
const PLAYWRIGHT_REPORTER = process.env.CI
  ? ([["blob"], ["github"], ["line"]] as ReporterDescription[])
  : ([
      ["list"],
      [
        "html",
        {
          open: "failure",
          host: "localhost",
          port: 9220,
          outputFolder: "./html-reports",
        },
      ],
    ] as ReporterDescription[]);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<ChromaticConfig>({
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000,
  },
  testDir: "./__tests__",
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: "playwright-report/",
  /* Retry on CI only */
  retries: SHOULD_RETRY ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: PLAYWRIGHT_REPORTER,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /**
     * (thuang): We need to explicitly capture canvas with `snapshotTestGraph`
     * so the auto snapshot feature is not useful
     */
    disableAutoSnapshot: true,
    /**
     * (thuang): Default is `0.063`, but it's too sensitive for our use case with
     * diffing spatial image underlay.
     * @see: https://www.chromatic.com/docs/threshold/#setting-the-threshold
     */
    diffThreshold: 0.1,
    acceptDownloads: true,
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    headless: !isHeadful,
    ignoreHTTPSErrors: true,
    /**
     * Pause animation at the first frame.
     * https://www.chromatic.com/docs/animations/#css-animations
     */
    pauseAnimationAtEnd: false,
    screenshot: "only-on-failure",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",
    video: {
      mode: "retain-on-failure",
      size: VIEWPORT_SIZE,
    },
    storageState: {
      cookies: [],
      origins: [
        {
          localStorage: [
            { name: "cxg-ff-test", value: "yes" },
            { name: "cxg-ff-dl", value: "yes" },
            { name: "cxg-ff-spatial", value: "yes" },
          ],
          origin: testURL,
        },
      ],
    },
    viewport: VIEWPORT_SIZE,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: testURL,
  },
  maxFailures: process.env.CI ? CICD_MAX_FAILURE : undefined,

  timeout: 3 * 60 * 1000, // 2.5 minutes

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      testMatch: "**/e2e/*.test.ts",
      use: {
        ...devices["Desktop Chrome"],
        userAgent: devices["Desktop Chrome"].userAgent + CZI_CHECKER,
      },
    },
  ],
});
