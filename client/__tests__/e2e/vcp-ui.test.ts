/**
 * Smoke test suite for VCP deployment-specific UI features
 * Tests included in this file verify that VCP-specific UI elements
 * appear correctly when the is_vcp_deployment flag is enabled
 *
 * Note: These tests require a test environment configured with is_vcp_deployment: true
 * to verify the VCP-specific UI behavior.
 */

/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { test, expect } from "@chromatic-com/playwright";

import mockSetup from "./playwright.global.setup";

import {
  goToPage,
  createCategory,
  assertCategoryExists,
} from "./cellxgeneActions";

import { testURL } from "../common/constants";

const { describe } = test;
/* eslint-enable no-await-in-loop -- re-enable after imports */

// TODO #754
test.beforeEach(mockSetup);

describe("VCP Deployment UI", () => {
  test.skip("assert presence of 'Dataset Categories' section when VCP deployment is enabled", async ({
    page,
  }) => {
    // Note: This test should be run with is_vcp_deployment: true in config
    // For now, skipping until we have a VCP test environment
    await goToPage(page, testURL);

    // Check for the presence of 'Dataset Categories' section
    const datasetCategories = await page
      .locator("text='Dataset Categories'")
      .count();
    expect(datasetCategories).toBeGreaterThan(0);
  });

  test.skip("assert presence of 'User Categories' section when VCP deployment is enabled and user category exists", async ({
    page,
  }) => {
    // Note: This test should be run with is_vcp_deployment: true in config
    // For now, skipping until we have a VCP test environment
    await goToPage(page, testURL);

    // Create a user category to ensure the section appears
    const TEST_CATEGORY_NAME = "vcp_test_category";
    await createCategory(TEST_CATEGORY_NAME, page);
    await assertCategoryExists(TEST_CATEGORY_NAME, page);

    // Check for the presence of 'User Categories' section
    const userCategories = await page.locator("text='User Categories'").count();
    expect(userCategories).toBeGreaterThan(0);
  });

  test.skip("assert absence of 'Standard Categories' and 'Author Categories' when VCP deployment is enabled", async ({
    page,
  }) => {
    // Note: This test should be run with is_vcp_deployment: true in config
    // For now, skipping until we have a VCP test environment
    await goToPage(page, testURL);

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

  test.skip("assert collection links are hidden in dataset info panel when VCP deployment is enabled", async ({
    page,
  }) => {
    // Note: This test should be run with is_vcp_deployment: true in config
    // For now, skipping until we have a VCP test environment
    await goToPage(page, testURL);

    // Open the dataset info panel
    await page.getByTestId("info-icon").click();

    // Verify that collection links are not present
    // Collection links typically include elements like "View in Portal" or similar
    const collectionLinks = await page
      .locator("a[href*='cellxgene.cziscience.com']")
      .count();
    expect(collectionLinks).toBe(0);
  });
});

describe("Non-VCP Deployment UI (Default)", () => {
  test("assert presence of 'Standard Categories' or individual categories when VCP deployment is disabled", async ({
    page,
  }) => {
    // This test verifies the default behavior (is_vcp_deployment: false)
    await goToPage(page, testURL);

    // In non-VCP mode, we should see either 'Standard Categories' or individual category names
    // (depending on writableCategoriesEnabled and isCellGuideCxg flags)
    const standardCategories = await page
      .locator("text='Standard Categories'")
      .count();

    // Also check for presence of actual category elements (fallback check)
    const categoryElements = await page
      .getByTestId(/^.*:category-expand$/)
      .count();

    // At least one should be present
    expect(standardCategories + categoryElements).toBeGreaterThan(0);
  });

  test("assert 'Dataset Categories' section is absent when VCP deployment is disabled", async ({
    page,
  }) => {
    // This test verifies the default behavior (is_vcp_deployment: false)
    await goToPage(page, testURL);

    // Check for the absence of VCP-specific 'Dataset Categories' section
    const datasetCategories = await page
      .locator("text='Dataset Categories'")
      .count();
    expect(datasetCategories).toBe(0);
  });
});
