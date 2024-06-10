import React from "react";
import { AnnoMatrixObsCrossfilter } from "../../annoMatrix";

/*
CategoryCrossfilterContext is used to pass a snapshot of the crossfilter
matching the current category summary.
*/
export const CategoryCrossfilterContext =
  React.createContext<AnnoMatrixObsCrossfilter | null>(null);
