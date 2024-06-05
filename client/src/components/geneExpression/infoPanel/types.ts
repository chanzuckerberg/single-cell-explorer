import { AppDispatch, RootState } from "../../../reducers";

export interface Props {
  activeTab: string;
  dispatch: AppDispatch;
  infoPanelMinimized: boolean;
  infoPanelHidden: boolean;
}

export const mapStateToProps = (state: RootState): Props => ({
  activeTab: state.controls.activeTab,
  infoPanelMinimized: state.controls.infoPanelMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
  dispatch: state.controls.dispatch,
});
