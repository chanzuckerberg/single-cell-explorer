import { AppDispatch, RootState } from "reducers";
import { DifferentialState } from "reducers/differential";

export interface CellSetButtonProps {
  differential: DifferentialState;
  eitherCellSetOneOrTwo: 1 | 2;
  dispatch: AppDispatch;
}

export const mapStateToProps = (state: RootState) => ({
  differential: state.differential,
});

export const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch,
});
