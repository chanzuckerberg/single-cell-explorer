import { AppDispatch, RootState } from "reducers";
import { DifferentialState } from "reducers/differential";

export interface DiffexpButtonsProps {
  differential: DifferentialState;
  diffexpMayBeSlow: boolean;
  diffexpCellcountMax: number;
  dispatch: AppDispatch;
}

export const mapStateToProps = (state: RootState) => ({
  differential: state.differential,
  diffexpMayBeSlow: state.config?.parameters?.["diffexp-may-be-slow"] ?? false,
  diffexpCellcountMax: state.config?.limits?.diffexp_cellcount_max ?? 0,
});

export const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch,
});
