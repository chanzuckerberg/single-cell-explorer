import React from "react";
import { AnchorButton, Tooltip } from "@blueprintjs/core";
import { connect } from "react-redux";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { tooltipHoverOpenDelay } from "~/globals";
import {
  CellSetButtonProps,
  mapDispatchToProps,
  mapStateToProps,
} from "./types";
import { useConnect } from "./connect";

function CellSetButton(props: CellSetButtonProps) {
  const { set, cellsSelected } = useConnect(props);
  const { eitherCellSetOneOrTwo } = props;

  return (
    <Tooltip
      content="Save current selection for differential expression computation"
      position="bottom"
      hoverOpenDelay={tooltipHoverOpenDelay}
    >
      <AnchorButton
        type="button"
        onClick={() => {
          track(EVENTS.EXPLORER_CELLSET_BUTTON_CLICKED);

          set();
        }}
        data-testid={`cellset-button-${eitherCellSetOneOrTwo}`}
      >
        <span data-testid={`cellset-count-${eitherCellSetOneOrTwo}`}>
          {cellsSelected}
        </span>
        {" cells"}
      </AnchorButton>
    </Tooltip>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(CellSetButton);
