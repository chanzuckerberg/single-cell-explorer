/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { Page, TestInfo, expect } from "@playwright/test";
import { Classes } from "@blueprintjs/core";
import { takeSnapshot } from "@chromatic-com/playwright";
import { clearInputAndTypeInto, tryUntil, typeInto } from "./puppeteerUtils";
import {
  GRAPH_AS_IMAGE_TEST_ID,
  LAYOUT_CHOICE_TEST_ID,
} from "../../src/util/constants";
import { getSnapshotPrefix } from "../util/helpers";
import { VIEWPORT_SIZE } from "../../playwright.config";

interface Coordinate {
  x: number;
  y: number;
}

const WAIT_FOR_SWITCH_LAYOUT_MS = 2_000;

const GO_TO_PAGE_TIMEOUT_MS = 2 * 60 * 1000;

export async function goToPage(page: Page, url = ""): Promise<void> {
  await tryUntil(
    async () => {
      await Promise.all([
        page.waitForLoadState("networkidle"),
        page.goto(url, { timeout: GO_TO_PAGE_TIMEOUT_MS }),
      ]);
    },
    { page }
  );

  await waitUntilNoSkeletonDetected(page);

  await resizeWindow(page);
}

/**
 * @param snapshotName - The name of the snapshot. This is optional for cases
 * you don't need a snapshot after the action.
 */
export async function drag({
  testId,
  testInfo,
  start,
  end,
  page,
  lasso = false,
  snapshotName,
}: {
  testId: string;
  testInfo: TestInfo;
  start: Coordinate;
  end: Coordinate;
  page: Page;
  lasso?: boolean;
  snapshotName?: string;
}): Promise<void> {
  const layout = await page.getByTestId(testId);
  const box = await layout.boundingBox();

  if (!box) throw new Error("bounding box not found");

  const x1 = box.x + start.x;
  const x2 = box.x + end.x;
  const y1 = box.y + start.y;
  const y2 = box.y + end.y;

  await page.mouse.move(x1, y1);
  await page.mouse.down();

  if (lasso) {
    await page.mouse.move(x2, y1);
    await page.mouse.move(x2, y2);
    await page.mouse.move(x1, y2);
    await page.mouse.move(x1, y1);
  } else {
    await page.mouse.move(x2, y2);
  }

  await page.mouse.up();

  if (snapshotName) {
    await snapshotTestGraph(page, snapshotName, testInfo);
  }
}

export async function scroll({
  testId,
  deltaY,
  coords,
  page,
}: {
  testId: string;
  deltaY: number;
  coords: number[];
  page: Page;
}): Promise<void> {
  await page.getByTestId(testId).waitFor();
  const x = coords[0];
  const y = coords[1];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.wheel(0, deltaY);
}

export async function keyboardUndo(page: Page): Promise<void> {
  if (process.platform === "darwin") {
    await page.keyboard.press("Meta+KeyZ");
  } else {
    await page.keyboard.press("Control+KeyZ");
  }
}

export async function keyboardRedo(page: Page): Promise<void> {
  if (process.platform === "darwin") {
    await page.keyboard.press("Meta+Shift+KeyZ");
  } else {
    await page.keyboard.press("Control+Shift+KeyZ");
  }
}

const BLUEPRINT_SKELETON_CLASS_NAME = Classes.SKELETON;

export async function waitUntilNoSkeletonDetected(page: Page): Promise<void> {
  await tryUntil(
    async () => {
      const skeleton = await page
        .locator(`.${BLUEPRINT_SKELETON_CLASS_NAME}`)
        .all();
      expect(skeleton).toHaveLength(0);
    },
    {
      page,
      /**
       * (thuang): The diff exp test needs more retry, since the API call takes
       * some time to complete.
       */
      maxRetry: 300,
    }
  );
}

export async function clickOnCoordinate(
  testId: string,
  coord: Coordinate,
  page: Page
): Promise<void> {
  const elBox = await page.getByTestId(testId).boundingBox();

  if (!elBox) {
    throw Error("Layout's boxModel is not available!");
  }

  const x = elBox.x + coord.x;
  const y = elBox.y + coord.y;
  await page.mouse.click(x, y);
}

export async function getAllCategoriesAndCounts(
  category: string,
  page: Page
): Promise<{ [cat: string]: string }> {
  // these load asynchronously, so we have to wait for the specific category.
  const categoryRows = await page
    .getByTestId(`category-${category}`)
    .getByTestId("categorical-row")
    .all();

  const arrayOfLabelsAndCounts = await Promise.all(
    categoryRows.map(async (row): Promise<[string, string]> => {
      const cat = await row
        .getByTestId("categorical-value")
        .getAttribute("aria-label");

      if (!cat) throw new Error("category value not found");

      const count: string = await row
        .getByTestId("categorical-value-count")
        .innerText();

      return [cat, count];
    })
  );

  return Object.fromEntries(arrayOfLabelsAndCounts);
}

export async function expandMarkerGeneSetsHeader(page: Page): Promise<void> {
  // Locate and expand the 'Marker Gene Sets' header if not already expanded
  const markerGeneSetsHeader = await page.locator(
    "h5:has-text('Marker Gene Sets')"
  );
  const chevronDownIcon = markerGeneSetsHeader.locator(
    "svg[data-icon='chevron-down']"
  );
  await tryUntil(
    async () => {
      if ((await chevronDownIcon.count()) === 0) {
        await markerGeneSetsHeader.click();
      }
      const count = await chevronDownIcon.count();
      expect(count).toBeGreaterThan(0);
    },
    { page }
  );
}
export async function getAllCategories(
  category: string,
  page: Page
): Promise<string[]> {
  // these load asynchronously, so we have to wait for the specific category.
  const categoryRows = await page
    .getByTestId(`category-${category}`)
    .getByTestId("categorical-row")
    .all();

  const arrayOfLabels = await Promise.all(
    categoryRows.map(async (row): Promise<string> => {
      const cat = await row
        .getByTestId("categorical-value")
        .getAttribute("aria-label");

      if (!cat) throw new Error("category value not found");

      return cat;
    })
  );

  return arrayOfLabels;
}

export async function getCellSetCount(
  num: number,
  page: Page
): Promise<string> {
  await page.getByTestId(`cellset-button-${num}`).click({ force: true });
  return page.getByTestId(`cellset-count-${num}`).innerText();
}

export async function resetCategory(
  category: string,
  page: Page
): Promise<void> {
  const checkbox = page.getByTestId(`${category}:category-select`);
  const checkedPseudoClass = checkbox.isChecked();
  if (!checkedPseudoClass) await checkbox.click({ force: true });

  const categoryRow = page.getByTestId(`${category}:category-expand`);

  const isExpanded = categoryRow.getByTestId("category-expand-is-expanded");

  if (await isExpanded.isVisible())
    await page.getByTestId(`${category}:category-expand`).click();
}

export async function calcCoordinate(
  testId: string,
  xAsPercent: number,
  yAsPercent: number,
  page: Page
): Promise<Coordinate> {
  const size = await page.getByTestId(testId).boundingBox();
  if (!size) throw new Error("bounding box not found");
  return {
    x: Math.floor(size.width * xAsPercent),
    y: Math.floor(size.height * yAsPercent),
  };
}

export async function calcTransformCoordinate(
  testId: string,
  xAsPercent: number,
  yAsPercent: number,
  page: Page
): Promise<Coordinate> {
  const size = await page.getByTestId(testId).boundingBox();
  if (!size) throw new Error("bounding box not found");
  const height = size.height - size.y;
  return {
    x: Math.floor(size.width * xAsPercent),
    y: Math.floor(height * yAsPercent),
  };
}

interface CoordinateAsPercent {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export async function calcDragCoordinates(
  testId: string,
  coordinateAsPercent: CoordinateAsPercent,
  page: Page
): Promise<{ start: Coordinate; end: Coordinate }> {
  return {
    start: await calcCoordinate(
      testId,
      coordinateAsPercent.x1,
      coordinateAsPercent.y1,
      page
    ),
    end: await calcCoordinate(
      testId,
      coordinateAsPercent.x2,
      coordinateAsPercent.y2,
      page
    ),
  };
}

export async function calcTransformDragCoordinates(
  testId: string,
  coordinateAsPercent: CoordinateAsPercent,
  page: Page
): Promise<{ start: Coordinate; end: Coordinate }> {
  return {
    start: await calcTransformCoordinate(
      testId,
      coordinateAsPercent.x1,
      coordinateAsPercent.y1,
      page
    ),
    end: await calcTransformCoordinate(
      testId,
      coordinateAsPercent.x2,
      coordinateAsPercent.y2,
      page
    ),
  };
}

export async function selectCategory(
  category: string,
  values: string[],
  page: Page,
  reset = true
): Promise<void> {
  if (reset) await resetCategory(category, page);

  await page.getByTestId(`${category}:category-expand`).click();
  await page.getByTestId(`${category}:category-select`).click({ force: true });

  for (const value of values) {
    await page
      .getByTestId(`categorical-value-select-${category}-${value}`)
      .click({ force: true });
  }
}

export async function expandCategory(
  category: string,
  page: Page
): Promise<void> {
  const expand = page.getByTestId(`${category}:category-expand`);
  const notExpanded = expand.getByTestId("category-expand-is-not-expanded");
  if (await notExpanded.isVisible()) {
    await expand.click();
  }
}

export async function clip(min = "0", max = "100", page: Page): Promise<void> {
  await page.getByTestId("visualization-settings").click();
  await clearInputAndTypeInto("clip-min-input", min, page);
  await clearInputAndTypeInto("clip-max-input", max, page);
  await page.getByTestId("clip-commit").click();
  // close clip dialog
  await page.getByTestId("visualization-settings").click();
}

/**
 * GENESET
 */

export async function colorByGeneset(
  genesetName: string,
  page: Page
): Promise<void> {
  await page.getByTestId(`${genesetName}:colorby-entire-geneset`).click();
}

export async function colorByGene(gene: string, page: Page): Promise<void> {
  await page.getByTestId(`colorby-${gene}`).click();
  await assertColorLegendLabel(gene, page);
}

export async function assertColorLegendLabel(
  label: string,
  page: Page
): Promise<void> {
  const result = await page
    .getByTestId("continuous_legend_color_by_label")
    .getAttribute("aria-label");

  return expect(result).toBe(label);
}

export async function assertCategoryColorSquareVisible(
  categoryName: string,
  labelName: string,
  page: Page
): Promise<void> {
  // Wait for the category to be expanded first
  await expandCategory(categoryName, page);

  // Find the specific count element for our category-label combination
  const specificElement = page.locator(
    `[data-testfield="${categoryName}-${labelName}"]`
  );
  await expect(specificElement).toBeVisible();

  // Find the color square SVG specifically - it should have a background color set
  // and not have a data-icon attribute (which the "more" button has)
  const parentRow = specificElement.locator(
    "xpath=ancestor::div[@data-testid='categorical-row']"
  );
  const colorSquareSvg = parentRow.locator("svg:not([data-icon])").first();

  // The color square SVG should be visible after coloring by the category
  await expect(colorSquareSvg).toBeVisible({ timeout: 15000 });

  // Additionally verify it has a background color (which indicates it's actually colored)
  const backgroundColor = await colorSquareSvg.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );

  // The background should not be transparent or inherit
  expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(backgroundColor).not.toBe("transparent");
  expect(backgroundColor).not.toBe("inherit");
}
export async function addGeneToSetAndExpand(
  genesetName: string,
  geneSymbol: string,
  page: Page
): Promise<void> {
  // /**
  //  * this is an awful hack but for some reason, the add gene to set
  //  * doesn't work each time. must repeat to get it to trigger.
  //  * */
  let z = 0;
  while (z < 10) {
    await addGeneToSet(genesetName, geneSymbol, page);
    await expandGeneset(genesetName, page);
    try {
      await page.getByTestId("geneset-expand-is-expanded").waitFor();
      break;
    } catch (TimeoutError) {
      z += 1;
      console.log(`trying again - ${z}`);
    }
  }
}

export async function expandGeneset(
  genesetName: string,
  page: Page
): Promise<void> {
  const expand = page.getByTestId(`${genesetName}:geneset-expand`);
  const notExpanded = expand.getByTestId("geneset-expand-is-not-expanded");
  if (await notExpanded.isVisible())
    await page
      .getByTestId(`${genesetName}:geneset-expand`)
      .click({ force: true });
}

export async function createGeneset(
  genesetName: string,
  page: Page,
  genesetDescription?: string
): Promise<void> {
  await page.getByTestId("open-create-geneset-dialog").click();
  await tryUntil(
    async () => {
      await page.getByTestId("create-geneset-input").fill(genesetName);
      if (genesetDescription) {
        await page
          .getByTestId("add-geneset-description")
          .fill(genesetDescription);
      }
      await expect(page.getByTestId("submit-geneset")).toBeEnabled();
    },
    { page }
  );
  await page.getByTestId("submit-geneset").click();
}

export async function editGenesetName(
  genesetName: string,
  editText: string,
  page: Page
): Promise<void> {
  const editButton = `${genesetName}:edit-genesetName-mode`;
  const submitButton = `${genesetName}:submit-geneset`;

  await tryUntil(
    async () => {
      await page.getByTestId(`${genesetName}:see-actions`).click();
      await page.getByTestId(editButton).click({
        force: true,
        /**
         * (thuang): Don't wait for the default timeout, since we want to fail fast
         */
        timeout: 1 * 1000,
      });
    },
    { page }
  );

  await tryUntil(
    async () => {
      await page.getByTestId("rename-geneset-modal").fill(editText);
      await expect(page.getByTestId(submitButton)).toBeEnabled();
    },
    { page }
  );
  await page.getByTestId(submitButton).click();
}

export async function checkGenesetDescription(
  genesetName: string,
  descriptionText: string,
  page: Page
): Promise<void> {
  await tryUntil(
    async () => {
      await page
        .getByTestId(`${genesetName}:see-actions`)
        .click({ force: true });

      const editButton = `${genesetName}:edit-genesetName-mode`;
      await page.getByTestId(editButton).click({
        force: true,
        /**
         * (thuang): Don't wait for the default timeout, since we want to fail fast
         */
        timeout: 1 * 1000,
      });

      const description = page.getByTestId("change-geneset-description");

      await expect(description).toHaveValue(descriptionText);
    },
    { page }
  );
}

export async function deleteGeneset(
  genesetName: string,
  page: Page
): Promise<void> {
  const targetId = `${genesetName}:delete-geneset`;
  await tryUntil(
    async () => {
      await page
        .getByTestId(`${genesetName}:see-actions`)
        .click({ force: true });

      await page.getByTestId(targetId).click({
        force: true,
        /**
         * (thuang): Don't wait for the default timeout, since we want to fail fast
         */ timeout: 1 * 1000,
      });

      await assertGenesetDoesNotExist(genesetName, page);
    },
    { page }
  );
}

export async function assertGenesetDoesNotExist(
  genesetName: string,
  page: Page
): Promise<void> {
  await tryUntil(
    async () => {
      await expect(
        page.getByTestId(`${genesetName}:geneset-name`)
      ).toBeHidden();
    },
    { page }
  );
}

export async function assertGenesetExists(
  genesetName: string,
  page: Page
): Promise<void> {
  const result = await page
    .getByTestId(`${genesetName}:geneset-name`)
    .getAttribute("aria-label", {
      /**
       * (thuang): Don't wait for the default timeout, since we want to fail fast
       */
      timeout: 1 * 1000,
    });

  expect(result).toBe(genesetName);
}

/**
 * GENE
 */

export async function addGeneToSet(
  genesetName: string,
  geneToAddToSet: string,
  page: Page
): Promise<void> {
  const submitButton = `${genesetName}:submit-gene`;
  await page.getByTestId(`${genesetName}:add-new-gene-to-geneset`).click();
  await tryUntil(
    async () => {
      await page
        .getByTestId("add-genes-to-geneset-dialog")
        .fill(geneToAddToSet);

      await expect(page.getByTestId(submitButton)).toBeEnabled();
    },
    { page }
  );
  await page.getByTestId(submitButton).click();
}

export async function removeGene(
  geneSymbol: string,
  page: Page
): Promise<void> {
  // Click the more actions dropdown for the gene
  await page.getByTestId(`more-actions:${geneSymbol}`).click();

  // Click the "Delete from Gene Set" menu item
  await tryUntil(
    async () => {
      await page.getByText("Delete from Gene Set").click();
    },
    { page }
  );
}

export async function assertGeneExistsInGeneset(
  geneSymbol: string,
  page: Page
): Promise<void> {
  const result = await page
    .getByTestId(`${geneSymbol}:gene-label`)
    .getAttribute("aria-label");

  return expect(result).toBe(geneSymbol);
}

export async function assertGeneDoesNotExist(
  geneSymbol: string,
  page: Page
): Promise<void> {
  await tryUntil(
    async () => {
      const geneLabel = await page.getByTestId(`${geneSymbol}:gene-label`);
      await geneLabel.waitFor({ state: "hidden" });
      await expect(geneLabel).toBeHidden();
    },
    { page }
  );
}

export async function expandGene(
  geneSymbol: string,
  page: Page
): Promise<void> {
  await page.getByTestId(`maximize-${geneSymbol}`).click();
}

export async function requestGeneInfo(gene: string, page: Page): Promise<void> {
  await page.getByTestId(`get-info-${gene}`).click();
}

export async function requestCellTypeInfo(cell: string, page: Page) {
  await page.getByTestId(`cell_type:category-expand`).click();
  await page.getByTestId(`get-info-cell_type-${cell}`).click();
}

export async function assertInfoPanelExists(
  id: string,
  infoType: string,
  page: Page
): Promise<void> {
  await expect(
    page.getByTestId(`${id}:${infoType}-info-wrapper`)
  ).toBeVisible();
  await expect(page.getByTestId(`info-panel-header`)).toBeVisible();
  await expect(page.getByTestId(`min-info-panel`)).toBeVisible();

  await expect(
    page.getByTestId(`${infoType}-info-synonyms`).innerText
  ).not.toEqual("");

  await expect(page.getByTestId(`${infoType}-info-link`)).toBeTruthy();
}

export async function minimizeInfoPanel(page: Page): Promise<void> {
  await page.getByTestId("min-info-panel").click();
}

export async function maximizeInfoPanel(page: Page): Promise<void> {
  await page.getByTestId("max-info-panel").click();
}

export async function assertInfoPanelIsMinimized(
  id: string,
  infoType: string,
  page: Page
): Promise<void> {
  const testIds = [
    `${id}:${infoType}-info-wrapper`,
    "info-panel-header",
    "max-info-panel",
    "close-info-panel",
  ];

  await tryUntil(
    async () => {
      for (const testId of testIds) {
        const result = await page.getByTestId(testId).isVisible();
        await expect(result).toBe(true);
      }
    },
    { page }
  );
}

export async function closeInfoPanel(page: Page): Promise<void> {
  await page.getByTestId("close-info-panel").click();
}

export async function assertInfoPanelClosed(
  id: string,
  infoType: string,
  page: Page
): Promise<void> {
  const testIds = [
    `${id}:${infoType}-info-wrapper`,
    "info-panel-header",
    "min-info-panel",
    "close-info-panel",
  ];
  await tryUntil(
    async () => {
      for (const testId of testIds) {
        const result = await page.getByTestId(testId).isVisible();
        await expect(result).toBe(false);
      }
    },
    { page }
  );
}

export async function searchForInfoType(
  infoType: string,
  id: string,
  page: Page
): Promise<void> {
  const searchLabel =
    infoType === "cell-type" ? "Quick Cell Type Search" : "Quick Gene Search";
  await page.getByTestId(`${infoType}-tab`).click();

  await page
    .getByTestId(`${id}:${infoType}-info-wrapper`)
    .getByPlaceholder(searchLabel)
    .fill(id);

  await page.keyboard.press("Enter");
  await tryUntil(
    async () => {
      const infoTitle = await page.getByTestId("info-type-title").innerText();
      await expect(infoTitle).toEqual(id);
    },
    { page }
  );
}

/**
 * CATEGORY
 */

export async function duplicateCategory(
  newCategoryName: string,
  sourceCategoryName: string,
  page: Page
): Promise<void> {
  await page.getByTestId("open-annotation-dialog").click();

  await typeInto("new-category-name", newCategoryName, page);

  // Click on the duplicate category dropdown
  await tryUntil(
    async () => {
      await page.getByTestId("duplicate-category-dropdown").click();
      // Wait for dropdown options to be visible
      await expect(
        page
          .locator('[data-testclass="duplicate-category-dropdown-option"]')
          .first()
      ).toBeVisible();
    },
    { page }
  );

  // Select the source category to duplicate from
  await tryUntil(
    async () => {
      const options = await page
        .locator('[data-testclass="duplicate-category-dropdown-option"]')
        .all();
      let found = false;
      for (const option of options) {
        const text = await option.textContent();
        if (text === sourceCategoryName) {
          await option.click();
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    },
    { page }
  );

  // Submit the category creation
  await tryUntil(
    async () => {
      await page.getByTestId("submit-category").click();
      // Wait for the new category to appear
      await expect(
        page.getByTestId(`${newCategoryName}:category-expand`)
      ).toBeVisible();
    },
    { page }
  );
}

export async function addGeneToSearch(
  geneName: string,
  page: Page
): Promise<void> {
  await tryUntil(
    async () => {
      await page
        .getByTestId("gene-search")
        .getByPlaceholder("Quick Gene Search")
        .fill(geneName);
      await expect(
        page.getByTestId(`suggest-menu-item-${geneName}`)
      ).toBeVisible();
    },
    { page }
  );

  await page.getByTestId(`suggest-menu-item-${geneName}`).click();

  expect(page.getByTestId(`histogram-${geneName}`)).toBeTruthy();
}

export async function subset(
  coordinatesAsPercent: CoordinateAsPercent,
  page: Page,
  testInfo: TestInfo
): Promise<void> {
  // In order to deselect the selection after the subset, make sure we have some clear part
  // of the scatterplot we can click on
  expect(
    coordinatesAsPercent.x2 < 0.99 || coordinatesAsPercent.y2 < 0.99
  ).toBeTruthy();
  const lassoSelection = await calcDragCoordinates(
    "layout-graph",
    coordinatesAsPercent,
    page
  );
  await drag({
    testId: "layout-graph",
    testInfo,
    start: lassoSelection.start,
    end: lassoSelection.end,
    page,
    lasso: true,
    snapshotName: `${getSnapshotPrefix(testInfo)}-after-subset`,
  });

  await page.getByTestId("subset-button").click();

  const clearCoordinate = await calcCoordinate("layout-graph", 0.5, 0.99, page);

  await clickOnCoordinate("layout-graph", clearCoordinate, page);
}

export async function bulkAddGenes(
  geneNames: string[],
  page: Page
): Promise<void> {
  await page.getByTestId("section-bulk-add").click();
  await page.getByTestId("input-bulk-add").fill(geneNames.join(","));
  await page.keyboard.press("Enter");
}

export async function assertUndoRedo(
  page: Page,
  assertOne: () => Promise<void>,
  assertTwo: () => Promise<void>
): Promise<void> {
  await tryUntil(
    async () => {
      await keyboardUndo(page);
      await assertOne();
    },
    { page }
  );

  // if we redo too quickly after undo, the shortcut handler capture the action
  await page.waitForTimeout(1000);

  await tryUntil(
    async () => {
      await keyboardRedo(page);
      await assertTwo();
    },
    { page }
  );
}

const WAIT_FOR_GRAPH_AS_IMAGE_TIMEOUT_MS = 10_000;

/**
 * (thuang): Captures a snapshot of the graph on the canvas element as an image
 * for Chromatic snapshot testing.
 *
 * @param name - The name of the snapshot. The name MUST be unique across the test
 * suite to avoid overwriting snapshots.
 *
 * NOTE: Use this function only for tests that absolutely require graph
 * snapshots, as the image layer and graph can sometimes be out of sync,
 * potentially leading to false positives in Chromatic if excessive screenshots are taken.
 */
export async function snapshotTestGraph(
  page: Page,
  name: string,
  testInfo: TestInfo
) {
  const imageID = "graph-image";

  await waitUntilNoSkeletonDetected(page);

  await tryUntil(
    async () => {
      await page.getByTestId(GRAPH_AS_IMAGE_TEST_ID).click({ force: true });

      await page
        .getByTestId(imageID)
        /**
         * (thuang): Without explicit `timeout` option, the default timeout is
         * 3 minutes, which is too long for this test.
         */
        .waitFor({ timeout: WAIT_FOR_GRAPH_AS_IMAGE_TIMEOUT_MS });

      /**
       * (thuang): Ensure stable graph image before taking the snapshot
       */
      await page.waitForTimeout(2 * 1000);

      await takeSnapshot(page, name, testInfo);

      /**
       * (thuang): Remove the image in the DOM after taking the snapshot
       */
      await page.getByTestId(GRAPH_AS_IMAGE_TEST_ID).click({ force: true });
    },
    { page }
  );
}

export async function selectLayout(
  layoutChoice: string,
  graphTsetId: string,
  sidePanel: string,
  page: Page
) {
  let layoutChoiceTestId = LAYOUT_CHOICE_TEST_ID;
  if (graphTsetId === sidePanel) {
    layoutChoiceTestId = `${LAYOUT_CHOICE_TEST_ID}-side`;
  }
  await page.getByTestId(layoutChoiceTestId).click({ force: true });
  await page.getByTestId(`layout-choice-label-${layoutChoice}`).click();
  await page.getByTestId(layoutChoiceTestId).click({ force: true });

  await page.waitForTimeout(WAIT_FOR_SWITCH_LAYOUT_MS);
}

const RESIZE_DIFF_PX = 100;
const RESIZE_STEPS = 10;
const RESIZE_PAUSE_MS = 200;

async function resizeWindow(page: Page) {
  await tryUntil(
    async () => {
      /**
       * (thuang): Resize the viewport to ensure the spatial background image
       * is fully aligned
       */
      await page.setViewportSize({
        width: VIEWPORT_SIZE.width - RESIZE_DIFF_PX,
        height: VIEWPORT_SIZE.height,
      });

      // gradually increase the viewport size over 2s with 200ms pauses
      for (const [index] of Array.from({ length: RESIZE_STEPS }).entries()) {
        await page.setViewportSize({
          width:
            VIEWPORT_SIZE.width - RESIZE_DIFF_PX + (index + 1) * RESIZE_STEPS,
          height: VIEWPORT_SIZE.height,
        });

        await page.waitForTimeout(RESIZE_PAUSE_MS);
      }

      await page.setViewportSize({
        width: VIEWPORT_SIZE.width,
        height: VIEWPORT_SIZE.height,
      });

      const viewportSize = await page.viewportSize();

      expect(viewportSize).toEqual(VIEWPORT_SIZE);
    },
    { page }
  );
}

export async function showImageUnderlayInTestMode(page: Page) {
  const imageUnderlayDropdown = page.getByTestId("image-underlay-dropdown");
  const imageOpacityInput = page.locator("#image-opacity");

  if (!(await imageUnderlayDropdown.isVisible())) return;

  await tryUntil(
    async () => {
      await imageUnderlayDropdown.click({ force: true });
      expect(await imageOpacityInput.isVisible()).toBe(true);
    },
    { page }
  );

  await imageOpacityInput.fill("100");

  await tryUntil(
    async () => {
      await imageUnderlayDropdown.click({ force: true });
      await imageOpacityInput.waitFor({ state: "hidden" });
    },
    { page }
  );
}

/**
 * ANNOTATION FUNCTIONS
 */

export async function createCategory(
  categoryName: string,
  page: Page
): Promise<void> {
  await page.getByTestId("open-annotation-dialog").click();
  await typeInto("new-category-name", categoryName, page);

  // Wait for the submit button to be enabled
  await page.waitForSelector(
    '[data-testid="submit-category"]:not([disabled])',
    { timeout: 10000 }
  );
  await page.getByTestId("submit-category").click();

  // Wait for the category to appear
  await tryUntil(
    async () => {
      await expect(
        page.getByTestId(`${categoryName}:category-expand`)
      ).toBeVisible();
    },
    { page }
  );
}

export async function clearCellSelection(page: Page): Promise<void> {
  // Try multiple approaches to clear cell selection
  // First try pressing Escape key to clear any selections
  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  } catch (error) {
    // Ignore
  }

  // Try clicking on the graph area
  try {
    const graphElement = page.getByTestId("layout-graph").first();
    await graphElement.click({
      position: { x: 100, y: 100 },
      timeout: 2000,
      force: true,
    });
    await page.waitForTimeout(100);
  } catch (error) {
    // Ignore
  }

  // Try clicking elsewhere on the page
  try {
    await page.mouse.click(300, 300);
    await page.waitForTimeout(100);
  } catch (error) {
    // Ignore
  }

  // As a final attempt, try clicking on an empty area of the sidebar
  try {
    const sidebar = page.locator('[data-testid="left-sidebar"]').first();
    if (await sidebar.isVisible()) {
      await sidebar.click({ position: { x: 50, y: 50 }, force: true });
    }
  } catch (error) {
    // Ignore
  }
}

export async function addLabelToCategory(
  categoryName: string,
  labelName: string,
  page: Page,
  menuItemIndex = 0
): Promise<void> {
  // Clear any existing cell selection first
  await clearCellSelection(page);

  // First expand the category if not already expanded
  await expandCategory(categoryName, page);

  // Click the add label button
  await page.getByTestId(`${categoryName}:add-new-label-to-category`).click();

  // Wait for the dialog to appear
  await expect(
    page.getByTestId(`${categoryName}:new-label-name`)
  ).toBeVisible();

  // Type the label name - the test ID is dynamic based on category name
  await typeInto(`${categoryName}:new-label-name`, labelName, page);

  // Wait for autocomplete suggestions to appear
  await page.waitForTimeout(500);

  // Click on the specified menu item (0 = "Create new label", 1 = first autocomplete suggestion, etc.)
  const suggestions = page.locator(".bp5-menu-item");
  await expect(suggestions.nth(menuItemIndex)).toBeVisible({ timeout: 5000 });
  await suggestions.nth(menuItemIndex).click();

  // Wait for the dropdown to disappear - target the popover container instead of individual items
  const dropdown = page.locator(".bp5-popover-content");
  await expect(dropdown).not.toBeVisible();

  // Submit the label - use the exact "Add label" button (not the one with cell assignment)
  await page.getByRole("button", { name: "Add label", exact: true }).click();

  // Wait for the dialog to close (this indicates the action was attempted)
  await expect(
    page.getByTestId(`${categoryName}:new-label-name`)
  ).not.toBeVisible();

  // Note: We don't validate that the label was actually created here
  // That validation is handled by assertLabelExists in the test itself
  // This function just handles the UI interaction of attempting to create a label
}

export async function addLabelToCategoryWithSelection(
  categoryName: string,
  labelName: string,
  page: Page,
  menuItemIndex = 0
): Promise<void> {
  // First expand the category if not already expanded
  await expandCategory(categoryName, page);

  // Click the add label button
  await page.getByTestId(`${categoryName}:add-new-label-to-category`).click();

  // Type the label name - the test ID is dynamic based on category name
  await typeInto(`${categoryName}:new-label-name`, labelName, page);

  // Wait for autocomplete suggestions to appear
  await page.waitForTimeout(500);

  // Click on the specified menu item (0 = "Create new label", 1 = first autocomplete suggestion, etc.)
  const suggestions = page.locator(".bp5-menu-item");
  await expect(suggestions.nth(menuItemIndex)).toBeVisible({ timeout: 5000 });

  // Get the actual text of the selected suggestion for the test ID
  const selectedSuggestion = suggestions.nth(menuItemIndex);
  const actualLabelName = await selectedSuggestion.textContent();
  await selectedSuggestion.click();

  // Wait for the dropdown to disappear - target the popover container instead of individual items
  const dropdown = page.locator(".bp5-popover-content");
  await expect(dropdown).not.toBeVisible();

  // Submit the label with cell assignment - use the button that assigns selected cells
  await page
    .getByRole("button", { name: /Add label & assign .* selected cells/ })
    .click();

  // Wait for the label to appear using the actual selected label name
  await tryUntil(
    async () => {
      await expect(
        page.getByTestId(
          `categorical-value-select-${categoryName}-${actualLabelName}`
        )
      ).toBeVisible();
    },
    { page }
  );
}

export async function selectCategoryLabel(
  categoryName: string,
  labelName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);
  await page
    .getByTestId(`categorical-value-select-${categoryName}-${labelName}`)
    .click({ force: true });
}

export async function colorByCategory(
  categoryName: string,
  page: Page
): Promise<void> {
  await page.getByTestId(`colorby-${categoryName}`).click();
  await waitUntilNoSkeletonDetected(page);
}

export async function assertCategoryExists(
  categoryName: string,
  page: Page
): Promise<void> {
  await expect(
    page.getByTestId(`${categoryName}:category-expand`)
  ).toBeVisible();
}

export async function assertCategoryDoesNotExist(
  categoryName: string,
  page: Page
): Promise<void> {
  await expect(
    page.getByTestId(`${categoryName}:category-expand`)
  ).not.toBeVisible();
}

export async function assertLabelExists(
  categoryName: string,
  labelName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);
  await expect(
    page.getByTestId(`categorical-value-select-${categoryName}-${labelName}`)
  ).toBeVisible();
}

export async function assertLabelDoesNotExist(
  categoryName: string,
  labelName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);
  await expect(
    page.getByTestId(`categorical-value-select-${categoryName}-${labelName}`)
  ).not.toBeVisible();
}

/**
 * Delete a category using the delete action in the category menu
 */
export async function deleteCategory(
  categoryName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);

  // Hover over the category actions menu button to open the menu
  await page.getByTestId(`${categoryName}:see-actions`).hover();

  // Wait for menu to appear and click delete
  await page.getByTestId(`${categoryName}:delete-category`).click();

  // Wait for the category to disappear
  await expect(
    page.getByTestId(`${categoryName}:category-expand`)
  ).not.toBeVisible({ timeout: 10000 });
}

/**
 * Rename a category using the edit action in the category menu
 */
export async function renameCategory(
  categoryName: string,
  newCategoryName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);

  // Hover over the category actions menu button to open the menu
  await page.getByTestId(`${categoryName}:see-actions`).hover();

  // Wait for menu to appear and click edit
  await page.getByTestId(`${categoryName}:edit-category-mode`).click();

  // Wait for the edit dialog to appear
  await expect(page.locator('div[role="dialog"]')).toBeVisible({
    timeout: 5000,
  });

  // Find the input field in the dialog - try multiple selectors
  const editInput = page.locator('input[type="text"]').last();
  await editInput.waitFor({ state: "visible" });

  // Clear the input and type the new name
  await editInput.clear();
  await editInput.fill(newCategoryName);

  // Submit the edit (look for the primary button in the dialog)
  const submitButton = page.getByRole("button", { name: "Edit category name" });
  await submitButton.click();

  // Wait for the dialog to close and new category to appear
  await expect(page.locator('div[role="dialog"]')).not.toBeVisible({
    timeout: 5000,
  });
  await expect(
    page.getByTestId(`${newCategoryName}:category-expand`)
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Delete a label from a category using the delete action in the label menu
 */
export async function deleteLabel(
  categoryName: string,
  labelName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);

  // Hover over the label actions menu button to open the menu
  await page.getByTestId(`${categoryName}:${labelName}:see-actions`).hover();

  // Wait for menu to appear and click delete
  await page.getByTestId(`${categoryName}:${labelName}:delete-label`).click();

  // Wait for the label to disappear
  await expect(
    page.getByTestId(`categorical-value-select-${categoryName}-${labelName}`)
  ).not.toBeVisible({ timeout: 10000 });
}

/**
 * Rename a label in a category using the edit action in the label menu
 */
export async function renameLabel(
  categoryName: string,
  oldLabelName: string,
  newLabelName: string,
  page: Page
): Promise<void> {
  await expandCategory(categoryName, page);

  // Hover over the label actions menu button to open the menu
  await page.getByTestId(`${categoryName}:${oldLabelName}:see-actions`).hover();

  // Wait for menu to appear and click edit
  await page.getByTestId(`${categoryName}:${oldLabelName}:edit-label`).click();

  // Wait for the edit dialog to appear
  await expect(page.locator('div[role="dialog"]')).toBeVisible({
    timeout: 5000,
  });

  // Clear and type the new label name in the input field
  const editInput = page.locator('input[type="text"]').last();
  await editInput.waitFor({ state: "visible" });
  await editInput.clear();
  await editInput.fill(newLabelName);

  // Submit the edit (look for the primary button)
  const submitButton = page
    .getByRole("button", { name: /change|save|submit/i })
    .first();
  await submitButton.click();

  // Wait for the dialog to close and new label to appear
  await expect(page.locator('div[role="dialog"]')).not.toBeVisible({
    timeout: 5000,
  });
  await expect(
    page.getByTestId(`categorical-value-select-${categoryName}-${newLabelName}`)
  ).toBeVisible({ timeout: 10000 });
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions */
