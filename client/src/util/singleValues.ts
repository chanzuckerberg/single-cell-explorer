import { Schema } from "common/types/schema";
import { selectableCategoryNames } from "./stateManager/controlsHelpers";

export function allSingleValues({ schema }: { schema: Schema }) {
  const singleValues = new Map();
  const allCategoryNames = () => selectableCategoryNames(schema).sort();

  allCategoryNames().forEach((catName) => {
    const colSchema = schema.annotations.obsByName[catName];
    const isUserAnno = colSchema?.writable;
    if (!isUserAnno && colSchema.categories?.length === 1) {
      singleValues.set(catName, colSchema.categories[0]);
    }
  });
  return singleValues;
}
