import actions from "actions";
import { DiffexpButtonsProps } from "./types";
import {
  DIFFEXP_SLOW_MSG,
  genTipMessageWarn,
  genTipMessage,
} from "./constants";

export function useConnect({
  dispatch,
  differential,
  diffexpMayBeSlow,
  diffexpCellcountMax,
}: DiffexpButtonsProps) {
  function computeDiffExp() {
    if (differential.celllist1 && differential.celllist2) {
      dispatch(
        actions.requestDifferentialExpression(
          differential.celllist1,
          differential.celllist2
        )
      ).catch((error) => {
        console.error("Failed to request differential expression:", error);
      });
    }
  }

  const haveBothCellSets = !!differential.celllist1 && !!differential.celllist2;
  const haveEitherCellSet =
    !!differential.celllist1 || !!differential.celllist2;
  const slowMsg = diffexpMayBeSlow ? DIFFEXP_SLOW_MSG : "";
  const tipMessage = genTipMessage(slowMsg);
  const tipMessageWarn = genTipMessageWarn(diffexpCellcountMax);
  const warnMaxSizeExceeded =
    haveEitherCellSet &&
    !!diffexpCellcountMax &&
    (differential.celllist1?.length ?? 0) +
      (differential.celllist2?.length ?? 0) >
      diffexpCellcountMax;

  return {
    computeDiffExp,
    haveBothCellSets,
    warnMaxSizeExceeded,
    tipMessage,
    tipMessageWarn,
  };
}
