import { type RootState } from "../reducers";

export function getCurrentLayout(
  state: RootState,
  layoutChoice: string
): {
  current: string;
  currentDimNames: Array<string>;
} {
  const { schema } = state.annoMatrix;
  const currentDimNames = schema.layout.obsByName[layoutChoice].dims;

  return { current: layoutChoice, currentDimNames };
}

export function getBestDefaultLayout(layouts: Array<string>): string {
  const preferredNames = ["spatial", "umap", "tsne", "pca"];
  const idx = preferredNames.findIndex((name) => layouts.indexOf(name) !== -1);
  if (idx !== -1) return preferredNames[idx];
  return layouts[0];
}
