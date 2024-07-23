import { ChangeEvent, useEffect, useState } from "react";
import { AppDispatch } from "../../../reducers";
import { TabsValue } from "./types";
import { ActiveTab } from "../../../common/types/entities";

function useConnect({
  dispatch,
  activeTab,
}: {
  dispatch: AppDispatch;
  activeTab: string;
}) {
  const [tabValue, setTabValue] = useState(TabsValue.CellType);

  const handleTabsChange = (
    _: ChangeEvent<Record<string, unknown>>,
    tabsValue: unknown
  ) => {
    setTabValue(tabsValue as number);
    dispatch({
      type: "toggle active info panel",
      activeTab:
        tabsValue === TabsValue.Gene
          ? ActiveTab.Gene
          : tabsValue === TabsValue.CellType
          ? ActiveTab.CellType
          : ActiveTab.Dataset,
    });
  };

  useEffect(() => {
    setTabValue(
      activeTab === ActiveTab.Gene
        ? TabsValue.Gene
        : activeTab === ActiveTab.CellType
        ? TabsValue.CellType
        : TabsValue.Dataset
    );
  }, [activeTab]);

  return { tabValue, handleTabsChange };
}

export default useConnect;
