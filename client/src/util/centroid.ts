import quantile from "./quantile";
import { memoize } from "./dataframe/util";
import { Dataframe, DataframeValue } from "./dataframe";
import {
  createCategorySummaryFromDfCol,
  isSelectableCategoryName,
} from "./stateManager/controlsHelpers";
import {
  CategoricalAnnotationColumnSchema,
  Schema,
} from "../common/types/schema";
import { LayoutChoiceState } from "../reducers/layoutChoice";
import {
  DataframeDictEncodedColumn,
  isDataframeDictEncodedColumn,
} from "./dataframe/types";

/*
  Centroid coordinate calculation
  Calculates centroids for displaying
  In the case that a category is truncated, the truncated labels will not have
    centroids calculated
*/

/*
Generates a mapping of labels to data needed to calculate centroids
*/

export interface CentroidCoordinateObject {
  length: number;
  hasFinite: boolean;
  xCoordinates: Float32Array;
  yCoordinates: Float32Array;
}

const getCoordinatesByLabel = (
  schema: Schema,
  categoryName: string,
  categoryDf: Dataframe,
  layoutChoice: LayoutChoiceState,
  layoutDf: Dataframe
): Map<DataframeValue, CentroidCoordinateObject> => {
  const coordsByCategoryLabel = new Map();
  // If the coloredBy is not a categorical col
  if (!isSelectableCategoryName(schema, categoryName)) {
    return coordsByCategoryLabel;
  }

  const categoryColumn = categoryDf.col(categoryName);
  const categoryArray = categoryColumn.asArray();
  const layoutDimNames = layoutChoice.currentDimNames;
  const layoutXArray = layoutDf.col(layoutDimNames[0]).asArray();
  const layoutYArray = layoutDf.col(layoutDimNames[1]).asArray();

  const categorySummary = createCategorySummaryFromDfCol(
    categoryColumn,
    schema.annotations.obsByName[
      categoryName
    ] as CategoricalAnnotationColumnSchema
  );

  const { categoryValueIndices, categoryValueCounts } = categorySummary;

  // For dict-encoded columns, we need to map codes to labels for the result map keys
  // but still use codes to look up indices (since categoryValueIndices is keyed by label strings)
  const isDictEncoded = isDataframeDictEncodedColumn(categoryColumn);
  const codeMapping = isDictEncoded
    ? (categoryColumn as DataframeDictEncodedColumn).codeMapping
    : null;

  // Iterate over all cells
  for (let i = 0, len = categoryArray.length; i < len; i += 1) {
    // Fetch the code/value of the current cell
    const dataValue = categoryArray[i];

    // For dict-encoded, convert code to label string for lookups
    const labelString = isDictEncoded ? codeMapping![dataValue as number] : dataValue;

    // Get the index of the label within the category (categoryValueIndices is keyed by label strings)
    const labelIndex = categoryValueIndices.get(labelString);

    // If the category's labels are truncated and this label is removed,
    //  it will not be assigned a label and will not be
    //  labeled on the graph
    // If the user created this category,
    //  do not create a coord for the `unassigned` label
    if (labelIndex !== undefined) {
      // Use labelString as the key (so the result map is keyed by label strings, not codes)
      let coords = coordsByCategoryLabel.get(labelString);
      if (coords === undefined) {
        // Get the number of cells which are in the label
        const numInLabel = categoryValueCounts[labelIndex];
        coords = {
          hasFinite: false,
          xCoordinates: new Float32Array(numInLabel),
          yCoordinates: new Float32Array(numInLabel),
          length: 0,
        };
        coordsByCategoryLabel.set(labelString, coords);
      }

      coords.hasFinite =
        coords.hasFinite ||
        (Number.isFinite(layoutXArray[i]) && Number.isFinite(layoutYArray[i]));

      const coordinatesLength = coords.length;

      coords.xCoordinates[coordinatesLength] = layoutXArray[i];
      coords.yCoordinates[coordinatesLength] = layoutYArray[i];

      coords.length = coordinatesLength + 1;
    }
  }
  return coordsByCategoryLabel;
};

/*
  calcMedianCentroid calculates the median coordinates for labels in a given category

  label -> [x-Coordinate, y-Coordinate]
*/

const calcMedianCentroid = (
  schema: Schema,
  categoryName: string,
  categoryDf: Dataframe,
  layoutChoice: LayoutChoiceState,
  layoutDf: Dataframe
): Map<DataframeValue, [number, number]> => {
  // generate a map describing the coordinates for each label within the given category
  const dataMap = getCoordinatesByLabel(
    schema,
    categoryName,
    categoryDf,
    layoutChoice,
    layoutDf
  );

  // label => [medianXCoordinate, medianYCoordinate]
  const coordinates = new Map();

  // Iterate over the recently created map
  dataMap.forEach((coords, label) => {
    // If there are coordinates for this label,
    // and there is a finite coordinate for the label
    if (coords.length > 0 && coords.hasFinite) {
      const calculatedCoordinates = [];

      // Find and store the median x and y coordinate
      calculatedCoordinates[0] = quantile([0.5], coords.xCoordinates)[0];
      calculatedCoordinates[1] = quantile([0.5], coords.yCoordinates)[0];

      coordinates.set(label, calculatedCoordinates);
    }
  });

  // return the map: label -> [medianXCoordinate, medianYCoordinate]
  return coordinates;
};

// A simple function to hash the parameters
const hashMedianCentroid = (
  _: Schema,
  categoryName: string,
  categoryDf: Dataframe,
  layoutChoice: LayoutChoiceState,
  layoutDf: Dataframe
): string => {
  const category = categoryDf.col(categoryName);
  const layoutDimNames = layoutChoice.currentDimNames;
  const layoutX = layoutDf.col(layoutDimNames[0]);
  const layoutY = layoutDf.col(layoutDimNames[1]);
  return `${category.__id}+${layoutX.__id}:${layoutY.__id}`;
};
// export the memoized calculation function
export default memoize(calcMedianCentroid, hashMedianCentroid);
