import { Page } from "@playwright/test";
import { DATASET_METADATA_RESPONSE } from "../__mocks__/apiMock";

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
  page.on("console", (message) => {
    // if this is running locally don't fail on error
    if (process.env.CI !== "true") {
      return;
    }

    if (message.type() === "error") {
      throw new Error(`CLIENT SIDE ERROR: ${JSON.stringify(message)}`);
    }
  });
  page.on("pageerror", (error) => {
    // if this is running locally don't fail on error
    if (process.env.CI !== "true") {
      return;
    }
    throw new Error(`UNCAUGHT CLIENT ERROR: ${error}`);
  });
};

export default setup;
