import { chromium, test } from "@playwright/test";

import { DATASET_METADATA_RESPONSE } from "../__mocks__/apiMock";

test.beforeAll(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.route("*/dataset-metadata", (route, request) => {
    const { referer } = request.headers();

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DATASET_METADATA_RESPONSE),
      // (thuang): Add headers so FE@localhost:3000 can access API@localhost:5000
      headers: {
        "Access-Control-Allow-Origin": referer.slice(0, referer.length - 1),
        "Access-Cqontrol-Allow-Credentials": "true",
      },
    });
  });
  await context.route("*/config", async (route, request) => {
    const { referer } = request.headers();
    const body = await (await fetch(request.url())).json();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        config: {
          ...body.config,
          links: {
            ...body.config.links,
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
});
