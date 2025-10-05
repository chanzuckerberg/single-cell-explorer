/**
 * Data persistence smoke tests
 * Tests that annotation changes persist across page refreshes by:
 * 1. Performing annotation operations (create, edit, delete)
 * 2. Refreshing the page
 * 3. Verifying the changes persisted
 *
 * Each test uses a unique user ID to avoid conflicts when running in parallel
 */

/* eslint-disable compat/compat -- not ran in the browser */
/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { test, expect } from "@chromatic-com/playwright";
import crypto from "crypto";

import mockSetup from "./playwright.global.setup";

import {
  calcDragCoordinates,
  drag,
  snapshotTestGraph,
  goToPage,
  createCategory,
  addLabelToCategoryWithSelection,
  colorByCategory,
  assertCategoryExists,
  assertCategoryDoesNotExist,
  assertLabelExists,
  assertLabelDoesNotExist,
  assertCategoryColorSquareVisible,
  deleteCategory,
  renameCategory,
  deleteLabel,
  renameLabel,
} from "./cellxgeneActions";

import { datasets } from "./data";

const { describe } = test;

// Test constants
const TEST_CATEGORY_NAME = "persistence_test_category";
const TEST_LABEL_NAME = "persistence_test_label";
const SECOND_LABEL_NAME = "persistence_second_label";
const RENAMED_CATEGORY_NAME = "renamed_persistence_category";
const RENAMED_LABEL_NAME = "renamed_persistence_label";

// Use persistence test URL with /w/ dataroot
const DATASET = "pbmc3k.cxg";
const persistenceTestURL = `http://localhost:5005/w/${DATASET}`;

// TODO #754
test.beforeEach(mockSetup);

const MAIN_PANEL = "layout-graph";
const SIDE_PANEL = "layout-graph-side";

const graphInstanceTestIds = ["layout-graph", "layout-graph-side"];

// Helper function to generate unique user ID for each test
function generateUniqueUserId(): string {
  return `test-user-${crypto.randomBytes(8).toString("hex")}`;
}

// Helper function to set unique user ID header for authentication
function setUserIdHeader(page: any, userId: string) {
  return page.setExtraHTTPHeaders({
    "X-Auth-Request-User": userId,
  });
}

// Helper function to refresh page and wait for load
async function refreshPageAndWait(page: any) {
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // Wait for app initialization
}

// Helper function to cleanup user data after test
async function cleanupUserData(page: any, userId: string) {
  // This would ideally call a cleanup API endpoint
  // For now, we rely on unique user IDs to avoid conflicts
  console.log(`Cleanup for user: ${userId}`);
}

for (const graphTestId of graphInstanceTestIds) {
  const shouldSkip = graphTestId === SIDE_PANEL; // Skip side panel tests for now
  const describeFn = shouldSkip ? describe.skip : describe;

  describe(`graph instance: ${graphTestId}`, () => {
    describeFn("data persistence smoke tests", () => {
      test("create category - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Ensure category doesn't exist initially
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

          // Create the category
          await createCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);

          // Refresh page and verify persistence
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test.only("create category and add label - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

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

          // Verify label exists before refresh
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

          // Refresh page and verify persistence
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("create category with multiple labels - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category
          await createCategory(TEST_CATEGORY_NAME, page);

          // Add first label
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

          await addLabelToCategoryWithSelection(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          // Clear selection and add second label
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);

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

          await addLabelToCategoryWithSelection(
            TEST_CATEGORY_NAME,
            SECOND_LABEL_NAME,
            page
          );

          // Verify both labels exist before refresh
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, SECOND_LABEL_NAME, page);

          // Refresh page and verify persistence
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, SECOND_LABEL_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("color by category - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category and add label
          await createCategory(TEST_CATEGORY_NAME, page);

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

          // Color by the category
          await colorByCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryColorSquareVisible(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          // Refresh page and verify persistence
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertCategoryColorSquareVisible(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("delete category - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category first
          await createCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);

          // Delete the category
          await deleteCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

          // Refresh page and verify deletion persisted
          await refreshPageAndWait(page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("rename category - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category first
          await createCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);

          // Rename the category
          await renameCategory(TEST_CATEGORY_NAME, RENAMED_CATEGORY_NAME, page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(RENAMED_CATEGORY_NAME, page);

          // Refresh page and verify rename persisted
          await refreshPageAndWait(page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(RENAMED_CATEGORY_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("delete label - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category and add label
          await createCategory(TEST_CATEGORY_NAME, page);

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

          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

          // Delete the label
          await deleteLabel(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelDoesNotExist(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          // Refresh page and verify deletion persisted
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelDoesNotExist(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("rename label - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Create category and add label
          await createCategory(TEST_CATEGORY_NAME, page);

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

          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);

          // Rename the label
          await renameLabel(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            RENAMED_LABEL_NAME,
            page
          );

          await assertLabelDoesNotExist(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );
          await assertLabelExists(TEST_CATEGORY_NAME, RENAMED_LABEL_NAME, page);

          // Refresh page and verify rename persisted
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelDoesNotExist(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );
          await assertLabelExists(TEST_CATEGORY_NAME, RENAMED_LABEL_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });

      test("complex workflow with multiple operations - persists after refresh", async ({
        page,
      }, testInfo) => {
        const userId = generateUniqueUserId();
        await setUserIdHeader(page, userId);

        try {
          await goToPage(page, persistenceTestURL);

          // Step 1: Create category and add multiple labels
          await createCategory(TEST_CATEGORY_NAME, page);

          // Add first label
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

          // Add second label
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);

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

          // Step 2: Color by category
          await colorByCategory(TEST_CATEGORY_NAME, page);

          // Verify initial state
          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, SECOND_LABEL_NAME, page);
          await assertCategoryColorSquareVisible(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          // Step 3: Refresh and verify everything persisted
          await refreshPageAndWait(page);

          await assertCategoryExists(TEST_CATEGORY_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelExists(TEST_CATEGORY_NAME, SECOND_LABEL_NAME, page);
          await assertCategoryColorSquareVisible(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(page, userId);
        }
      });
    });
  });
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
/* eslint-enable compat/compat -- not ran in the browser */
