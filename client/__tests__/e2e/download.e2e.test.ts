/**
 * Download feature smoke tests
 * Tests the core functionality of the download feature including:
 * - Categories CSV download
 * - Gene sets CSV download
 * - Current view PNG download
 * - Download menu interactions
 */

/* eslint-disable compat/compat -- not ran in the browser */
/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { test, expect } from "@chromatic-com/playwright";
import { Download, Page } from "@playwright/test";
import fs from "fs/promises";

import mockSetup from "./playwright.global.setup";

import {
  calcDragCoordinates,
  drag,
  goToPage,
  createCategory,
  addLabelToCategoryWithSelection,
  createGeneset,
  addGeneToSet,
  assertCategoryExists,
  assertLabelExists,
  snapshotTestGraph,
} from "./cellxgeneActions";

import { datasets } from "./data";

import { DATASET, testURL, pageURLSpatial } from "../common/constants";
import {
  conditionallyToggleSidePanel,
  getSnapshotPrefix,
  shouldSkipTests,
  skipIfSidePanel,
} from "../util/helpers";

import { tryUntil } from "./puppeteerUtils";

const { describe } = test;

// Test constants
const TEST_CATEGORY_NAME = "download_test_category";
const TEST_LABEL_NAME = "download_test_label";
const TEST_GENESET_NAME = "download_test_geneset";
const TEST_GENESET_DESCRIPTION = "Test geneset for download testing";
const TEST_GENE = "CD79A";

// TODO #754
test.beforeEach(mockSetup);

const SPATIAL_DATASET = "super-cool-spatial.cxg";

const MAIN_PANEL = "layout-graph";
const SIDE_PANEL = "layout-graph-side";

const testDatasets = [DATASET, SPATIAL_DATASET] as (keyof typeof datasets)[];

const graphInstanceTestIds = ["layout-graph", "layout-graph-side"];

const testURLs = {
  [DATASET]: testURL,
  [SPATIAL_DATASET]: pageURLSpatial,
};

// Helper function to open download menu
async function openDownloadMenu(page: Page): Promise<void> {
  await page.getByTestId("download-menu-button").click();
  // Wait for the menu to be visible
  await page.waitForSelector('[role="menu"]', { timeout: 5000 });
}

// Helper function to download categories CSV and wait for completion
async function downloadCategoriesCSVAndWait(
  page: Page,
  expectedContent?: string
): Promise<string> {
  const downloads: Download[] = [];

  // Set up download listener BEFORE triggering the download
  page.on("download", (downloadData) => {
    downloads.push(downloadData);
  });

  await openDownloadMenu(page);

  // Wait for the menu item to be visible and clickable
  const menuItem = page.getByText("Categories & label annotations (.csv)");
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  await menuItem.click();

  // Wait for download to start and complete
  await tryUntil(
    async () => {
      expect(downloads.length).toBeGreaterThan(0);
      const download = downloads[downloads.length - 1];
      expect(download.suggestedFilename()).toContain("categories_annotations");
    },
    { page, timeoutMs: 10000 }
  );

  const download = downloads[downloads.length - 1];
  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Download path is null");
  }

  // Verify file exists and has content
  const fileContent = await fs.readFile(downloadPath, "utf-8");
  expect(fileContent.length).toBeGreaterThan(0);

  if (expectedContent) {
    expect(fileContent).toContain(expectedContent);
  }

  return fileContent;
}

// Helper function to download gene sets CSV and wait for completion
async function downloadGeneSetsCSVAndWait(
  page: Page,
  expectedContent?: string
): Promise<string> {
  const downloads: Download[] = [];

  // Set up download listener BEFORE triggering the download
  page.on("download", (downloadData) => {
    downloads.push(downloadData);
  });

  await openDownloadMenu(page);

  // Wait for the menu item to be visible and clickable
  const menuItem = page.getByText("Gene set annotations (.csv)");
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  await menuItem.click();

  // Wait for download to start and complete
  await tryUntil(
    async () => {
      expect(downloads.length).toBeGreaterThan(0);
      const download = downloads[downloads.length - 1];
      expect(download.suggestedFilename()).toContain("gene_sets_annotations");
    },
    { page, timeoutMs: 10000 }
  );

  const download = downloads[downloads.length - 1];
  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Download path is null");
  }

  // Verify file exists and has content
  const fileContent = await fs.readFile(downloadPath, "utf-8");
  expect(fileContent.length).toBeGreaterThan(0);

  if (expectedContent) {
    expect(fileContent).toContain(expectedContent);
  }

  return fileContent;
}

// Helper function to download current view PNG and wait for completion
async function downloadCurrentViewPNGAndWait(page: Page): Promise<void> {
  const downloads: Download[] = [];

  // Set up download listener BEFORE triggering the download
  page.on("download", (downloadData) => {
    downloads.push(downloadData);
  });

  await openDownloadMenu(page);

  // Wait for the menu item to be visible and clickable
  const menuItem = page.getByText("Current view (.png)");
  await expect(menuItem).toBeVisible({ timeout: 5000 });
  await menuItem.click();

  // Wait for download to start and complete
  await tryUntil(
    async () => {
      expect(downloads.length).toBeGreaterThan(0);
      const download = downloads[downloads.length - 1];
      expect(download.suggestedFilename()).toContain(".png");
    },
    { page, timeoutMs: 10000 }
  );
}

for (const testDataset of testDatasets) {
  const url = testURLs[testDataset];
  for (const graphTestId of graphInstanceTestIds) {
    const shouldSkip = shouldSkipTests(graphTestId, SIDE_PANEL);
    const describeFn = shouldSkip ? describe.skip : describe;

    describe(`dataset: ${testDataset}`, () => {
      describe(`graph instance: ${graphTestId}`, () => {
        describeFn("download smoke tests", () => {
          test("download categories CSV with annotations", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category and add label with cells
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection for the label
            const lassoSelection = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.3,
                y1: 0.3,
                x2: 0.7,
                y2: 0.7,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection.start,
              end: lassoSelection.end,
              lasso: true,
            });

            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify category and label exist
            await assertCategoryExists(TEST_CATEGORY_NAME, page);
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Download categories CSV
            const csvContent = await downloadCategoriesCSVAndWait(
              page,
              TEST_CATEGORY_NAME
            );

            // Verify CSV structure
            expect(csvContent).toContain("Cell Index");
            expect(csvContent).toContain("Author Categories");
            expect(csvContent).toContain("User Categories");
            expect(csvContent).toContain(TEST_CATEGORY_NAME);
            expect(csvContent).toContain(TEST_LABEL_NAME);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("download gene sets CSV with genesets", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create geneset and add gene
            await createGeneset(
              TEST_GENESET_NAME,
              page,
              TEST_GENESET_DESCRIPTION
            );

            // Add a gene to the geneset
            await addGeneToSet(TEST_GENESET_NAME, TEST_GENE, page);

            // Download gene sets CSV
            const csvContent = await downloadGeneSetsCSVAndWait(
              page,
              TEST_GENESET_NAME
            );

            // Verify CSV structure
            expect(csvContent).toContain("Gene Set Name");
            expect(csvContent).toContain("Gene Set Description");
            expect(csvContent).toContain("Gene Symbol");
            expect(csvContent).toContain("Gene Description");
            expect(csvContent).toContain(TEST_GENESET_NAME);
            expect(csvContent).toContain(TEST_GENESET_DESCRIPTION);
            expect(csvContent).toContain(TEST_GENE);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("download current view PNG", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Download current view PNG
            await downloadCurrentViewPNGAndWait(page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("download menu interactions", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Test menu opening and closing
            await openDownloadMenu(page);
            await expect(page.getByText("Current view (.png)")).toBeVisible();
            await expect(
              page.getByText("Categories & label annotations (.csv)")
            ).toBeVisible();
            await expect(
              page.getByText("Gene set annotations (.csv)")
            ).toBeVisible();
            await expect(
              page.getByText("Workflow-processed anndata (.h5ad)")
            ).toBeVisible();

            // Test disabled h5ad option
            const h5adOption = page.getByText(
              "Workflow-processed anndata (.h5ad)"
            );
            await expect(h5adOption).toBeVisible();
            // The option should be disabled (this might need adjustment based on actual implementation)

            // Close menu by clicking the download button again
            await page.getByTestId("download-menu-button").click();
            await expect(page.locator('[role="menu"]')).not.toBeVisible();

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("download with empty data", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Download categories CSV with no user annotations
            const categoriesCsv = await downloadCategoriesCSVAndWait(page);

            // Should still contain standard categories
            expect(categoriesCsv).toContain("Cell Index");
            expect(categoriesCsv).toContain("Author Categories");

            // Download gene sets CSV with no genesets
            const genesetsCsv = await downloadGeneSetsCSVAndWait(page);

            // Should contain headers but no data rows
            expect(genesetsCsv).toContain("Gene Set Name");
            expect(genesetsCsv).toContain("Gene Set Description");
            expect(genesetsCsv).toContain("Gene Symbol");
            expect(genesetsCsv).toContain("Gene Description");

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });
        });
      });
    });
  }
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
/* eslint-enable compat/compat -- not ran in the browser */
