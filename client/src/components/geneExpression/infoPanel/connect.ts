import { ChangeEvent, useEffect, useState } from "react";
import { AppDispatch } from "../../../reducers";
import { ActiveTab } from "../../../common/types/entities";

function useConnect({
  dispatch,
  activeTab,
}: {
  dispatch: AppDispatch;
  activeTab: string;
}) {
  const [tabValue, setTabValue] = useState(ActiveTab.CellType);

  const handleTabsChange = (
    _: ChangeEvent<Record<string, unknown>>,
    tabsValue: unknown
  ) => {
    setTabValue(tabsValue as ActiveTab);
    dispatch({
      type: "toggle active info panel",
      activeTab: tabsValue as ActiveTab,
    });
  };

  useEffect(() => {
    setTabValue(activeTab as ActiveTab);
  }, [activeTab]);

  return { tabValue, handleTabsChange };
}

export default useConnect;
