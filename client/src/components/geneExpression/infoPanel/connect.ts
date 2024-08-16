import { SyntheticEvent, useEffect, useState } from "react";
import { AppDispatch } from "../../../reducers";
import { ActiveTab } from "../../../common/types/entities";

function useConnect({
  dispatch,
  activeTab,
}: {
  dispatch: AppDispatch;
  activeTab: ActiveTab;
}) {
  const [tabValue, setTabValue] = useState(ActiveTab.CellType);

  /**
   * TODO: update to <string, ActiveTab> once we upgrade MUI
   */
  const handleTabsChange = (
    _: SyntheticEvent<Element, Event>,
    activeTabValue: ActiveTab
  ) => {
    setTabValue(activeTabValue);
    dispatch({
      type: "toggle active info panel",
      activeTab: activeTabValue,
    });
  };

  useEffect(() => {
    setTabValue(activeTab);
  }, [activeTab]);

  return { tabValue, handleTabsChange };
}

export default useConnect;
