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
import { test } from "@chromatic-com/playwright";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

import mockSetup from "./playwright.global.setup";

import {
  calcDragCoordinates,
  drag,
  snapshotTestGraph,
  goToPage,
  createCategory,
  addLabelToCategoryWithSelection,
  assertCategoryExists,
  assertCategoryDoesNotExist,
  assertLabelExists,
  assertLabelDoesNotExist,
  deleteCategory,
  renameCategory,
  deleteLabel,
  renameLabel,
} from "./cellxgeneActions";
import { APP_URL_BASE } from "../common/constants";

const { describe } = test;

// Test constants
const TEST_CATEGORY_NAME = "persistence_test_category";
const TEST_LABEL_NAME = "persistence_test_label";
const SECOND_LABEL_NAME = "persistence_second_label";
const RENAMED_CATEGORY_NAME = "renamed_persistence_category";
const RENAMED_LABEL_NAME = "renamed_persistence_label";

// Use persistence test URL with /w/ dataroot
const DATASET = "pbmc3k.cxg";
const persistenceTestURL = [APP_URL_BASE, "w", DATASET, ""].join("/");

const PROJECT_ROOT =
  process.env.PROJECT_ROOT ??
  (existsSync(path.join(process.cwd(), "example-dataset"))
    ? process.cwd()
    : path.resolve(process.cwd(), ".."));

// TODO #754
test.beforeEach(mockSetup);

const SIDE_PANEL = "layout-graph-side";

const graphInstanceTestIds = ["layout-graph", "layout-graph-side"];

// Helper function to generate unique user ID for each test
function generateUniqueUserId(): string {
  return `test-user-${crypto.randomBytes(8).toString("hex")}`;
}

// Helper function to set unique user ID header for authentication
function setUserIdHeader(page: any, userId: string) {
  return page.setExtraHTTPHeaders({
    "X-Test-User-ID": userId,
  });
}

// Helper function to wait for autosave to complete
async function waitForAutosaveComplete(page: any) {
  // Wait for autosave element to exist
  await page.waitForSelector("#autosave", { timeout: 10000 });

  // Wait for at least 2.5s to ensure the autosave timer has had a chance to run
  // The timer runs every 2.5s, so we need to wait at least that long
  await page.waitForTimeout(2500);

  // Now wait for autosave to complete - it should show "autosave-complete"
  await page.waitForSelector('#autosave[data-testclass="autosave-complete"]', {
    timeout: 8000, // Allow time for network request + processing after timer fires
  });

  // Give a small buffer to ensure state is stable
  await page.waitForTimeout(500);
}

// Helper function to refresh page and wait for load
async function refreshPageAndWait(page: any) {
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // Wait for app initialization
}

// Helper function to cleanup user data after test
async function cleanupUserData(userId: string) {
  const datasetPath = path.join(
    PROJECT_ROOT,
    "example-dataset",
    DATASET,
    userId
  );

  try {
    await fs.rm(datasetPath, { recursive: true, force: true });
  } catch (error) {
    console.log(`Cleanup error (ignored): ${error}`);
  }
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

          // Wait for autosave to complete before refreshing
          await waitForAutosaveComplete(page);

          // Refresh page and verify persistence
          await refreshPageAndWait(page);
          await assertCategoryExists(TEST_CATEGORY_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(userId);
        }
      });

      test("create category and add label - persists after refresh", async ({
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

          // Wait for autosave to complete before refreshing
          await waitForAutosaveComplete(page);

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
          await cleanupUserData(userId);
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

          // Wait for autosave to complete before refreshing
          await waitForAutosaveComplete(page);

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
          await cleanupUserData(userId);
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

          // Wait for autosave after creation
          await waitForAutosaveComplete(page);

          // Delete the category
          await deleteCategory(TEST_CATEGORY_NAME, page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

          // Wait for autosave after deletion
          await waitForAutosaveComplete(page);

          // Refresh page and verify deletion persisted
          await refreshPageAndWait(page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);

          await snapshotTestGraph(
            page,
            `${testInfo.title.replace(/\s+/g, "-")}-after-refresh`,
            testInfo
          );
        } finally {
          await cleanupUserData(userId);
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

          // Wait for autosave after creation
          await waitForAutosaveComplete(page);

          // Rename the category
          await renameCategory(TEST_CATEGORY_NAME, RENAMED_CATEGORY_NAME, page);
          await assertCategoryDoesNotExist(TEST_CATEGORY_NAME, page);
          await assertCategoryExists(RENAMED_CATEGORY_NAME, page);

          // Wait for autosave after rename
          await waitForAutosaveComplete(page);

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
          await cleanupUserData(userId);
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

          // Wait for autosave after label creation
          await waitForAutosaveComplete(page);

          // Delete the label
          await deleteLabel(TEST_CATEGORY_NAME, TEST_LABEL_NAME, page);
          await assertLabelDoesNotExist(
            TEST_CATEGORY_NAME,
            TEST_LABEL_NAME,
            page
          );

          // Wait for autosave after deletion
          await waitForAutosaveComplete(page);

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
          await cleanupUserData(userId);
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

          // Wait for autosave after label creation
          await waitForAutosaveComplete(page);

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

          // Wait for autosave after rename
          await waitForAutosaveComplete(page);

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
          await cleanupUserData(userId);
        }
      });
    });
  });
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
/* eslint-enable compat/compat -- not ran in the browser */
