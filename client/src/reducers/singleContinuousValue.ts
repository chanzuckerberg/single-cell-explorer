import { Action, AnyAction } from "redux";

export interface SingleContinuousValueState {
  singleContinuousValues: Map<string, string>;
}

const initialState = {
  singleContinuousValues: new Map(),
};

export interface SingleContinuousValueAction extends Action<string> {
  field: string;
  value: string;
}

const singleContinuousValue = (
  state = initialState,
  action: AnyAction
): SingleContinuousValueState => {
  switch (action.type) {
    case "add single continuous value":

      state.singleContinuousValues.set(action.field, action.value);
      return state;
    default:
      return state;
  }
};

export default singleContinuousValue;
