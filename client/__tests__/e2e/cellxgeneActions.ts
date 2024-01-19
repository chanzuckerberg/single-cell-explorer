/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { Page, expect } from "@playwright/test";
import { clearInputAndTypeInto, tryUntil, typeInto } from "./puppeteerUtils";

interface Coordinate {
  x: number;
  y: number;
}

export async function drag(
  testId: string,
  start: Coordinate,
  end: Coordinate,
  page: Page,
  lasso = false
): Promise<void> {
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
  const layout = await page.getByTestId(testId);
  if (layout) {
    const x = coords[0];
    const y = coords[1];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.wheel(0, deltaY);
  }
}

export async function keyboardUndo(page: Page): Promise<void> {
  await page.keyboard.down("MetaLeft");
  await page.keyboard.press("KeyZ");
  await page.keyboard.up("MetaLeft");
}

export async function keyboardRedo(page: Page): Promise<void> {
  await page.keyboard.down("MetaLeft");
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.press("KeyZ");
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("MetaLeft");
}

export async function clickOnCoordinate(
  testId: string,
  coord: Coordinate,
  page: Page
): Promise<void> {
  const layout = await page.getByTestId(testId);
  const elBox = await layout.boundingBox();

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
): Promise<[string, string][]> {
  // these load asynchronously, so we have to wait for the specific category.
  const categoryRows = await page
    .getByTestId(`category-${category}`)
    .getByTestId("categorical-row")
    .all();

  return Object.fromEntries(
    await Promise.all(
      categoryRows.map(async (row) => {
        const cat =
          (await row
            .getByTestId("categorical-value")
            .getAttribute("aria-label")) ?? "";

        const count = await row
          .getByTestId("categorical-value-count")
          .innerText();

        return [cat, count];
      })
    )
  );
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
  const checkboxId = `${category}:category-select`;
  await page.getByTestId(checkboxId);
  const checkedPseudoClass = await page.$eval(
    `[data-testid='${checkboxId}']`,
    (el) => el.matches(":checked")
  );
  if (!checkedPseudoClass)
    await page.getByTestId(checkboxId).click({ force: true });

  const categoryRow = await page.getByTestId(`${category}:category-expand`);

  const isExpanded = await categoryRow.getByTestId(
    "category-expand-is-expanded"
  );

  if (await isExpanded.isVisible())
    await page.getByTestId(`${category}:category-expand`).click();
}

export async function calcCoordinate(
  testId: string,
  xAsPercent: number,
  yAsPercent: number,
  page: Page
): Promise<Coordinate> {
  const el = await page.getByTestId(testId);
  const size = await el.boundingBox();
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
  const el = await page.getByTestId(testId);
  const size = await el.boundingBox();
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
  const expand = await page.getByTestId(`${category}:category-expand`);
  const notExpanded = await expand.getByTestId(
    "category-expand-is-not-expanded"
  );
  if (await notExpanded.isVisible())
    await page.getByTestId(`${category}:category-expand`).click();
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
}

export async function assertColorLegendLabel(
  label: string,
  page: Page
): Promise<void> {
  const handle = await page.getByTestId("continuous_legend_color_by_label");

  const result = await handle.evaluate((node) =>
    node.getAttribute("aria-label")
  );

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
  const expand = await page.getByTestId(`${genesetName}:geneset-expand`);
  const notExpanded = await expand?.getByTestId(
    "geneset-expand-is-not-expanded"
  );
  if (await notExpanded.isVisible())
    await page
      .getByTestId(`${genesetName}:geneset-expand`)
      .click({ force: true });
}

export async function createGeneset(
  genesetName: string,
  page: Page
): Promise<void> {
  await page.getByTestId("open-create-geneset-dialog").click();
  await page.getByTestId("create-geneset-input").fill(genesetName);
  await page.getByTestId("submit-geneset").click();
}

export async function editGenesetName(
  genesetName: string,
  editText: string,
  page: Page
): Promise<void> {
  const editButton = `${genesetName}:edit-genesetName-mode`;
  const submitButton = `${genesetName}:submit-geneset`;
  await page.getByTestId(`${genesetName}:see-actions`).click();
  await page.getByTestId(editButton).click();
  await page.getByTestId("rename-geneset-modal").fill(editText);
  await page.getByTestId(submitButton).click();
}

export async function deleteGeneset(
  genesetName: string,
  page: Page
): Promise<void> {
  const targetId = `${genesetName}:delete-geneset`;
  await page.getByTestId(`${genesetName}:see-actions`).click();
  await page.getByTestId(targetId).click();

  await assertGenesetDoesNotExist(genesetName, page);
}

export async function assertGenesetDoesNotExist(
  genesetName: string,
  page: Page
): Promise<void> {
  await expect(page.getByTestId(`${genesetName}:geneset-name`)).toBeFalsy();
}

export async function assertGenesetExists(
  genesetName: string,
  page: Page
): Promise<void> {
  const handle = await page.getByTestId(`${genesetName}:geneset-name`);

  const result = await handle.evaluate((node) =>
    node.getAttribute("aria-label")
  );

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
  await page.getByTestId("add-genes-to-geneset-dialog").click();
  await page.getByTestId("add-genes-to-geneset-dialog").fill(geneToAddToSet);
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
  const handle = await page.getByTestId(`${geneSymbol}:gene-label`);
  const result = handle.getAttribute("aria-label");

  return expect(result).toBe(geneSymbol);
}

export async function assertGeneDoesNotExist(
  geneSymbol: string,
  page: Page
): Promise<void> {
  await expect(page.getByTestId(`${geneSymbol}:gene-label`)).toBeFalsy();
}

export async function expandGene(
  geneSymbol: string,
  page: Page
): Promise<void> {
  await page.getByTestId(`maximize-${geneSymbol}`).click();
}

export async function requestGeneInfo(gene: string, page: Page): Promise<void> {
  await page.getByTestId(`get-info-${gene}`).click();
  await expect(page.getByTestId(`${gene}:gene-info`)).toBeTruthy();
}

export async function assertGeneInfoCardExists(
  gene: string,
  page: Page
): Promise<void> {
  await expect(page.getByTestId(`${gene}:gene-info`)).toBeTruthy();
  await expect(page.getByTestId(`gene-info-header`)).toBeTruthy();
  await expect(page.getByTestId(`min-gene-info`)).toBeTruthy();

  await expect(page.getByTestId(`clear-info-summary`).innerText).not.toEqual(
    ""
  );
  await expect(page.getByTestId(`gene-info-synonyms`).innerText).not.toEqual(
    ""
  );

  await expect(page.getByTestId(`gene-info-link`)).toBeTruthy();
}

export async function minimizeGeneInfo(page: Page): Promise<void> {
  await page.getByTestId("min-gene-info").click();
}

export async function assertGeneInfoCardIsMinimized(
  gene: string,
  page: Page
): Promise<void> {
  const testIds = [
    `${gene}:gene-info`,
    "gene-info-header",
    "min-gene-info",
    "clear-gene-info",
  ];
  for (const id of testIds) {
    const result = await page.getByTestId(id).isVisible();
    await expect(result).toBe(true);
  }
  const result = await page.getByTestId("gene-info-symbol").isVisible();
  await expect(result).toBe(false);
}

export async function removeGeneInfo(page: Page): Promise<void> {
  await page.getByTestId("clear-gene-info").click();
}

export async function assertGeneInfoDoesNotExist(
  gene: string,
  page: Page
): Promise<void> {
  const testIds = [
    `${gene}:gene-info`,
    "gene-info-header",
    "min-gene-info",
    "clear-gene-info",
  ];
  for (const id of testIds) {
    const result = await page.getByTestId(id).isVisible();
    await expect(result).toBe(false);
  }
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

  tryUntil(
    async () => {
      await page.getByTestId("duplicate-category-dropdown").click();
      await expect(page.getByTestId(dropdownOptionClass)).toBeTruthy();
    },
    { page }
  );

  const option = page.getByTestId(dropdownOptionClass);
  await expect(option).toBeTruthy();

  await option.click();

  tryUntil(
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
  page: Page
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
  await drag(
    "layout-graph",
    lassoSelection.start,
    lassoSelection.end,
    page,
    true
  );
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

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions */
