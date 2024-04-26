import { Page } from "@playwright/test";
import { DATASET_METADATA_RESPONSE } from "../__mocks__/apiMock";

// (seve): mocking required to simulate metadata coming from data-portal needed for navigation header and breadcrumbs

const setup = async ({ page }: { page: Page }) => {
  await page.route("**/*/dataset-metadata", (route, request) => {
    const { referer } = request.headers();

    route.fulfill({
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

    route.fulfill({
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
  page.on("console", (message) => {
    const messageString = JSON.stringify(message);
    if (
      message.type() === "error" &&
      // (atarashansky): hack to ignore console errors from cellguide-cxgs tests
      // for some reason, cellguide-cxgs tests cannot load certain static assets,
      // in a test env (e.g. obsoleteBrowsers.js) which causes console errors.
      !messageString.includes("cellguide-cxgs") &&
      // (atarashansky): hack to ignore console errors from plausible
      !messageString.includes("window.plausible is not a function") &&
      // (atarashansky): hack to ignore console errors that are warnings
      !messageString.includes("Warning: ")
    ) {
      throw new Error(`CLIENT SIDE ERROR: ${JSON.stringify(message)}`);
    }
  });
  page.on("pageerror", (error) => {
    throw new Error(`UNCAUGHT CLIENT ERROR: ${error}`);
  });
};

export default setup;
