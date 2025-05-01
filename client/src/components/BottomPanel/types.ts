import { AppDispatch, RootState } from "reducers";

interface StateProps {
  bottomPanelHidden: boolean;
}

export type Props = StateProps & { dispatch: AppDispatch };

export const mapStateToProps = (state: RootState): StateProps => ({
  bottomPanelHidden: state.controls.bottomPanelHidden,
});
