import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "reducers";
import { CategoricalAnnotationColumnSchema, Field } from "common/types/schema";
import { createCategorySummaryFromDfCol } from "util/stateManager/controlsHelpers";
import { isDataframeDictEncodedColumn } from "util/dataframe/types";
import { ENTITIES } from "./entities";

export const USE_CELL_TYPES = {
  entities: [ENTITIES.CELL_TYPE],
  id: "cell-type",
};

const METADATA_FIELD = "cell_type";

export function useCellTypesQuery(
  options?: Partial<UseQueryOptions<string[]>>
): UseQueryResult<string[]> {
  const { annoMatrix } = useSelector((state: RootState) => ({
    annoMatrix: state.annoMatrix,
  }));

  return useQuery({
    queryKey: [USE_CELL_TYPES],
    queryFn: async () => {
      const categoryData = await annoMatrix.fetch(Field.obs, METADATA_FIELD);
      const column = categoryData.icol(0);
      const colSchema = annoMatrix.schema.annotations.obsByName[METADATA_FIELD];
      const categorySummary = createCategorySummaryFromDfCol(
        column,
        colSchema as CategoricalAnnotationColumnSchema
      );

      const categoryIndices = Array.from(categorySummary.categoryValueIndices)
        .filter(([, index]) => categorySummary.categoryValueCounts[index] > 0)
        .map(([, index]) => index);

      return categoryIndices.map((index) => {
        const label = categorySummary.categoryValues[index];
        const labelName = isDataframeDictEncodedColumn(column)
          ? column.codeMapping[parseInt(label as string, 10)]
          : label;

        return labelName as string;
      });
    },
    ...options,
  });
}
