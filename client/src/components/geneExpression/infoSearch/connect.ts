import fuzzysort from "fuzzysort";
import { useDispatch } from "react-redux";

import actions from "../../../actions";
import { Item } from "./types";

export default function useConnect({ infoType }: { infoType: string }) {
  const dispatch = useDispatch();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  const filterItems = (query: any, items: any) =>
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
      url: info?.ncbi_url,
      name: info?.name,
      synonyms: info.synonyms,
      summary: info.summary,
      infoError: null,
      showWarningBanner: info.show_warning_banner,
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
