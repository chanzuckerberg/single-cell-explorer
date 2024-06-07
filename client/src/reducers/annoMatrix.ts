/*
Reducer for the annoMatrix
*/

import { AnyAction } from "redux";
import AnnoMatrix from "../annoMatrix/annoMatrix";
import { AnnoMatrixClipView } from "../annoMatrix/views";

export type AnnoMatrixState = AnnoMatrix | AnnoMatrixClipView;

const AnnoMatrixReducer = (
  state: AnnoMatrixState,
  action: AnyAction
): AnnoMatrixState => {
  if (action.annoMatrix) {
    return action.annoMatrix;
  }
  return state;
};

export default AnnoMatrixReducer;
