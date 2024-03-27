/**
 * Smoke test suite that will be run in GHA
 * Tests included in this file are expected to be relatively stable and test core features
 *
 * (seve): `locator.click({force: true})` is required on some elements due to weirdness with bp3 elements which route clicks to non-target elements
 *          https://playwright.dev/docs/input#forcing-the-click
 */

/* eslint-disable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */
import { Page } from "@playwright/test";
import { test, expect } from "@chromatic-com/playwright";

import { getElementCoordinates, tryUntil } from "./puppeteerUtils";
import mockSetup from "./playwright.global.setup";

import {
  calcDragCoordinates,
  drag,
  scroll,
  expandCategory,
  subset,
  createGeneset,
  deleteGeneset,
  assertGenesetExists,
  assertGenesetDoesNotExist,
  getCellSetCount,
  editGenesetName,
  assertGeneExistsInGeneset,
  removeGene,
  assertGeneDoesNotExist,
  expandGene,
  colorByGeneset,
  assertColorLegendLabel,
  colorByGene,
  clip,
  getAllCategoriesAndCounts,
  selectCategory,
  addGeneToSetAndExpand,
  requestGeneInfo,
  assertGeneInfoCardExists,
  assertGeneInfoCardIsMinimized,
  minimizeGeneInfo,
  removeGeneInfo,
  addGeneToSearch,
  assertGeneInfoDoesNotExist,
  waitUntilNoSkeletonDetected,
  checkGenesetDescription,
  assertUndoRedo,
  snapshotTestGraph,
} from "./cellxgeneActions";

import { datasets } from "./data";

import { scaleMax } from "../../src/util/camera";
import {
  DATASET,
  pageURLTruncate,
  testURL,
  pageURLSpatial,
} from "../common/constants";
import { goToPage } from "../util/helpers";

const { describe } = test;

// geneset CRUD
const genesetToDeleteName = "geneset_to_delete";
const meanExpressionBrushGenesetName = "second_gene_set";

// initial text, the text we type in, the result
const editableGenesetName = "geneset_to_edit";
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

// open gene info card
const geneToRequestInfo = "SIK1";

const genesetDescriptionString = "fourth_gene_set: fourth description";
const genesetToCheckForDescription = "fourth_gene_set";

// TODO #754
test.beforeEach(mockSetup);

const testDatasets = [
  DATASET,
  "super-cool-spatial.cxg",
] as (keyof typeof datasets)[];

const testURLs = {
  [DATASET]: testURL,
  "super-cool-spatial.cxg": pageURLSpatial,
};

for (const testDataset of testDatasets) {
  const data = datasets[testDataset];
  const url = testURLs[testDataset];

  describe(`dataset: ${testDataset}`, () => {
    describe("did launch", () => {
      test("page launched", async ({ page }) => {
        await goToPage(page, url);

        const element = await page.getByTestId("header").innerHTML();

        expect(element).toMatchSnapshot();
      });
    });

    describe("breadcrumbs loads", () => {
      test("dataset and collection from breadcrumbs appears", async ({
        page,
      }) => {
        await goToPage(page, url);

        const datasetElement = await page.getByTestId("bc-Dataset").innerHTML();
        const collectionsElement = await page
          .getByTestId("bc-Collection")
          .innerHTML();
        expect(datasetElement).toMatchSnapshot();
        expect(collectionsElement).toMatchSnapshot();
      });

      test("datasets from breadcrumbs appears on clicking collections", async ({
        page,
      }) => {
        await goToPage(page, url);
        await page.getByTestId(`bc-Dataset`).click();
        const element = await page
          .getByTestId("dataset-menu-item-Sed eu nisi condimentum")
          .innerHTML();
        expect(element).toMatchSnapshot();
      });
    });

    describe("metadata loads", () => {
      test("categories and values from dataset appear", async ({ page }) => {
        await goToPage(page, url);
        for (const label of Object.keys(
          data.categorical
        ) as (keyof typeof data.categorical)[]) {
          const element = await page
            .getByTestId(`category-${label}`)
            .innerHTML();

          expect(element).toMatchSnapshot();

          await page.getByTestId(`${label}:category-expand`).click();

          const categories = await getAllCategoriesAndCounts(label, page);

          expect(categories).toMatchObject(data.categorical[label]);
        }
      });

      test("continuous data appears", async ({ page }) => {
        await goToPage(page, url);
        for (const label of Object.keys(data.continuous)) {
          expect(
            await page.getByTestId(`histogram-${label}-plot`)
          ).not.toHaveCount(0);
        }
      });
    });

    describe("cell selection", () => {
      test("selects all cells cellset 1", async ({ page }) => {
        await goToPage(page, url);
        const cellCount = await getCellSetCount(1, page);
        expect(cellCount).toBe(data.dataframe.nObs);
      });

      test("selects all cells cellset 2", async ({ page }) => {
        await goToPage(page, url);
        const cellCount = await getCellSetCount(2, page);
        expect(cellCount).toBe(data.dataframe.nObs);
      });

      test("selects cells via lasso", async ({ page }) => {
        await goToPage(page, url);
        for (const cellset of data.cellsets.lasso) {
          const cellset1 = await calcDragCoordinates(
            "layout-graph",
            cellset["coordinates-as-percent"],
            page
          );

          await drag("layout-graph", cellset1.start, cellset1.end, page, true);
          const cellCount = await getCellSetCount(1, page);
          expect(cellCount).toBe(cellset.count);
        }
      });

      test("selects cells via categorical", async ({ page }) => {
        await goToPage(page, url);
        for (const cellset of data.cellsets.categorical) {
          await page.getByTestId(`${cellset.metadata}:category-expand`).click();
          await page
            .getByTestId(`${cellset.metadata}:category-select`)
            .click({ force: true });

          for (const value of cellset.values) {
            await page
              .getByTestId(
                `categorical-value-select-${cellset.metadata}-${value}`
              )
              .click({ force: true });
          }

          const cellCount = await getCellSetCount(1, page);

          expect(cellCount).toBe(cellset.count);
        }
      });

      test("selects cells via continuous", async ({ page }) => {
        await goToPage(page, url);
        for (const cellset of data.cellsets.continuous) {
          const histBrushableAreaId = `histogram-${cellset.metadata}-plot-brushable-area`;

          const coords = await calcDragCoordinates(
            histBrushableAreaId,
            cellset["coordinates-as-percent"],
            page
          );

          await drag(histBrushableAreaId, coords.start, coords.end, page);

          const cellCount = await getCellSetCount(1, page);

          expect(cellCount).toBe(cellset.count);
        }
      });
    });

    describe("subset", () => {
      test("subset - cell count matches", async ({ page }) => {
        await goToPage(page, url);
        for (const select of data.subset.cellset1) {
          if (select.kind === "categorical") {
            await selectCategory(select.metadata, select.values, page, true);
          }
        }

        await page.getByTestId("subset-button").click();

        for (const label of Object.keys(
          data.subset.categorical
        ) as (keyof typeof data.subset.categorical)[]) {
          const categories = await getAllCategoriesAndCounts(label, page);

          expect(categories).toMatchObject(data.subset.categorical[label]);
        }
      });

      test("lasso after subset", async ({ page }) => {
        await goToPage(page, url);
        for (const select of data.subset.cellset1) {
          if (select.kind === "categorical") {
            await selectCategory(select.metadata, select.values, page, true);
          }
        }

        await page.getByTestId("subset-button").click();

        const lassoSelection = await calcDragCoordinates(
          "layout-graph",
          data.subset.lasso["coordinates-as-percent"],
          page
        );

        await drag(
          "layout-graph",
          lassoSelection.start,
          lassoSelection.end,
          page,
          true
        );

        const cellCount = await getCellSetCount(1, page);
        expect(cellCount).toBe(data.subset.lasso.count);
      });
    });

    describe("clipping", () => {
      test("clip continuous", async ({ page }) => {
        await goToPage(page, url);
        await clip(data.clip.min, data.clip.max, page);
        const histBrushableAreaId = `histogram-${data.clip.metadata}-plot-brushable-area`;
        const coords = await calcDragCoordinates(
          histBrushableAreaId,
          data.clip["coordinates-as-percent"],
          page
        );
        await drag(histBrushableAreaId, coords.start, coords.end, page);
        const cellCount = await getCellSetCount(1, page);
        expect(cellCount).toBe(data.clip.count);

        // ensure categorical data appears properly
        for (const label of Object.keys(
          data.categorical
        ) as (keyof typeof data.categorical)[]) {
          const element = await page
            .getByTestId(`category-${label}`)
            .innerHTML();

          expect(element).toMatchSnapshot();

          await page.getByTestId(`${label}:category-expand`).click();

          const categories = await getAllCategoriesAndCounts(label, page);

          expect(categories).toMatchObject(data.categorical[label]);
        }
      });
    });

    // interact with UI elements just that they do not break
    describe("ui elements don't error", () => {
      test("color by", async ({ page }, testInfo) => {
        await goToPage(page, url);
        const allLabels = [
          ...Object.keys(data.categorical),
          ...Object.keys(data.continuous),
        ];

        for (const label of allLabels) {
          await page.getByTestId(`colorby-${label}`).click();
        }
        await snapshotTestGraph(page, testInfo);
      });

      test("pan and zoom", async ({ page }, testInfo) => {
        await goToPage(page, url);
        await page.getByTestId("mode-pan-zoom").click();
        const panCoords = await calcDragCoordinates(
          "layout-graph",
          data.pan["coordinates-as-percent"],
          page
        );

        await drag("layout-graph", panCoords.start, panCoords.end, page);

        await page.evaluate("window.scrollBy(0, 1000);");
        await snapshotTestGraph(page, testInfo);
      });
    });

    describe("centroid labels", () => {
      test("labels are created", async ({ page }) => {
        await goToPage(page, url);
        const labels = Object.keys(
          data.categorical
        ) as (keyof typeof data.categorical)[];

        await page.getByTestId(`colorby-${labels[0]}`).click();
        await page.getByTestId("centroid-label-toggle").click();

        // Toggle colorby for each category and check to see if labels are generated
        for (let i = 0, { length } = labels; i < length; i += 1) {
          const label = labels[i];
          // first label is already enabled
          if (i !== 0) await page.getByTestId(`colorby-${label}`).click();
          const generatedLabels = await page
            .getByTestId("centroid-label")
            .all();

          // Number of labels generated should be equal to size of the object
          expect(generatedLabels).toHaveLength(
            Object.keys(data.categorical[label]).length
          );
        }
      });
    });

    describe("graph overlay", () => {
      test("transform centroids correctly", async ({ page }) => {
        await goToPage(page, url);
        const category = Object.keys(
          data.categorical
        )[0] as keyof typeof data.categorical;

        await page.getByTestId(`colorby-${category}`).click();
        await page.getByTestId("centroid-label-toggle").click();
        await page.getByTestId("mode-pan-zoom").click();

        const panCoords = await calcDragCoordinates(
          "layout-graph",
          data.pan["coordinates-as-percent"],
          page
        );

        const categoryValue = Object.keys(data.categorical[category])[0];
        const initialCoordinates = await getElementCoordinates(
          `centroid-label`,
          categoryValue,
          page
        );

        await tryUntil(
          async () => {
            await drag("layout-graph", panCoords.start, panCoords.end, page);

            const terminalCoordinates = await getElementCoordinates(
              `centroid-label`,
              categoryValue,
              page
            );

            expect(terminalCoordinates[0] - initialCoordinates[0]).toBeCloseTo(
              panCoords.end.x - panCoords.start.x
            );
            expect(terminalCoordinates[1] - initialCoordinates[1]).toBeCloseTo(
              panCoords.end.y - panCoords.start.y
            );
          },
          { page }
        );
      });
    });

    test("zoom limit is 12x", async ({ page }) => {
      await goToPage(page, url);
      const category = Object.keys(
        data.categorical
      )[0] as keyof typeof data.categorical;

      await page.getByTestId(`colorby-${category}`).click();
      await page.getByTestId("centroid-label-toggle").click();
      await page.getByTestId("mode-pan-zoom").click();

      const categoryValue = Object.keys(data.categorical[category])[0];
      const initialCoordinates = await getElementCoordinates(
        `centroid-label`,
        categoryValue,
        page
      );

      await tryUntil(
        async () => {
          await scroll({
            testId: "layout-graph",
            deltaY: -10000,
            coords: initialCoordinates,
            page,
          });

          const newGraph = await page.getByTestId("graph-wrapper");
          const newDistance =
            (await newGraph.getAttribute("data-camera-distance")) ?? "-1";
          expect(parseFloat(newDistance)).toBe(scaleMax);
        },
        { page }
      );
    });

    test("pan zoom mode resets lasso selection", async ({ page }) => {
      await goToPage(page, url);

      await tryUntil(
        async () => {
          const panzoomLasso = data.features.panzoom.lasso;

          const lassoSelection = await calcDragCoordinates(
            "layout-graph",
            panzoomLasso["coordinates-as-percent"],
            page
          );

          await drag(
            "layout-graph",
            lassoSelection.start,
            lassoSelection.end,
            page,
            true
          );
          await expect(page.getByTestId("lasso-element")).toBeVisible();

          const initialCount = await getCellSetCount(1, page);

          expect(initialCount).toBe(panzoomLasso.count);

          await page.getByTestId("mode-pan-zoom");
          await page.getByTestId("mode-lasso");

          const modeSwitchCount = await getCellSetCount(1, page);

          expect(modeSwitchCount).toBe(initialCount);
        },
        { page }
      );
    });

    test("lasso moves after pan", async ({ page }) => {
      goToPage(page, url);

      await tryUntil(
        async () => {
          const panzoomLasso = data.features.panzoom.lasso;
          const coordinatesAsPercent = panzoomLasso["coordinates-as-percent"];

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

          await expect(page.getByTestId("lasso-element")).toBeVisible();

          const initialCount = await getCellSetCount(1, page);

          expect(initialCount).toBe(panzoomLasso.count);

          await page.getByTestId("mode-pan-zoom").click();

          const panCoords = await calcDragCoordinates(
            "layout-graph",
            coordinatesAsPercent,
            page
          );

          await drag("layout-graph", panCoords.start, panCoords.end, page);
          await page.getByTestId("mode-lasso").click();

          const panCount = await getCellSetCount(2, page);

          expect(panCount).toBe(initialCount);
        },
        { page }
      );
    });

    /*
    Tests included below are specific to annotation features
    */

    const options = [
      { withSubset: true, tag: "subset" },
      { withSubset: false, tag: "whole" },
    ];

    for (const option of options) {
      describe(`geneSET crud operations and interactions ${option.tag}`, () => {
        test("brush on geneset mean", async ({ page }) => {
          await setup({ option, page, url });
          await createGeneset(meanExpressionBrushGenesetName, page);
          await addGeneToSetAndExpand(
            meanExpressionBrushGenesetName,
            "SIK1",
            page
          );

          const histBrushableAreaId = `histogram-${meanExpressionBrushGenesetName}-plot-brushable-area`;

          const coords = await calcDragCoordinates(
            histBrushableAreaId,
            {
              x1: 0.1,
              y1: 0.5,
              x2: 0.9,
              y2: 0.5,
            },
            page
          );
          await drag(histBrushableAreaId, coords.start, coords.end, page);
          await page.getByTestId(`cellset-button-1`).click();
          const cellCount = await getCellSetCount(1, page);

          // (seve): the withSubset version of this test is resulting in the unsubsetted value
          if (option.withSubset) {
            expect(cellCount).toBe(data.brushOnGenesetMean.withSubset);
          } else {
            expect(cellCount).toBe(data.brushOnGenesetMean.default);
          }
        });

        test("color by mean expression", async ({ page }, testInfo) => {
          await setup({ option, page, url });
          await createGeneset(meanExpressionBrushGenesetName, page);
          await addGeneToSetAndExpand(
            meanExpressionBrushGenesetName,
            "SIK1",
            page
          );

          await colorByGeneset(meanExpressionBrushGenesetName, page);
          await assertColorLegendLabel(meanExpressionBrushGenesetName, page);
          await snapshotTestGraph(page, testInfo);
        });

        test("diffexp", async ({ page }) => {
          if (option.withSubset) return;

          const runningAgainstDeployment = !testURL.includes("localhost");

          // this test will take longer if we're running against a deployment
          if (runningAgainstDeployment) test.slow();

          await setup({ option, page, url });

          // set the two cell sets to b cells vs nk cells

          const { category, cellset1, cellset2 } = data.diffexp;

          await expandCategory(category, page);

          await page
            .getByTestId(`${category}:category-select`)
            .click({ force: true });

          const cellset1Selector = page.getByTestId(
            `categorical-value-select-${category}-${cellset1.cellType}`
          );
          const cellset2Selector = page.getByTestId(
            `categorical-value-select-${category}-${cellset2.cellType}`
          );

          await cellset1Selector.click({ force: true });

          await page.getByTestId(`cellset-button-1`).click();

          await cellset1Selector.click({ force: true });

          await cellset2Selector.click({ force: true });

          await page.getByTestId(`cellset-button-2`).click();

          // run diffexp
          await page.getByTestId(`diffexp-button`).click();
          await page.getByTestId("pop-1-geneset-expand").click();

          await waitUntilNoSkeletonDetected(page);

          let genesHTML = await page.getByTestId("gene-set-genes").innerHTML();

          expect(genesHTML).toMatchSnapshot();

          // (thuang): We need to assert Pop2 geneset is expanded, because sometimes
          // the click is so fast that it's not registered
          await tryUntil(
            async () => {
              await page.getByTestId("pop-1-geneset-expand").click();
              await page.getByTestId("pop-2-geneset-expand").click();

              await waitUntilNoSkeletonDetected(page);

              expect(page.getByTestId("geneset")).toBeTruthy();

              expect(
                page.getByTestId(`${data.diffexp.pop2Gene}:gene-label`)
              ).toBeVisible();
            },
            { page, timeoutMs: runningAgainstDeployment ? 20000 : undefined }
          );

          genesHTML = await page.getByTestId("gene-set-genes").innerHTML();

          expect(genesHTML).toMatchSnapshot();
        });

        test("create a new geneset and undo/redo", async ({ page }) => {
          /**
           * (thuang): Test is flaky, so we need to retry until it passes
           */
          await tryUntil(
            async () => {
              if (option.withSubset) return;

              await setup({ option, page, url });

              waitUntilNoSkeletonDetected(page);

              const genesetName = `test-geneset-foo-123`;
              await assertGenesetDoesNotExist(genesetName, page);
              await createGeneset(genesetName, page);
              await assertGenesetExists(genesetName, page);
              await assertUndoRedo(
                page,
                async () => assertGenesetDoesNotExist(genesetName, page),
                async () => assertGenesetExists(genesetName, page)
              );
            },
            { page }
          );
        });

        test("edit geneset name and undo/redo", async ({ page }) => {
          /**
           * (thuang): Test is flaky, so we need to retry until it passes
           */
          await tryUntil(
            async () => {
              await setup({ option, page, url });
              await createGeneset(editableGenesetName, page);
              await editGenesetName(editableGenesetName, newGenesetName, page);
              await assertGenesetExists(newGenesetName, page);
              await assertUndoRedo(
                page,
                async () => assertGenesetExists(editableGenesetName, page),
                async () => assertGenesetExists(newGenesetName, page)
              );
            },
            { page }
          );
        });

        test("delete a geneset and undo/redo", async ({ page }) => {
          /**
           * (thuang): Test is flaky, so we need to retry until it passes
           */
          await tryUntil(
            async () => {
              if (option.withSubset) return;

              await setup({ option, page, url });
              await createGeneset(genesetToDeleteName, page);
              await deleteGeneset(genesetToDeleteName, page);
              await assertUndoRedo(
                page,
                async () => assertGenesetExists(genesetToDeleteName, page),
                async () => assertGenesetDoesNotExist(genesetToDeleteName, page)
              );
            },
            { page }
          );
        });

        test("geneset description", async ({ page }) => {
          if (option.withSubset) return;

          await setup({ option, page, url });
          await createGeneset(
            genesetToCheckForDescription,
            page,
            genesetDescriptionString
          );
          await checkGenesetDescription(
            genesetToCheckForDescription,
            genesetDescriptionString,
            page
          );
        });
      });

      describe(`GENE crud operations and interactions ${option.tag}`, () => {
        test("add a gene to geneset and undo/redo", async ({ page }) => {
          /**
           * (thuang): Test is flaky, so we need to retry until it passes
           */
          await tryUntil(
            async () => {
              await setup({ option, page, url });
              await createGeneset(setToAddGeneTo, page);
              await addGeneToSetAndExpand(setToAddGeneTo, geneToAddToSet, page);
              await assertGeneExistsInGeneset(geneToAddToSet, page);
              await assertUndoRedo(
                page,
                async () => assertGeneDoesNotExist(geneToAddToSet, page),
                async () => assertGeneExistsInGeneset(geneToAddToSet, page)
              );
            },
            { page }
          );
        });
        test("expand gene and brush", async ({ page }) => {
          await setup({ option, page, url });
          await createGeneset(brushThisGeneGeneset, page);
          await addGeneToSetAndExpand(
            brushThisGeneGeneset,
            geneToBrushAndColorBy,
            page
          );
          await expandGene(geneToBrushAndColorBy, page);
          const histBrushableAreaId = `histogram-${geneToBrushAndColorBy}-plot-brushable-area`;

          const coords = await calcDragCoordinates(
            histBrushableAreaId,
            {
              x1: 0.25,
              y1: 0.5,
              x2: 0.55,
              y2: 0.5,
            },
            page
          );
          await drag(histBrushableAreaId, coords.start, coords.end, page);
          const cellCount = await getCellSetCount(1, page);
          if (option.withSubset) {
            expect(cellCount).toBe(data.expandGeneAndBrush.withSubset);
          } else {
            expect(cellCount).toBe(data.expandGeneAndBrush.default);
          }
        });
        test("color by gene in geneset", async ({ page }) => {
          await setup({ option, page, url });
          await createGeneset(meanExpressionBrushGenesetName, page);
          await addGeneToSetAndExpand(
            meanExpressionBrushGenesetName,
            "SIK1",
            page
          );

          await colorByGene("SIK1", page);
          await assertColorLegendLabel("SIK1", page);
        });
        test("delete gene from geneset and undo/redo", async ({ page }) => {
          /**
           * (thuang): Test is flaky, so we need to retry until it passes
           */
          await tryUntil(
            async () => {
              if (option.withSubset) return;

              await setup({ option, page, url });
              await createGeneset(setToRemoveFrom, page);
              await addGeneToSetAndExpand(setToRemoveFrom, geneToRemove, page);
              await removeGene(geneToRemove, page);
              await assertGeneDoesNotExist(geneToRemove, page);
              await assertUndoRedo(
                page,
                async () => assertGeneExistsInGeneset(geneToRemove, page),
                async () => assertGeneDoesNotExist(geneToRemove, page)
              );
            },
            { page }
          );
        });
        test("open gene info card and hide/remove", async ({ page }) => {
          await setup({ option, page, url });
          await addGeneToSearch(geneToRequestInfo, page);

          await tryUntil(
            async () => {
              await requestGeneInfo(geneToRequestInfo, page);
              await assertGeneInfoCardExists(geneToRequestInfo, page);
            },
            { page }
          );

          await tryUntil(
            async () => {
              await minimizeGeneInfo(page);
              await assertGeneInfoCardIsMinimized(geneToRequestInfo, page);
            },
            { page }
          );

          await tryUntil(
            async () => {
              await removeGeneInfo(page);
              await assertGeneInfoDoesNotExist(geneToRequestInfo, page);
            },
            { page }
          );
        });
      });
    }
  });
}

test("categories and values from dataset appear and properly truncate if applicable", async ({
  page,
}) => {
  await goToPage(page, pageURLTruncate);
  await tryUntil(
    async () => {
      await page.getByTestId(`truncate:category-expand`).click();
      const categoryRows = await page
        .getByTestId(`category-truncate`)
        .getByTestId("categorical-row")
        .all();

      expect(Object.keys(categoryRows).length).toBe(1001);
    },
    { page }
  );
});

/* eslint-enable no-await-in-loop -- await in loop is needed to emulate sequential user actions  */

async function setup({
  option: { withSubset },
  page,
  url,
}: {
  option: { withSubset: boolean; tag: string };
  page: Page;
  url: string;
}) {
  await goToPage(page, url);

  if (withSubset) {
    await subset({ x1: 0.1, y1: 0.15, x2: 0.8, y2: 0.85 }, page);
  }
}

// TODO(atarashansky): write this test suite
// https://github.com/chanzuckerberg/single-cell-explorer/issues/811
// async function goToCellGuideCxg(page: Page) {
//   await goToPage(page, "http://localhost:3000/d/cellguide-cxgs/example.cxg/");
// }

// describe(`CellGuide CXG tests`, () => {
//   test.only("author and standard category headers are not present", async ({
//     page,
//   }) => {
//     await goToPage(page, url);
//   });
// });
