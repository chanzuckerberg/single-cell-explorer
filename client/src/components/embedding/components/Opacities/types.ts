import { AppDispatch, RootState } from "../../../../reducers";

export type Props = StateProps & DispatchProps;

export interface StateProps {
  imageOpacity: RootState["controls"]["imageOpacity"];
  dotOpacity: RootState["controls"]["dotOpacity"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}
