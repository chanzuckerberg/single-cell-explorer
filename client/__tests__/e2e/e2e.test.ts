/**
 * Smoke test suite that will be run in Travis CI
 * Tests included in this file are expected to be relatively stable and test core features
 */

/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */

import { appUrlBase, DATASET } from "./config";

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
  getElementCoordinates,
} from "./puppeteerUtils";

import {
  calcDragCoordinates,
  createCategory,
  createLabel,
  drag,
  expandCategory,
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
  renameLabel,
  assertGeneDoesNotExist,
  expandGene,
  colorByGeneset,
  assertColorLegendLabel,
  colorByGene,
  clip,
  getAllCategoriesAndCounts,
  selectCategory,
} from "./cellxgeneActions";

import { datasets } from "./data";

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

const data = datasets[DATASET];

const defaultBaseUrl = "d";
const pageUrl = appUrlBase.includes("localhost")
  ? [appUrlBase, defaultBaseUrl, DATASET].join("/")
  : appUrlBase;

describe("did launch", () => {
  test("page launched", async () => {
    await goToPage(pageUrl);

    const element = await getOneElementInnerHTML(getTestId("header"));

    expect(element).toMatchSnapshot();
  });
});

describe("metadata loads", () => {
  test("categories and values from dataset appear", async () => {
    await goToPage(pageUrl);

    for (const label of Object.keys(data.categorical)) {
      const element = await getOneElementInnerHTML(
        getTestId(`category-${label}`)
      );

      expect(element).toMatchSnapshot();

      await clickOn(`${label}:category-expand`);

      const categories = await getAllCategoriesAndCounts(label);

      expect(Object.keys(categories)).toMatchObject(
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        Object.keys(data.categorical[label])
      );

      expect(Object.values(categories)).toMatchObject(
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        Object.values(data.categorical[label])
      );
    }
  });

  test("continuous data appears", async () => {
    await goToPage(pageUrl);

    for (const label of Object.keys(data.continuous)) {
      await waitByID(`histogram-${label}`);
    }
  });
});

describe("cell selection", () => {
  test("selects all cells cellset 1", async () => {
    await goToPage(pageUrl);

    const cellCount = await getCellSetCount(1);
    expect(cellCount).toBe(data.dataframe.nObs);
  });

  test("selects all cells cellset 2", async () => {
    await goToPage(pageUrl);

    const cellCount = await getCellSetCount(2);
    expect(cellCount).toBe(data.dataframe.nObs);
  });

  test("selects cells via lasso", async () => {
    await goToPage(pageUrl);

    for (const cellset of data.cellsets.lasso) {
      const cellset1 = await calcDragCoordinates(
        "layout-graph",
        cellset["coordinates-as-percent"]
      );

      await drag("layout-graph", cellset1.start, cellset1.end, true);
      const cellCount = await getCellSetCount(1);
      expect(cellCount).toBe(cellset.count);
    }
  });

  test("selects cells via categorical", async () => {
    await goToPage(pageUrl);

    for (const cellset of data.cellsets.categorical) {
      await clickOn(`${cellset.metadata}:category-expand`);
      await clickOn(`${cellset.metadata}:category-select`);

      for (const value of cellset.values) {
        await clickOn(`categorical-value-select-${cellset.metadata}-${value}`);
      }

      const cellCount = await getCellSetCount(1);

      expect(cellCount).toBe(cellset.count);
    }
  });

  test("selects cells via continuous", async () => {
    await goToPage(pageUrl);

    for (const cellset of data.cellsets.continuous) {
      const histBrushableAreaId = `histogram-${cellset.metadata}-plot-brushable-area`;

      const coords = await calcDragCoordinates(
        histBrushableAreaId,
        cellset["coordinates-as-percent"]
      );

      await drag(histBrushableAreaId, coords.start, coords.end);

      const cellCount = await getCellSetCount(1);

      expect(cellCount).toBe(cellset.count);
    }
  });
});

describe("subset", () => {
  test("subset - cell count matches", async () => {
    await goToPage(pageUrl);

    for (const select of data.subset.cellset1) {
      if (select.kind === "categorical") {
        await selectCategory(select.metadata, select.values, true);
      }
    }

    await clickOn("subset-button");

    for (const label of Object.keys(data.subset.categorical)) {
      const categories = await getAllCategoriesAndCounts(label);

      expect(Object.keys(categories)).toMatchObject(
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        Object.keys(data.subset.categorical[label])
      );

      expect(Object.values(categories)).toMatchObject(
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        Object.values(data.subset.categorical[label])
      );
    }
  });

  test("lasso after subset", async () => {
    await goToPage(pageUrl);

    for (const select of data.subset.cellset1) {
      if (select.kind === "categorical") {
        await selectCategory(select.metadata, select.values, true);
      }
    }

    await clickOn("subset-button");

    const lassoSelection = await calcDragCoordinates(
      "layout-graph",
      data.subset.lasso["coordinates-as-percent"]
    );

    await drag("layout-graph", lassoSelection.start, lassoSelection.end, true);

    const cellCount = await getCellSetCount(1);
    expect(cellCount).toBe(data.subset.lasso.count);
  });
});

describe("clipping", () => {
  test("clip continuous", async () => {
    await goToPage(pageUrl);

    await clip(data.clip.min, data.clip.max);
    const histBrushableAreaId = `histogram-${data.clip.metadata}-plot-brushable-area`;
    const coords = await calcDragCoordinates(
      histBrushableAreaId,
      data.clip["coordinates-as-percent"]
    );
    await drag(histBrushableAreaId, coords.start, coords.end);
    const cellCount = await getCellSetCount(1);
    expect(cellCount).toBe(data.clip.count);
  });
});

// interact with UI elements just that they do not break
describe("ui elements don't error", () => {
  test("color by", async () => {
    await goToPage(pageUrl);

    const allLabels = [
      ...Object.keys(data.categorical),
      ...Object.keys(data.continuous),
    ];

    for (const label of allLabels) {
      await clickOn(`colorby-${label}`);
    }
  });

  test("pan and zoom", async () => {
    await goToPage(pageUrl);

    await clickOn("mode-pan-zoom");
    const panCoords = await calcDragCoordinates(
      "layout-graph",
      data.pan["coordinates-as-percent"]
    );

    await drag("layout-graph", panCoords.start, panCoords.end, false);

    await page.evaluate("window.scrollBy(0, 1000);");
  });
});

describe("centroid labels", () => {
  test("labels are created", async () => {
    await goToPage(pageUrl);

    const labels = Object.keys(data.categorical);

    await clickOn(`colorby-${labels[0]}`);
    await clickOn("centroid-label-toggle");

    // Toggle colorby for each category and check to see if labels are generated
    for (let i = 0, { length } = labels; i < length; i += 1) {
      const label = labels[i];
      // first label is already enabled
      if (i !== 0) await clickOn(`colorby-${label}`);
      const generatedLabels = await getAllByClass("centroid-label");
      // Number of labels generated should be equal to size of the object
      expect(generatedLabels).toHaveLength(
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        Object.keys(data.categorical[label]).length
      );
    }
  });
});

describe("graph overlay", () => {
  test("transform centroids correctly", async () => {
    await goToPage(pageUrl);

    const category = Object.keys(data.categorical)[0];

    await clickOn(`colorby-${category}`);
    await clickOn("centroid-label-toggle");
    await clickOn("mode-pan-zoom");

    const panCoords = await calcDragCoordinates(
      "layout-graph",
      data.pan["coordinates-as-percent"]
    );

    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const categoryValue = Object.keys(data.categorical[category])[0];
    const initialCoordinates = await getElementCoordinates(
      `${categoryValue}-centroid-label`
    );

    await drag("layout-graph", panCoords.start, panCoords.end, false);
    const terminalCoordinates = await getElementCoordinates(
      `${categoryValue}-centroid-label`
    );

    expect(terminalCoordinates[0] - initialCoordinates[0]).toBeCloseTo(
      panCoords.end.x - panCoords.start.x
    );
    expect(terminalCoordinates[1] - initialCoordinates[1]).toBeCloseTo(
      panCoords.end.y - panCoords.start.y
    );
  });
});

test("pan zoom mode resets lasso selection", async () => {
  await goToPage(pageUrl);

  const panzoomLasso = data.features.panzoom.lasso;

  const lassoSelection = await calcDragCoordinates(
    "layout-graph",
    panzoomLasso["coordinates-as-percent"]
  );

  await drag("layout-graph", lassoSelection.start, lassoSelection.end, true);
  await waitByID("lasso-element", { visible: true });

  const initialCount = await getCellSetCount(1);

  expect(initialCount).toBe(panzoomLasso.count);

  await clickOn("mode-pan-zoom");
  await clickOn("mode-lasso");

  const modeSwitchCount = await getCellSetCount(1);

  expect(modeSwitchCount).toBe(initialCount);
});

test("lasso moves after pan", async () => {
  await goToPage(pageUrl);

  const panzoomLasso = data.features.panzoom.lasso;
  const coordinatesAsPercent = panzoomLasso["coordinates-as-percent"];

  const lassoSelection = await calcDragCoordinates(
    "layout-graph",
    coordinatesAsPercent
  );

  await drag("layout-graph", lassoSelection.start, lassoSelection.end, true);
  await waitByID("lasso-element", { visible: true });

  const initialCount = await getCellSetCount(1);

  expect(initialCount).toBe(panzoomLasso.count);

  await clickOn("mode-pan-zoom");

  const panCoords = await calcDragCoordinates(
    "layout-graph",
    coordinatesAsPercent
  );

  await drag("layout-graph", panCoords.start, panCoords.end, false);
  await clickOn("mode-lasso");

  const panCount = await getCellSetCount(2);

  expect(panCount).toBe(initialCount);
});

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions */

/*
Tests included below are specific to annotation features
*/

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
  test("truncate midpoint whitespace", async () => {
    await setup(config);
    const newLabelName = "123 456";
    await renameLabel(perTestCategoryName, perTestLabelName, newLabelName);
    const value = await waitByID(
      `categorical-value-${perTestCategoryName}-${newLabelName}`
    );
    const result = await page.evaluate((elem) => elem.outerHTML, value);
    expect(result).toMatchSnapshot();
  });

  test("truncate single character", async () => {
    await setup(config);
    const newLabelName = "T";
    await renameLabel(perTestCategoryName, perTestLabelName, newLabelName);
    const value = await waitByID(
      `categorical-value-${perTestCategoryName}-${newLabelName}`
    );
    const result = await page.evaluate((elem) => elem.outerHTML, value);
    expect(result).toMatchSnapshot();
  });
});
