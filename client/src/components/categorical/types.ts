import { Schema } from "../../common/types/schema";

import { AppDispatch, RootState } from "../../reducers";

export interface DispatchProps {
  dispatch: AppDispatch;
}

export interface StateProps {
  schema?: Schema;
  isCellGuideCxg: boolean;
  expandedCategories: RootState["controls"]["expandedCategories"];
}

export type Props = StateProps & DispatchProps;
