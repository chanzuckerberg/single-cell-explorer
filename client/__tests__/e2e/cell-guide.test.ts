/**
 * Smoke test suite that will be run in GHA
 * Tests included in this file are expected to be relatively stable and test core features
 *
 * (seve): `locator.click({force: true})` is required on some elements due to weirdness with bp3 elements which route clicks to non-target elements
 *          https://playwright.dev/docs/input#forcing-the-click
 */

/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { test, expect } from "@chromatic-com/playwright";

import { tryUntil } from "./puppeteerUtils";
import mockSetup from "./playwright.global.setup";

import {
  deleteGeneset,
  snapshotTestGraph,
  expandGeneset,
  expandMarkerGeneSetsHeader,
} from "./cellxgeneActions";

import { pageURLCellGuide } from "../common/constants";

import { goToPage } from "../util/helpers";

const { describe } = test;

// TODO #754
test.beforeEach(mockSetup);

describe("CellGuideCXG", () => {
  test("page launched", async ({ page }, testInfo) => {
    await goToPage(page, pageURLCellGuide);

    const element = await page.getByTestId("header").innerHTML();

    expect(element).toMatchSnapshot();

    await snapshotTestGraph(page, testInfo);
  });

  test("assert absence of 'Standard Categories' and 'Author Categories'", async ({
    page,
  }) => {
    await goToPage(page, pageURLCellGuide);

    // Check for the absence of 'Standard Categories'
    const standardCategories = await page
      .locator("text='Standard Categories'")
      .count();
    expect(standardCategories).toBe(0);

    // Check for the absence of 'Author Categories'
    const authorCategories = await page
      .locator("text='Author Categories'")
      .count();
    expect(authorCategories).toBe(0);
  });

  test("assert 'Marker Gene Sets' header is present and collapsed", async ({
    page,
  }) => {
    await goToPage(page, pageURLCellGuide);

    // Check for the presence of 'Marker Gene Sets' header
    const markerGeneSetsHeader = await page.locator(
      "h5:has-text('Marker Gene Sets')"
    );
    await expect(markerGeneSetsHeader).toBeVisible();

    // Check if the header is collapsed by looking for a child with a chevron-right icon
    const chevronRightIcon = markerGeneSetsHeader.locator(
      "svg[data-icon='chevron-right']"
    );
    await expect(chevronRightIcon).toBeVisible();
  });

  test("expansion of 'Marker Gene Sets' reveals specific genesets", async ({
    page,
  }) => {
    await goToPage(page, pageURLCellGuide);

    // Locate and expand the 'Marker Gene Sets' header
    const markerGeneSetsHeader = await page.locator(
      "h5:has-text('Marker Gene Sets')"
    );

    await tryUntil(
      async () => {
        await markerGeneSetsHeader.click(); // Assuming clicking will expand the section

        // Assert the presence of specific genesets
        const geneset1 = await page.locator(
          `div[data-testid="geneset"]:has-text("enteric smooth muscle cell")`
        );
        const geneset2 = await page.locator(
          `div[data-testid="geneset"]:has-text("smooth muscle fiber of ileum")`
        );

        await expect(geneset1).toBeVisible();
        await expect(geneset2).toBeVisible();
      },
      { page }
    );
  });

  test("expansion of 'enteric smooth muscle cell' reveals genes", async ({
    page,
  }) => {
    await goToPage(page, pageURLCellGuide);

    await expandMarkerGeneSetsHeader(page);

    // Locate and expand 'enteric smooth muscle cell' geneset
    await expandGeneset("enteric smooth muscle cell - marker genes", page);

    // Assert the presence of the genes div and that it contains 55 child divs
    const genesDiv = await page.locator(`div[data-testid="gene-set-genes"]`);
    await expect(genesDiv).toBeVisible();
    const childDivs = await genesDiv.locator(
      'div[data-testid*=":gene-expand"]'
    );
    await expect(childDivs).toHaveCount(55);
  });

  test("deleting 'enteric smooth muscle cell' geneset and refreshing adds it back", async ({
    page,
  }) => {
    await goToPage(page, pageURLCellGuide);

    await expandMarkerGeneSetsHeader(page);

    await deleteGeneset("enteric smooth muscle cell - marker genes", page);

    // Refresh the page
    await page.reload();

    await expandMarkerGeneSetsHeader(page);

    // Check if the geneset is added back
    const genesetPresence = await page.locator(
      `div[data-testid="geneset"]:has-text("enteric smooth muscle cell")`
    );
    await expect(genesetPresence).toBeVisible();
  });
});

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
