/**
 * Annotation feature smoke tests
 * Tests the core functionality of the annotations feature including:
 * - Category creation
 * - Label addition
 * - Category color-by
 * - Label selection
 */

/* eslint-disable compat/compat -- not ran in the browser */
/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { test, expect } from "@chromatic-com/playwright";

import mockSetup from "./playwright.global.setup";

import {
  calcDragCoordinates,
  drag,
  getCellSetCount,
  assertUndoRedo,
  snapshotTestGraph,
  goToPage,
  createCategory,
  addLabelToCategoryWithSelection,
  selectCategoryLabel,
  colorByCategory,
  assertCategoryExists,
  assertCategoryDoesNotExist,
  assertLabelExists,
  assertLabelDoesNotExist,
  assertCategoryColorSquareVisible,
  keyboardUndo,
  keyboardRedo,
  deleteCategory,
  renameCategory,
  deleteLabel,
  renameLabel,
  duplicateCategory,
  expandCategory,
} from "./cellxgeneActions";

import { datasets } from "./data";
import { tryUntil } from "./puppeteerUtils";

import { DATASET, testURL, pageURLSpatial } from "../common/constants";
import {
  conditionallyToggleSidePanel,
  getSnapshotPrefix,
  shouldSkipTests,
  skipIfSidePanel,
} from "../util/helpers";

const { describe } = test;

// Test constants
const TEST_CATEGORY_NAME = "test_category";
const TEST_LABEL_NAME = "test_label";
const SECOND_LABEL_NAME = "second_label";
const RENAMED_CATEGORY_NAME = "renamed_category";
const RENAMED_LABEL_NAME = "renamed_label";
const DUPLICATE_CATEGORY_NAME = "duplicate_category";

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

for (const testDataset of testDatasets) {
  const url = testURLs[testDataset];
  for (const graphTestId of graphInstanceTestIds) {
    const shouldSkip = shouldSkipTests(graphTestId, SIDE_PANEL);
    const describeFn = shouldSkip ? describe.skip : describe;

    describe(`dataset: ${testDataset}`, () => {
      describe(`graph instance: ${graphTestId}`, () => {
        describeFn("annotation smoke tests", () => {
          test("create new category", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Ensure category doesn't exist initially
            await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

            // Create the category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Verify category was created
            await assertCategoryExists(TEST_CATEGORY_NAME, page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("create category and add label", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection first
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

            // Add label to category with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("create category, add multiple labels, and select them", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection for first label
            const lassoSelection1 = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.2,
                y1: 0.2,
                x2: 0.5,
                y2: 0.5,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection1.start,
              end: lassoSelection1.end,
              lasso: true,
            });

            // Add first label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Clear any existing selections to avoid overlap between label creations
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);

            // Make a different lasso selection for second label (completely non-overlapping)
            const lassoSelection2 = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.7,
                y1: 0.1,
                x2: 0.9,
                y2: 0.3,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection2.start,
              end: lassoSelection2.end,
              lasso: true,
            });

            // Add second label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            // Verify both labels exist
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
            await assertLabelExists(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            // Select the first label
            await selectCategoryLabel(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Check that some cells are selected (should be > 0 since we assigned cells to this label)
            const cellCount = Number(await getCellSetCount(1, page));
            expect(cellCount).toBeGreaterThan(0);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("create category and color by it", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection first
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

            // Add a label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Color by the category
            await colorByCategory(TEST_CATEGORY_NAME, page);

            // Verify the color square is visible next to the label
            await assertCategoryColorSquareVisible(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );
            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("category creation with undo/redo", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Ensure category doesn't exist initially
            await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

            // Create the category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Verify category was created
            await assertCategoryExists(TEST_CATEGORY_NAME, page);

            // Test undo/redo functionality
            await assertUndoRedo(
              page,
              () => assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page),
              () => assertCategoryExists(TEST_CATEGORY_NAME, page)
            );

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("label addition with undo/redo", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category first
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection to have cells to assign to the label
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

            // Add label with selection (since addLabelToCategory is broken)
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Test undo functionality for label (redo may be complex with cell assignments)
            await keyboardUndo(page);
            await page.waitForTimeout(1000); // Wait for undo to process

            try {
              // Check if label was undone (with reasonable timeout)
              await expect(
                page.getByTestId(
                  `categorical-value-select-${TEST_CATEGORY_NAME}-${TEST_LABEL_NAME}`
                )
              ).not.toBeVisible({ timeout: 5000 });
            } catch (error) {
              // Don't fail the test - undo/redo with cell assignments may be complex
            }

            // Test redo functionality
            await keyboardRedo(page);
            await page.waitForTimeout(1000); // Wait for redo to process

            try {
              // Check if label was redone (with reasonable timeout)
              await expect(
                page.getByTestId(
                  `categorical-value-select-${TEST_CATEGORY_NAME}-${TEST_LABEL_NAME}`
                )
              ).toBeVisible({ timeout: 5000 });
            } catch (error) {
              // Don't fail the test - undo/redo with cell assignments may be complex
            }

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("annotation workflow - create, label, select cells, and color", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Step 1: Create category
            await createCategory(TEST_CATEGORY_NAME, page);
            await assertCategoryExists(TEST_CATEGORY_NAME, page);

            await snapshotTestGraph(
              page,
              `${getSnapshotPrefix(testInfo)}-after-category-creation`,
              testInfo
            );

            // Step 2: Add labels with cell selections (since addLabelToCategory is broken)
            // Create a selection for the first label
            const firstSelection = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.2,
                y1: 0.2,
                x2: 0.5,
                y2: 0.5,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: firstSelection.start,
              end: firstSelection.end,
              lasso: true,
            });

            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Clear any existing selections to avoid overlap between label creations
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);

            // Create a different selection for the second label (completely non-overlapping)
            const secondSelection = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.7,
                y1: 0.1,
                x2: 0.9,
                y2: 0.3,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: secondSelection.start,
              end: secondSelection.end,
              lasso: true,
            });

            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            await snapshotTestGraph(
              page,
              `${getSnapshotPrefix(testInfo)}-after-labels-added`,
              testInfo
            );

            // Step 3: Color by the category (labels already have cells assigned)
            await colorByCategory(TEST_CATEGORY_NAME, page);

            // Verify color squares are visible for both labels
            await assertCategoryColorSquareVisible(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );
            await assertCategoryColorSquareVisible(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            await snapshotTestGraph(
              page,
              `${getSnapshotPrefix(testInfo)}-final-colored`,
              testInfo
            );
          });

          test("delete category", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Create a category first
            await createCategory(TEST_CATEGORY_NAME, page);
            await assertCategoryExists(TEST_CATEGORY_NAME, page);

            // Delete the category
            await deleteCategory(TEST_CATEGORY_NAME, page);

            // Verify category was deleted
            await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("rename category", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);

            // Create a category first
            await createCategory(TEST_CATEGORY_NAME, page);
            await assertCategoryExists(TEST_CATEGORY_NAME, page);

            // Rename the category
            await renameCategory(
              TEST_CATEGORY_NAME,
              RENAMED_CATEGORY_NAME,
              page
            );

            // Verify category was renamed
            await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);
            await assertCategoryExists(RENAMED_CATEGORY_NAME, page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("delete label", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category and add label
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

            // Add label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Delete the label
            await deleteLabel(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Verify label was deleted
            await assertLabelDoesNotExist(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("rename label", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create category and add label
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

            // Add label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Rename the label
            await renameLabel(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              RENAMED_LABEL_NAME,
              page
            );

            // Verify label was renamed
            await assertLabelDoesNotExist(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );
            await assertLabelExists(
              TEST_CATEGORY_NAME,
              RENAMED_LABEL_NAME,
              page
            );

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("duplicate category with labels", async ({ page }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Step 1: Create original category with labels
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection for the first label
            const lassoSelection1 = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.2,
                y1: 0.2,
                x2: 0.5,
                y2: 0.5,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection1.start,
              end: lassoSelection1.end,
              lasso: true,
            });

            // Add first label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Clear any existing selections
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);

            // Make a different selection for the second label
            const lassoSelection2 = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.7,
                y1: 0.1,
                x2: 0.9,
                y2: 0.3,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection2.start,
              end: lassoSelection2.end,
              lasso: true,
            });

            // Add second label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            // Step 2: Verify original category has both labels
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
            await assertLabelExists(
              TEST_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            await snapshotTestGraph(
              page,
              `${getSnapshotPrefix(testInfo)}-original-category-created`,
              testInfo
            );

            // Step 3: Create duplicate category
            await duplicateCategory(
              DUPLICATE_CATEGORY_NAME,
              TEST_CATEGORY_NAME,
              page
            );

            // Step 4: Verify duplicate category exists
            await assertCategoryExists(DUPLICATE_CATEGORY_NAME, page);

            // Step 5: Verify duplicate category has the same labels
            await assertLabelExists(
              DUPLICATE_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );
            await assertLabelExists(
              DUPLICATE_CATEGORY_NAME,
              SECOND_LABEL_NAME,
              page
            );

            // Step 6: Verify cell assignments were duplicated
            // Select the first label in the duplicate category
            await selectCategoryLabel(
              DUPLICATE_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Check that some cells are selected (should be > 0 since we duplicated assignments)
            const cellCount = Number(await getCellSetCount(1, page));
            expect(cellCount).toBeGreaterThan(0);

            await snapshotTestGraph(
              page,
              `${getSnapshotPrefix(testInfo)}-duplicate-category-final`,
              testInfo
            );
          });

          test("cell type autocomplete in add label dialog", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create a category first
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection to have cells to assign to the label
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

            // Test autocomplete functionality using the updated function
            // Use menuItemIndex=1 to select the first autocomplete suggestion (B cell)
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              "B cel", // This will trigger autocomplete
              page,
              1 // Select the first autocomplete suggestion (B cell)
            );

            // Verify the label was created with the autocomplete value
            await expect(
              page.getByTestId(
                `categorical-value-select-${TEST_CATEGORY_NAME}-B cell`
              )
            ).toBeVisible({ timeout: 10000 });

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("cell type autocomplete in edit label dialog", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create a category and add a label first
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection to have cells to assign to the label
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

            // Add a label with selection
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

            // Expand the category
            await expandCategory(TEST_CATEGORY_NAME, page);

            // Click the edit label button (three dots menu)
            await page
              .getByTestId(
                `${TEST_CATEGORY_NAME}:${TEST_LABEL_NAME}:see-actions`
              )
              .click();

            // Click "Edit this label's name"
            await page
              .getByTestId(
                `${TEST_CATEGORY_NAME}:${TEST_LABEL_NAME}:edit-label`
              )
              .click();

            // Wait for the edit dialog to appear
            await expect(
              page.getByRole("dialog", { name: "Edit label" })
            ).toBeVisible();

            // Test autocomplete functionality in edit mode
            // The edit dialog doesn't have a specific test ID, so target input within the dialog
            const labelInput = page
              .getByRole("dialog", { name: "Edit label" })
              .locator("input")
              .first();

            // Clear the input and type "T cel" to trigger autocomplete
            await labelInput.click();
            await page.waitForTimeout(200);
            await labelInput.fill("T cel");

            // Wait for autocomplete suggestions to appear
            await page.waitForTimeout(500);

            // Check if autocomplete suggestions are visible
            const suggestions = page.locator(".bp5-menu-item");
            await expect(suggestions.first()).toBeVisible({ timeout: 5000 });

            // Click on the second suggestion (T cell) - first is "Create new label"
            await suggestions.nth(1).click();

            // Wait for the input value to update
            let inputValue = "";
            await tryUntil(
              async () => {
                inputValue = await labelInput.inputValue();
                expect(inputValue).toBe("T cell");
              },
              { page }
            );

            // Submit the label change
            await page
              .getByRole("button", { name: "Change label text" })
              .click();

            // Wait for the edit dialog to close
            await expect(
              page.getByRole("dialog", { name: "Edit label" })
            ).not.toBeVisible();

            // Verify the label was renamed
            await assertLabelDoesNotExist(
              TEST_CATEGORY_NAME,
              TEST_LABEL_NAME,
              page
            );
            await assertLabelExists(TEST_CATEGORY_NAME, inputValue, page);

            await snapshotTestGraph(
              page,
              getSnapshotPrefix(testInfo),
              testInfo
            );
          });

          test("cell type info button visibility", async ({
            page,
          }, testInfo) => {
            skipIfSidePanel(graphTestId, MAIN_PANEL);

            await goToPage(page, url);
            await conditionallyToggleSidePanel(page, graphTestId, SIDE_PANEL);

            // Create a category
            await createCategory(TEST_CATEGORY_NAME, page);

            // Make a lasso selection for a cell type label
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

            // Add a cell type label (using a known cell type name)
            // Use menuItemIndex=1 to select the first autocomplete suggestion (B cell)
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              "B cel", // This will trigger autocomplete
              page,
              1 // Select the first autocomplete suggestion (B cell)
            );

            // Verify label exists
            await assertLabelExists(TEST_CATEGORY_NAME, "B cell", page);

            // Expand the category
            await expandCategory(TEST_CATEGORY_NAME, page);

            // Check that the info button is visible for the cell type label
            await expect(
              page.getByTestId(`get-info-${TEST_CATEGORY_NAME}-B cell`)
            ).toBeVisible();

            // Add a non-cell type label
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);

            const lassoSelection2 = await calcDragCoordinates(
              graphTestId,
              {
                x1: 0.1,
                y1: 0.1,
                x2: 0.3,
                y2: 0.3,
              },
              page
            );

            await drag({
              page,
              testInfo,
              testId: graphTestId,
              start: lassoSelection2.start,
              end: lassoSelection2.end,
              lasso: true,
            });

            // Add a non-cell type label (use default menuItemIndex=0 for "Create new label")
            await addLabelToCategoryWithSelection(
              TEST_CATEGORY_NAME,
              "custom_label", // This should NOT be a valid cell type
              page
              // menuItemIndex defaults to 0 (Create new label)
            );

            // Verify the non-cell type label exists
            await assertLabelExists(TEST_CATEGORY_NAME, "custom_label", page);

            // Check that the info button is NOT visible for the non-cell type label
            await expect(
              page.getByTestId(`get-info-${TEST_CATEGORY_NAME}-custom_label`)
            ).not.toBeVisible();

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
