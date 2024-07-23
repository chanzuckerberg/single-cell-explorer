import { RootState } from "../../../../reducers";

export interface Props {
  cellInfo: RootState["controls"]["cellInfo"];
}

export const mapStateToProps = (state: RootState): Props => ({
  cellInfo: state.controls.cellInfo,
});
