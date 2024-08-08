import React from "react";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "./menubar.css";
import * as globals from "../../globals";

interface SubsetProps {
  subsetPossible: boolean;
  subsetResetPossible: boolean;
  handleSubset: () => void;
  handleSubsetReset: () => void;
  isVertical: boolean;
}

const Subset = React.memo((props: SubsetProps) => {
  const {
    subsetPossible,
    subsetResetPossible,
    handleSubset,
    handleSubsetReset,
    isVertical,
  } = props;

  return (
    <ButtonGroup className={styles.menubarButton} vertical={isVertical}>
      <Tooltip2
        content="Subset to currently selected cells and associated metadata"
        position="bottom"
        hoverOpenDelay={globals.tooltipHoverOpenDelay}
      >
        <AnchorButton
          type="button"
          data-testid="subset-button"
          disabled={!subsetPossible}
          icon="pie-chart"
          onClick={handleSubset}
        />
      </Tooltip2>
      <Tooltip2
        content="Undo subset and show all cells and associated metadata"
        position="bottom"
        hoverOpenDelay={globals.tooltipHoverOpenDelay}
      >
        <AnchorButton
          type="button"
          data-testid="reset-subset-button"
          disabled={!subsetResetPossible}
          icon="full-circle"
          onClick={handleSubsetReset}
        />
      </Tooltip2>
    </ButtonGroup>
  );
});

export default Subset;
