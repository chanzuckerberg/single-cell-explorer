import actions from "actions";
import { Dataframe } from "util/dataframe";
import { isDataframeDictEncodedColumn } from "util/dataframe/types";
import { Field } from "common/types/schema";
import { Query } from "annoMatrix/query";
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
  async (dispatch: AppDispatch, getState: GetState): Promise<string> => {
    if (args?.error) {
      return `${args.error}. I will halt execution and report this error to the user.`;
    }

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
    return `Performed categorical selection on ${args.category_value}.`;
  };

export const performHistogramSelection =
  (args: Record<string, string>) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<string> => {
    const { annoMatrix } = getState();
    let query;
    let df: Dataframe;
    const { schema } = annoMatrix;
    const varIndex = schema?.annotations?.var?.index;
    if (args.histogram_type === "geneset") {
      if (args?.status === "need_available_genesets") {
        const { genesets } = getState();
        const genesetNames = Array.from(genesets.genesets.keys());
        if (genesetNames.length === 0) {
          return "There are no genesets available to perform selection on. I must now create a new geneset and then try again. I will continue execution.";
        }
        return `I have decided to perform histogram selection on a geneset. Here are the available geneset names: ${genesetNames}. I must select one of these genesets to perform selection on. If there are no matching genesets, I must create a new geneset. I will continue execution.`;
      }

      const geneset = getState().genesets.genesets.get(args.histogram_name);
      if (!geneset || geneset.genes.size === 0) {
        return "The selected geneset is empty. Please select a different geneset or add genes to this one.";
      }

      query = [
        Field.X,
        {
          summarize: {
            method: "mean",
            field: "var",
            column: varIndex,
            values: [...geneset.genes.keys()],
          },
        },
      ];
    } else if (args.histogram_type === "metadata") {
      query = [Field.obs, args.histogram_name];
    } else if (args.histogram_type === "gene") {
      query = [
        "X",
        {
          where: {
            column: varIndex,
            field: Field.var,
            value: args.histogram_name,
          },
        },
      ];
    } else {
      return "Invalid histogram type specified.";
    }

    try {
      df = await annoMatrix.fetch(query[0] as Field, query[1] as Query);
    } catch (error) {
      return `${args.histogram_type} is not a valid histogram type for ${args.histogram_name}. I must now try a different histogram type for the same data: ${args.histogram_name}. I will continue execution.`;
    }

    const column = df.icol(0);
    let summary;

    if (args.histogram_type === "geneset") {
      const values = column.asArray() as number[];
      if (!values || !values.length) {
        return "No valid data found for this geneset.";
      }

      try {
        const min = values.reduce((a, b) => Math.min(a, b), values[0]);
        const max = values.reduce((a, b) => Math.max(a, b), values[0]);
        summary = { min, max };
      } catch (error) {
        console.error("Error calculating min/max:", error);
        return "Error processing geneset data.";
      }
    } else {
      summary = column.summarizeContinuous();
    }

    const { min, max } = summary;

    let lo = args.range_low ? parseFloat(args.range_low) : min;
    let hi = args.range_high ? parseFloat(args.range_high) : max;

    lo = Math.max(lo, min);
    hi = Math.min(hi, max);

    try {
      await dispatch(
        actions.selectContinuousMetadataAction(
          "type continuous metadata histogram start",
          query,
          [lo, hi]
        )
      );

      await dispatch(
        actions.selectContinuousMetadataAction(
          "type continuous metadata histogram brush",
          query,
          [lo, hi]
        )
      );

      await dispatch(
        actions.selectContinuousMetadataAction(
          "type continuous metadata histogram end",
          query,
          [lo, hi]
        )
      );
    } catch (error) {
      console.log(error);
    }

    return `Successfully performed histogram selection for ${args.histogram_name} with range ${lo} to ${hi}.`;
  };

export const performExpandCategory = (args: Record<string, string>) => () => {
  const categoryElement = document.querySelector(
    `[data-testid="category-${args.category_name}"]`
  );
  if (categoryElement instanceof HTMLElement) {
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

// export const performPanning =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed panning");
//   };

// export const performZoomIn =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed zoom in");
//   };

// export const performZoomOut =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed zoom out");
//   };

export const performColorByGene =
  (args: Record<string, string>) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<string> => {
    const { gene } = args;

    // Get valid gene names from the matrix
    const {
      annoMatrix,
      colors: { colorAccessor },
    } = getState();
    const { schema } = annoMatrix;
    const varIndex = schema.annotations.var.index;
    const df = await annoMatrix.fetch(Field.var, varIndex);

    // Check if there is a filtered column
    const isFilteredCol = "feature_is_filtered";
    const isFiltered =
      annoMatrix.getMatrixColumns(Field.var).includes(isFilteredCol) &&
      (await annoMatrix.fetch(Field.var, isFilteredCol));

    let validGenes;
    if (isFiltered) {
      const isFilteredArray = isFiltered.col(isFilteredCol).asArray();
      validGenes = df
        .col(varIndex)
        .asArray()
        .filter((_, index: number) => !isFilteredArray[index] && _) as string[];
    } else {
      validGenes = df.col(varIndex).asArray() as string[];
    }

    // Verify gene is valid before proceeding
    if (!validGenes.includes(gene)) {
      return "The requested gene name is not present in the dataset. Please instruct the user to select a valid gene.";
    }
    if (colorAccessor === gene) {
      return "The visualization is already colored by the requested gene.";
    }
    dispatch({ type: "single user defined gene start" });
    dispatch(actions.requestUserDefinedGene(gene));
    dispatch({ type: "single user defined gene complete" });
    dispatch(actions.requestSingleGeneExpressionCountsForColoringPOST(gene));
    return "Successfully colored the visualization by the requested gene.";
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
  (args: Record<string, string>) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<string> => {
    const { geneset } = args;
    if (args?.status === "need_available_genesets") {
      const { genesets } = getState();
      const genesetNames = Array.from(genesets.genesets.keys());
      if (genesetNames.length === 0) {
        return "There are no genesets available. I must now create a new geneset and then try again. I will continue execution.";
      }
      return `I have decided to perform the color by geneset action. If there are no matching genesets, I must create a new geneset. IMPORTANT: Here are the available geneset names: ${genesetNames}. I will continue execution.`;
    }

    dispatch({
      type: "color by geneset mean expression",
      geneset,
    });
    return `Successfully colored by geneset: ${geneset}`;
  };

export const performColorByMetadata =
  (args: Record<string, string>) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<string> => {
    if (args?.error) {
      return `${args.error}. I will halt execution and report this error to the user.`;
    }
    const {
      colors: { colorAccessor },
    } = getState();
    // Determine if the metadata is categorical or continuous
    const { annoMatrix } = getState();
    const { schema } = annoMatrix;
    const metadata = schema.annotations.obsByName[args.metadata_name];
    const { categories: allCategoryValues } = metadata;
    const isCategorical = allCategoryValues !== undefined;

    if (isCategorical) {
      const categoryElement = document.querySelector(
        `[data-testid="category-${args.metadata_name}"]`
      );
      if (categoryElement instanceof HTMLElement) {
        const isNotExpandedElement = categoryElement.querySelector(
          '[data-testid="category-expand-is-not-expanded"]'
        );
        if (isNotExpandedElement) {
          (
            categoryElement.querySelector(
              `[data-testid="${args.metadata_name}:category-expand"]`
            ) as HTMLElement
          )?.click();
        }
      }

      if (colorAccessor === args.metadata_name) {
        return `The visualization is already colored by the requested metadata: ${args.metadata_name}.`;
      }

      dispatch({
        type: "color by categorical metadata",
        colorAccessor: args.metadata_name,
      });
    } else {
      dispatch({
        type: "color by continuous metadata",
        colorAccessor: args.metadata_name,
      });
    }
    return `Successfully colored by metadata: ${args.metadata_name}`;
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

// export const performXYScatterplot =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed XY scatterplot");
//   };

// export const performShowCellGuide =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed show cell guide");
//   };

// export const performShowGeneCard =
//   () => (dispatch: AppDispatch, getState: GetState) => {
//     console.log("Performed show gene card");
//   };
