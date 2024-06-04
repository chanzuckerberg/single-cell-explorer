/*
Reducer for the obsCrossfilter
*/

import { AnyAction } from "redux";
import { AnnoMatrixObsCrossfilter } from "../annoMatrix";

const ObsCrossfilter = (
  state: AnnoMatrixObsCrossfilter | undefined,
  action: AnyAction
): AnnoMatrixObsCrossfilter | undefined => {
  if (action.obsCrossfilter) {
    return action.obsCrossfilter;
  }
  return state;
};

export default ObsCrossfilter;
