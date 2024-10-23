import React from "react";
import { connect } from "react-redux";
import { ButtonGroup, AnchorButton, Tooltip } from "@blueprintjs/core";
import actions from "actions";
import { AppDispatch, RootState } from "reducers";
import { DifferentialState } from "reducers/differential";

import * as globals from "~/globals";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "../../menubar.css";
import CellSetButton from "./components/CellSetButton/CellSetButton";

export interface DiffexpButtonsProps {
  differential: DifferentialState;
  diffexpMayBeSlow: boolean;
  diffexpCellcountMax: number;
  dispatch: AppDispatch;
}

const mapStateToProps = (state: RootState) => ({
  differential: state.differential,
  diffexpMayBeSlow: state.config?.parameters?.["diffexp-may-be-slow"] ?? false,
  diffexpCellcountMax: state.config?.limits?.diffexp_cellcount_max ?? 0,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch,
});

function DiffexpButtons(props: DiffexpButtonsProps): JSX.Element {
  const computeDiffExp = () => {
    const { dispatch, differential } = props;
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
  };

  const { differential, diffexpMayBeSlow, diffexpCellcountMax } = props;
  const haveBothCellSets = !!differential.celllist1 && !!differential.celllist2;
  const haveEitherCellSet =
    !!differential.celllist1 || !!differential.celllist2;
  const slowMsg = diffexpMayBeSlow
    ? " (CAUTION: large dataset - may take longer or fail)"
    : "";
  const tipMessage = `See top differentially expressed genes${slowMsg}`;
  const tipMessageWarn = `The total number of cells for differential expression computation
                            may not exceed ${diffexpCellcountMax}. Try reselecting new cell sets.`;
  const warnMaxSizeExceeded =
    haveEitherCellSet &&
    !!diffexpCellcountMax &&
    (differential.celllist1?.length ?? 0) +
      (differential.celllist2?.length ?? 0) >
      diffexpCellcountMax;
  return (
    <ButtonGroup className={styles.menubarButton}>
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <CellSetButton eitherCellSetOneOrTwo={1} />
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <CellSetButton eitherCellSetOneOrTwo={2} />
      <Tooltip
        content={warnMaxSizeExceeded ? tipMessageWarn : tipMessage}
        position="bottom"
        hoverOpenDelay={globals.tooltipHoverOpenDelayQuick}
        intent={warnMaxSizeExceeded ? "danger" : "none"}
      >
        <AnchorButton
          disabled={!haveBothCellSets || warnMaxSizeExceeded}
          intent={warnMaxSizeExceeded ? "danger" : "primary"}
          data-testid="diffexp-button"
          loading={differential.loading ?? false}
          icon="left-join"
          fill
          onClick={computeDiffExp}
        />
      </Tooltip>
    </ButtonGroup>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(DiffexpButtons);
