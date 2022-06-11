/*
Tests included in this file are specific to annotation features
*/
import { appUrlBase } from "./config";

import {
  clickOn,
  goToPage,
  waitByClass,
  waitByID,
  getTestId,
  getTestClass,
  getAllByClass,
  clickOnUntil,
  getOneElementInnerHTML,
} from "./puppeteerUtils";

import {
  calcDragCoordinates,
  createCategory,
  createLabel,
  drag,
  expandCategory,
  renameLabel,
  subset,
  duplicateCategory,
  createGeneset,
  deleteGeneset,
  assertGenesetExists,
  assertGenesetDoesNotExist,
  getCellSetCount,
  expandGeneset,
  editGenesetName,
  addGeneToSet,
  assertGeneExistsInGeneset,
  removeGene,
  assertGeneDoesNotExist,
  expandGene,
  colorByGeneset,
  assertColorLegendLabel,
  colorByGene,
} from "./cellxgeneActions";

const perTestCategoryName = "TEST-CATEGORY";
const perTestLabelName = "TEST-LABEL";

// geneset CRUD
const genesetToDeleteName = "geneset_to_delete";
const preExistingGenesetName = "fifth_dataset";
const meanExpressionBrushGenesetName = "second_gene_set";
const meanExpressionBrushCellsSelected = "557";
const subsetMeanExpressionBrushCellsSelected = "452";

// initial text, the text we type in, the result
const editableGenesetName = "geneset_to_edit";
const editText = "_111";
const newGenesetName = "geneset_to_edit_111";

// add gene to set
const geneToAddToSet = "RER1";
const setToAddGeneTo = "fill_this_geneset";

// remove gene from set
const geneToRemove = "SIK1";
const setToRemoveFrom = "empty_this_geneset";

// brush a gene
const geneToBrushAndColorBy = "SIK1";
const brushThisGeneGeneset = "brush_this_gene";
const geneBrushedCellCount = "109";
const subsetGeneBrushedCellCount = "96";

const genesetDescriptionID =
  "geneset-description-tooltip-fourth_gene_set: fourth description";
const genesetDescriptionString = "fourth_gene_set: fourth description";
const genesetToCheckForDescription = "fourth_gene_set";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
async function setup(config: any) {
  await goToPage(appUrlBase);

  if (config.categoricalAnno) {
    // setup the test fixtures
    await createCategory(perTestCategoryName);
    await createLabel(perTestCategoryName, perTestLabelName);
  }

  if (config.withSubset) {
    await subset({ x1: 0.1, y1: 0.1, x2: 0.8, y2: 0.8 });
  }

  await waitByClass("autosave-complete");
}

describe.each([
  { withSubset: true, tag: "subset" },
  { withSubset: false, tag: "whole" },
])("geneSET crud operations and interactions", (config) => {
  test("genesets load from csv", async () => {
    await setup(config);

    await assertGenesetExists(preExistingGenesetName);
  });
  test("brush on geneset mean", async () => {
    await setup(config);

    await expandGeneset(meanExpressionBrushGenesetName);

    const histBrushableAreaId = `histogram-${meanExpressionBrushGenesetName}-plot-brushable-area`;

    const coords = await calcDragCoordinates(histBrushableAreaId, {
      x1: 0.25,
      y1: 0.5,
      x2: 0.55,
      y2: 0.5,
    });

    await drag(histBrushableAreaId, coords.start, coords.end);

    const cellCount = await getCellSetCount(1);
    if (config.withSubset) {
      expect(cellCount).toBe(subsetMeanExpressionBrushCellsSelected);
    } else {
      expect(cellCount).toBe(meanExpressionBrushCellsSelected);
    }
  });
  test("color by mean expression", async () => {
    await setup(config);

    await colorByGeneset(meanExpressionBrushGenesetName);
    await assertColorLegendLabel(meanExpressionBrushGenesetName);
  });
  test("diffexp", async () => {
    if (config.withSubset) return;

    await setup(config);

    // set the two cell sets to b cells vs nk cells
    await expandCategory(`louvain`);
    await clickOn(`louvain:category-select`);
    await clickOn(`categorical-value-select-louvain-B cells`);
    await clickOn(`cellset-button-1`);
    await clickOn(`categorical-value-select-louvain-B cells`);
    await clickOn(`categorical-value-select-louvain-NK cells`);
    await clickOn(`cellset-button-2`);

    // run diffexp
    await clickOn(`diffexp-button`);
    await waitByClass("pop-1-geneset-expand");
    await expect(page).toClick(getTestClass("pop-1-geneset-expand"));

    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      (selector: any) => !document.querySelector(selector),
      {},
      getTestClass("gene-loading-spinner")
    );

    let genesHTML = await getOneElementInnerHTML(
      getTestClass("gene-set-genes")
    );

    expect(genesHTML).toMatchSnapshot();

    await expect(page).toClick(getTestClass("pop-1-geneset-expand"));
    await expect(page).toClick(getTestClass("pop-2-geneset-expand"));

    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      (selector: any) => !document.querySelector(selector),
      {},
      getTestClass("gene-loading-spinner")
    );

    genesHTML = await getOneElementInnerHTML(getTestClass("gene-set-genes"));

    expect(genesHTML).toMatchSnapshot();
  });
  test("create a new geneset and undo/redo", async () => {
    if (config.withSubset) return;

    await setup(config);

    const genesetName = `test-geneset-foo-123`;
    await assertGenesetDoesNotExist(genesetName);
    await createGeneset(genesetName);
    /* note: as of June 2021, the aria label is in the truncate component which clones the element */
    await assertGenesetExists(genesetName);
    await clickOn("undo");
    await assertGenesetDoesNotExist(genesetName);
    await clickOn("redo");
    await assertGenesetExists(genesetName);
  });
  test("edit geneset name and undo/redo", async () => {
    await setup(config);

    await editGenesetName(editableGenesetName, editText);
    await assertGenesetExists(newGenesetName);
    await clickOn("undo");
    await assertGenesetExists(editableGenesetName);
    await clickOn("redo");
    await assertGenesetExists(newGenesetName);
  });
  test("delete a geneset and undo/redo", async () => {
    if (config.withSubset) return;

    await setup(config);

    await deleteGeneset(genesetToDeleteName);
    await clickOn("undo");
    await assertGenesetExists(genesetToDeleteName);
    await clickOn("redo");
    await assertGenesetDoesNotExist(genesetToDeleteName);
  });
  test("geneset description", async () => {
    if (config.withSubset) return;

    await setup(config);

    await clickOnUntil(
      `${genesetToCheckForDescription}:geneset-expand`,
      async () => {
        expect(page).toMatchElement(getTestId(genesetDescriptionID), {
          text: genesetDescriptionString,
        });
      }
    );
  });
});

describe.each([
  { withSubset: true, tag: "subset" },
  { withSubset: false, tag: "whole" },
])("GENE crud operations and interactions", (config) => {
  test("add a gene to geneset and undo/redo", async () => {
    await setup(config);

    await addGeneToSet(setToAddGeneTo, geneToAddToSet);
    await expandGeneset(setToAddGeneTo);
    await assertGeneExistsInGeneset(geneToAddToSet);
    await clickOn("undo");
    await assertGeneDoesNotExist(geneToAddToSet);
    await clickOn("redo");
    await assertGeneExistsInGeneset(geneToAddToSet);
  });
  test("expand gene and brush", async () => {
    await setup(config);

    await expandGeneset(brushThisGeneGeneset);
    await expandGene(geneToBrushAndColorBy);
    const histBrushableAreaId = `histogram-${geneToBrushAndColorBy}-plot-brushable-area`;

    const coords = await calcDragCoordinates(histBrushableAreaId, {
      x1: 0.25,
      y1: 0.5,
      x2: 0.55,
      y2: 0.5,
    });
    await drag(histBrushableAreaId, coords.start, coords.end);
    const cellCount = await getCellSetCount(1);
    if (config.withSubset) {
      expect(cellCount).toBe(subsetGeneBrushedCellCount);
    } else {
      expect(cellCount).toBe(geneBrushedCellCount);
    }
  });
  test("color by gene in geneset", async () => {
    await setup(config);

    await expandGeneset(meanExpressionBrushGenesetName);

    await colorByGene(geneToBrushAndColorBy);
    await assertColorLegendLabel(geneToBrushAndColorBy);
  });
  test("delete gene from geneset and undo/redo", async () => {
    // We've already deleted the gene
    if (config.withSubset) return;

    await setup(config);

    await expandGeneset(setToRemoveFrom);
    await removeGene(geneToRemove);
    await assertGeneDoesNotExist(geneToRemove);
    await clickOn("undo");
    await assertGeneExistsInGeneset(geneToRemove);
    await clickOn("redo");
    await assertGeneDoesNotExist(geneToRemove);
  });
});

describe.each([
  { withSubset: true, tag: "subset", categoricalAnno: true },
  { withSubset: false, tag: "whole", categoricalAnno: true },
])("annotations", (config) => {
  test("check cell count for a label loaded from file", async () => {
    await setup(config);

    const duplicateCategoryName = "duplicate";
    await duplicateCategory(duplicateCategoryName);

    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

    const firstCategoryExpandIcon = await expect(page).toMatchElement(
      getTestClass("category-expand")
    );

    await firstCategoryExpandIcon.click();

    const expectedCategoryRow = await expect(page).toMatchElement(
      getTestClass("categorical-row")
    );
    const expectedLabelName = await getInnerText(
      expectedCategoryRow,
      "categorical-value"
    );
    const expectedLabelCount = await getInnerText(
      expectedCategoryRow,
      "categorical-value-count"
    );

    await expandCategory(duplicateCategoryName);

    const expectedCategory = await expect(page).toMatchElement(
      getTestClass("category")
    );

    const actualCategoryRow = await expect(expectedCategory).toMatchElement(
      getTestClass("categorical-row")
    );
    const actualLabelName = await getInnerText(
      actualCategoryRow,
      "categorical-value"
    );
    const actualLabelCount = await getInnerText(
      actualCategoryRow,
      "categorical-value-count"
    );

    expect(actualLabelName).toBe(expectedLabelName);
    expect(actualLabelCount).toBe(expectedLabelCount);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    async function getInnerText(element: any, className: any) {
      return element.$eval(
        getTestClass(className),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
        (node: any) => node?.innerText
      );
    }
  });

  test("stacked bar graph renders", async () => {
    await setup(config);

    await expandCategory(perTestCategoryName);

    await clickOn(`colorby-louvain`);

    const labels = await getAllByClass("categorical-row");

    const result = await Promise.all(
      labels.map((label) =>
        page.evaluate((element) => element.outerHTML, label)
      )
    );

    expect(result).toMatchSnapshot();
  });
});
