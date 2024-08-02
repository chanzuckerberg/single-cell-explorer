import { RootState } from "../../../../reducers";

export interface Props {
  cellInfo: RootState["controls"]["cellInfo"];
  cellTypes: RootState["controls"]["cellTypes"];
}

export const mapStateToProps = (state: RootState): Props => ({
  cellInfo: state.controls.cellInfo,
  cellTypes: state.controls.cellTypes,
});
