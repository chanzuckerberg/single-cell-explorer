import { AppDispatch, RootState } from "../../../reducers";

interface StateProps {
  activeTab: string;
  infoPanelMinimized: boolean;
  infoPanelHidden: boolean;
}

export enum TabsValue {
  Gene = 0,
  CellType = 1,
  Dataset = 2,
}

export type Props = StateProps & { dispatch: AppDispatch };

export const mapStateToProps = (state: RootState): StateProps => ({
  activeTab: state.controls.activeTab,
  infoPanelMinimized: state.controls.infoPanelMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
});
