import { ConsoleMessage, Page } from "@playwright/test";
import { DATASET_METADATA_RESPONSE } from "../__mocks__/apiMock";

const LOCAL_CONSOLE_ERROR_IGNORE_LIST = [
  "window.plausible is not a function",
  "net::ERR_NETWORK_CHANGED",
  "To locate the bad setState() call inside",
  /**
   * (thuang): Deep zoom tile load sometimes fails temporarily
   */
  "Image load aborted",
  "TileSource",
  /**
   * (thuang): Sometimes `obsoleteBrowsers.js` fails to load temporarily
   */
  "obsoleteBrowsers.js",
  /**
   * (thuang): Sometimes Google Font fails to load temporarily
   */
  "https://fonts.googleapis.com",
  "Warning: ReactDOM.render is no longer supported in React 18. ",
];

// (seve): mocking required to simulate metadata coming from data-portal needed for navigation header and breadcrumbs

const setup = async ({ page }: { page: Page }) => {
  await page.route("**/*/dataset-metadata", async (route, request) => {
    const { referer } = request.headers();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DATASET_METADATA_RESPONSE),
      // (thuang): Add headers so FE@localhost:3000 can access API@localhost:5000
      headers: {
        "Access-Control-Allow-Origin": referer.slice(0, referer.length - 1),
        "Access-Control-Allow-Credentials": "true",
      },
    });
  });
  await page.route("**/*/config", async (route, request) => {
    const { referer } = request.headers();
    const response = await route.fetch();
    const json = await response.json();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        config: {
          ...json.config,
          links: {
            ...json.config.links,
            "collections-home-page":
              "https://cellxgene.cziscience.com/dummy-collection",
          },
        },
      }),
      headers: {
        "Access-Control-Allow-Origin": referer.slice(0, referer.length - 1),
        "Access-Control-Allow-Credentials": "true",
      },
    });
  });
  /**
   * Purpose: Captures console messages such as console.log, console.error, console.warn, etc.
   * Use Case: Useful for debugging or monitoring what is being logged to the console by the web page
   */
  page.on("console", (message) => {
    // if this is running locally don't fail on error
    if (
      process.env.CI !== "true" &&
      isKnownErrors(message, LOCAL_CONSOLE_ERROR_IGNORE_LIST)
    ) {
      return;
    }

    if (message.type() === "error") {
      throw new Error(
        `"console.error" ERROR: ${message.text()}. Full object: ${JSON.stringify(
          message
        )}`
      );
    }
  });
  /**
   * Purpose: Captures unhandled exceptions that occur on the page.
   * Use Case: Useful for detecting and debugging runtime errors in the web page's JavaScript
   */
  page.on("pageerror", (error) => {
    // if this is running locally don't fail on error
    if (process.env.CI !== "true") {
      return;
    }
    throw new Error(`"pageerror" UNCAUGHT JS exception: ${error}`);
  });
};

export default setup;

function isKnownErrors(message: ConsoleMessage, errorList: string[]) {
  return errorList.some((error) => JSON.stringify(message).includes(error));
}
