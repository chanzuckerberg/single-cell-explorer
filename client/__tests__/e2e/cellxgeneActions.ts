/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { Page, TestInfo, expect } from "@playwright/test";
import { Classes } from "@blueprintjs/core";
import { takeSnapshot } from "@chromatic-com/playwright";
import { clearInputAndTypeInto, tryUntil, typeInto } from "./puppeteerUtils";
import {
  GRAPH_AS_IMAGE_TEST_ID,
  LAYOUT_CHOICE_TEST_ID,
} from "../../src/util/constants";

interface Coordinate {
  x: number;
  y: number;
}

const WAIT_FOR_SWITCH_LAYOUT_MS = 2_000;

export async function drag({
  testId,
  testInfo,
  start,
  end,
  page,
  lasso = false,
}: {
  testId: string;
  testInfo: TestInfo;
  start: Coordinate;
  end: Coordinate;
  page: Page;
  lasso?: boolean;
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

  await snapshotTestGraph(page, testInfo);
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
  const targetId = `delete-from-geneset:${geneSymbol}`;

  await page.getByTestId(targetId).click();
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

/**
 * CATEGORY
 */

export async function duplicateCategory(
  categoryName: string,
  page: Page
): Promise<void> {
  await page.getByTestId("open-annotation-dialog").click();

  await typeInto("new-category-name", categoryName, page);

  const dropdownOptionClass = "duplicate-category-dropdown-option";

  await tryUntil(
    async () => {
      await page.getByTestId("duplicate-category-dropdown").click();
      await expect(page.getByTestId(dropdownOptionClass)).toBeTruthy();
    },
    { page }
  );

  const option = page.getByTestId(dropdownOptionClass);
  await expect(option).toBeTruthy();

  await option.click();

  await tryUntil(
    async () => {
      await page.getByTestId("submit-category").click();
      await expect(
        page.getByTestId(`${categoryName}:category-expand`)
      ).toBeTruthy();
    },
    { page }
  );
}

export async function addGeneToSearch(
  geneName: string,
  page: Page
): Promise<void> {
  await page.getByTestId("gene-search").fill(geneName);
  await page.keyboard.press("Enter");
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

export async function snapshotTestGraph(page: Page, testInfo: TestInfo) {
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

      await takeSnapshot(page, testInfo);

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

  /**
   * (thuang): For blueprint radio buttons, we need to tab first to go to the
   * currently selected option before we can use the arrow keys to navigate
   */
  await page.keyboard.press("Tab");

  const layoutChoices = await await page
    .getByTestId(RegExp(`^${LAYOUT_CHOICE_TEST_ID}-label-`))
    .allInnerTexts();

  const currentlySelectedLayout = await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { checked: true }) })
    .innerText();

  const currentIndex = layoutChoices.indexOf(currentlySelectedLayout);
  const targetIndex = layoutChoices.findIndex((choice) =>
    choice.includes(layoutChoice)
  );

  const relativePosition = targetIndex - currentIndex;

  if (relativePosition > 0) {
    // press down arrow N times
    for (let i = 0; i < relativePosition; i += 1) {
      await page.keyboard.press("ArrowDown");
    }
  } else {
    // press up arrow N times
    for (let i = 0; i < Math.abs(relativePosition); i += 1) {
      await page.keyboard.press("ArrowUp");
    }
  }

  await page.getByTestId(layoutChoiceTestId).click({ force: true });

  await page.waitForTimeout(WAIT_FOR_SWITCH_LAYOUT_MS);
}

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions */
