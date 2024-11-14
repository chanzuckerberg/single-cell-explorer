import actions from "actions";
import { Dataframe } from "util/dataframe";
import { isDataframeDictEncodedColumn } from "util/dataframe/types";
import { Field } from "common/types/schema";
import { AppDispatch, GetState } from "../../reducers";
import { subsetAction, resetSubsetAction } from "../../actions/viewStack";

export const performSubset =
  () => (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const crossfilter = state.obsCrossfilter;
    if (!crossfilter) return;
    const selectedCount = crossfilter.countSelected();
    const subsetPossible =
      selectedCount !== 0 && selectedCount !== crossfilter.size();

    if (subsetPossible) {
      dispatch(subsetAction());
    }
  };

export const performUnsubset = () => (dispatch: AppDispatch) => {
  dispatch(resetSubsetAction());
};

export const performCategoricalSelection =
  (args: Record<string, string>) =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { annoMatrix, obsCrossfilter } = getState();
    const { schema } = annoMatrix;

    const columnName = args.column_name;
    const colSchema = schema.annotations.obsByName[columnName];
    const { categories: allCategoryValues } = colSchema;
    const categoryValue = args.category_value;

    const [categoryData]: [Dataframe] = await Promise.all([
      annoMatrix.fetch(Field.obs, columnName),
    ]);

    // our data
    const column = categoryData.icol(0);

    const labelName = isDataframeDictEncodedColumn(column)
      ? column.invCodeMapping[categoryValue]
      : categoryValue;

    if (
      obsCrossfilter.annoMatrix.nObs ===
      obsCrossfilter.obsCrossfilter.countSelected()
    ) {
      await dispatch(
        actions.selectCategoricalAllMetadataAction(
          "categorical metadata filter none of these",
          columnName,
          allCategoryValues,
          false
        )
      );
    }

    await dispatch(
      actions.selectCategoricalMetadataAction(
        "categorical metadata filter select",
        columnName,
        allCategoryValues,
        labelName,
        true
      )
    );
  };

export const performHistogramSelection =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed histogram selection");
  };

export const performExpandCategory = (args: Record<string, string>) => () => {
  const categoryElement = document.querySelector(
    `[data-testid="category-${args.category_name}"]`
  );
  if (categoryElement instanceof HTMLElement) {
    console.log(categoryElement);
    const isNotExpandedElement = categoryElement.querySelector(
      '[data-testid="category-expand-is-not-expanded"]'
    );
    if (isNotExpandedElement) {
      (
        categoryElement.querySelector(
          `[data-testid="${args.category_name}:category-expand"]`
        ) as HTMLElement
      )?.click();
    }
  }
};

export const performPanning =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed panning");
  };

export const performZoomIn =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed zoom in");
  };

export const performZoomOut =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed zoom out");
  };

export const performColorByGene =
  (args: Record<string, string>) => async (dispatch: AppDispatch) => {
    const { gene } = args;

    dispatch({ type: "single user defined gene start" });
    dispatch(actions.requestUserDefinedGene(gene));
    dispatch({ type: "single user defined gene complete" });
    dispatch(actions.requestSingleGeneExpressionCountsForColoringPOST(gene));
  };

export const performExpandGene =
  (args: Record<string, string>) => async (dispatch: AppDispatch) => {
    const { gene } = args;
    dispatch({ type: "single user defined gene start" });
    dispatch(actions.requestUserDefinedGene(gene));
    dispatch({ type: "single user defined gene complete" });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const element = document.querySelector(`[data-testid="maximize-${gene}"]`);
    if (element instanceof HTMLElement) {
      element.click();
    }
  };

export const performColorByGeneset =
  (args: Record<string, string>) => (dispatch: AppDispatch) => {
    const { geneset } = args;
    dispatch({
      type: "color by geneset mean expression",
      geneset,
    });
  };

export const performColorByCategory =
  (args: Record<string, string>) =>
  (dispatch: AppDispatch, getState: GetState) => {
    const {
      colors: { colorAccessor },
    } = getState();

    const categoryElement = document.querySelector(
      `[data-testid="category-${args.category_name}"]`
    );
    if (categoryElement instanceof HTMLElement) {
      console.log(categoryElement);
      const isNotExpandedElement = categoryElement.querySelector(
        '[data-testid="category-expand-is-not-expanded"]'
      );
      if (isNotExpandedElement) {
        (
          categoryElement.querySelector(
            `[data-testid="${args.category_name}:category-expand"]`
          ) as HTMLElement
        )?.click();
      }
    }

    if (colorAccessor === args.category_name) {
      return;
    }

    dispatch({
      type: "color by categorical metadata",
      colorAccessor: args.category_name,
    });
  };

export const performColorByContinuous =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed color by continuous variable");
  };

export const performCreateGeneset =
  (args: Record<string, string | string[]>) =>
  async (dispatch: AppDispatch) => {
    const genesetName = args.geneset_name as string;
    const genesToPopulateGeneset = args.genes_to_populate_geneset as string[];
    const genesetDescription = args.geneset_description as string;
    dispatch({
      type: "geneset: create",
      genesetName: genesetName.trim(),
      genesetDescription,
    });

    if (genesToPopulateGeneset && genesToPopulateGeneset.length > 0) {
      const genesTmpHardcodedFormat = genesToPopulateGeneset.map((gene) => ({
        geneSymbol: gene.trim(),
      }));
      await dispatch(
        actions.genesetAddGenes(genesetName, genesTmpHardcodedFormat)
      );
    }
  };

export const performXYScatterplot =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed XY scatterplot");
  };

export const performShowCellGuide =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed show cell guide");
  };

export const performShowGeneCard =
  () => (dispatch: AppDispatch, getState: GetState) => {
    console.log("Performed show gene card");
  };
