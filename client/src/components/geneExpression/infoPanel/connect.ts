import { ChangeEvent, useEffect, useState } from "react";
import { AppDispatch } from "../../../reducers";

function useConnect({
  dispatch,
  activeTab,
}: {
  dispatch: AppDispatch;
  activeTab: string;
}) {
  const [value, setValue] = useState(1);

  const handleTabsChange = (
    _: ChangeEvent<Record<string, unknown>>,
    tabsValue: unknown
  ) => {
    setValue(tabsValue as number);
    dispatch({
      type: "toggle active info panel",
      activeTab:
        tabsValue === 0 ? "Gene" : tabsValue === 1 ? "CellType" : "Dataset",
    });
  };

  useEffect(() => {
    setValue(activeTab === "Gene" ? 0 : activeTab === "CellType" ? 1 : 2);
  }, [activeTab]);

  return { value, handleTabsChange };
}

export default useConnect;
