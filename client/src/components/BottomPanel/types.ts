import { AppDispatch, RootState } from "reducers";

interface StateProps {
  bottomPanelMinimized: boolean;
  bottomPanelHidden: boolean;
}

export type Props = StateProps & { dispatch: AppDispatch };

export const mapStateToProps = (state: RootState): StateProps => ({
  bottomPanelHidden: state.controls.bottomPanelHidden,
  bottomPanelMinimized: state.controls.bottomPanelMinimized,
});
