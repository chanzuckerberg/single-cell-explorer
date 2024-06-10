import { AppDispatch, RootState } from "../../../reducers";

interface StateProps {
  activeTab: string;
  infoPanelMinimized: boolean;
  infoPanelHidden: boolean;
}

export type Props = StateProps & { dispatch: AppDispatch };

export const mapStateToProps = (state: RootState): StateProps => ({
  activeTab: state.controls.activeTab,
  infoPanelMinimized: state.controls.infoPanelMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
});
