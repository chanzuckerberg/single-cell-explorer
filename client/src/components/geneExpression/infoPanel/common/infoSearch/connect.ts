import fuzzysort from "fuzzysort";

import actions from "../../../../../actions";
import { Item } from "./types";
import { AppDispatch } from "../../../../../reducers";

export default function useConnect({
  infoType,
  dispatch,
}: {
  infoType: string;
  dispatch: AppDispatch;
}) {
  const filterItems = (query: string, items: string[]) =>
    fuzzysort.go(query, items, {
      limit: 5,
      threshold: -10000,
    });

  const handleClick = (g: Item) => {
    if (!g) return;

    const item = typeof g === "string" ? g : g.target;

    if (infoType === "Gene") {
      handleGeneClick(item).catch((e) =>
        dispatch({ type: "gene info error", error: e })
      );
    } else {
      handleCellTypeClick(item).catch((e) =>
        dispatch({ type: "cell info error", error: e })
      );
    }
  };

  const handleGeneClick = async (gene: string) => {
    dispatch({ type: "request gene info start", gene });
    const info = await actions.fetchGeneInfo(gene, "", dispatch);

    if (!info) {
      return;
    }

    dispatch({
      type: "open gene info",
      gene,
      info,
    });
  };

  const handleCellTypeClick = async (cellName: string) => {
    dispatch({ type: "request cell info start", cellName });
    const info = await actions.fetchCellTypeInfo(cellName, dispatch);
    if (!info) {
      return;
    }

    dispatch({
      type: "open cell info",
      cellInfo: info,
    });
  };
  return { handleClick, filterItems };
}
