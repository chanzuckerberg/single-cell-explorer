import { useMemo } from "react";
import { selectableCategoryNames } from "../../../../util/stateManager/controlsHelpers";
import { Props } from "./types";

export function useConnect({
  schema,
  singleContinuousValues,
}: {
  schema: Props["schema"];
  singleContinuousValues: Props["singleContinuousValues"];
}) {
  const allCategoryNames = useMemo(
    () => selectableCategoryNames(schema).sort(),
    [schema]
  );

  const allSingleValues = useMemo(() => {
    const singleValues = new Map();

    allCategoryNames.forEach((catName) => {
      const colSchema = schema.annotations.obsByName[catName];
      const isUserAnno = colSchema?.writable;
      if (!isUserAnno && colSchema.categories?.length === 1) {
        singleValues.set(catName, colSchema.categories[0]);
      }
    });

    singleContinuousValues.forEach((value, catName) => {
      singleValues.set(catName, value);
    });

    return singleValues;
  }, [schema, allCategoryNames, singleContinuousValues]);

  return {
    allSingleValues,
  };
}
