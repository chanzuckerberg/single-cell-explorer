import React from "react";
import {
  Button,
  ButtonGroup,
  Icon,
  Intent,
  NumericInput,
  Position,
  Popover,
  Tooltip,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { tooltipHoverOpenDelay } from "../../../globals";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "../menubar.css";
import { ClipProps } from "./types";

function Clip(props: ClipProps) {
  const {
    pendingClipPercentiles,
    clipPercentileMin,
    clipPercentileMax,
    handleClipOpening,
    handleClipClosing,
    handleClipCommit,
    isClipDisabled,
    handleClipOnKeyPress,
    handleClipPercentileMaxValueChange,
    handleClipPercentileMinValueChange,
  } = props;

  const clipMin =
    pendingClipPercentiles?.clipPercentileMin ?? clipPercentileMin;
  const clipMax =
    pendingClipPercentiles?.clipPercentileMax ?? clipPercentileMax;
  const intent =
    clipPercentileMin > 0 || clipPercentileMax < 100
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
        (Intent as any).INTENT_WARNING
      : Intent.NONE;

  return (
    <ButtonGroup className={`${styles.menubarButton}`}>
      <Popover
        renderTarget={({
          ref: tooltipRef,
          isOpen: _tooltipIsOpen,
          ...tooltipProps
        }) => (
          <Tooltip
            content="Clip all continuous values to a percentile range"
            position="bottom"
            hoverOpenDelay={tooltipHoverOpenDelay}
          >
            <Button
              type="button"
              data-testid="visualization-settings"
              intent={intent}
              icon={IconNames.TIMELINE_BAR_CHART}
              style={{
                cursor: "pointer",
              }}
              ref={tooltipRef}
              {...tooltipProps}
            />
          </Tooltip>
        )}
        position={Position.BOTTOM_RIGHT}
        onOpening={handleClipOpening}
        onClosing={handleClipClosing}
        content={
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              flexDirection: "column",
              padding: 10,
            }}
          >
            <div>Clip all continuous values to percentile range</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 5,
                paddingBottom: 5,
              }}
            >
              <NumericInput
                style={{ width: 50 }}
                data-testid="clip-min-input"
                onValueChange={handleClipPercentileMinValueChange}
                onKeyUp={(event: React.KeyboardEvent) =>
                  handleClipOnKeyPress(event as unknown as KeyboardEvent)
                }
                value={clipMin}
                min={0}
                max={100}
                fill={false}
                minorStepSize={null}
                rightElement={
                  <div style={{ padding: "4px 2px" }}>
                    <Icon icon="percentage" intent="primary" size={14} />
                  </div>
                }
              />
              <span style={{ marginRight: 5, marginLeft: 5 }}> - </span>
              <NumericInput
                style={{ width: 50 }}
                data-testid="clip-max-input"
                onValueChange={handleClipPercentileMaxValueChange}
                onKeyUp={(event: React.KeyboardEvent) =>
                  handleClipOnKeyPress(event as unknown as KeyboardEvent)
                }
                value={clipMax}
                min={0}
                max={100}
                fill={false}
                minorStepSize={null}
                rightElement={
                  <div style={{ padding: "4px 2px" }}>
                    <Icon icon="percentage" intent="primary" size={14} />
                  </div>
                }
              />
              <Button
                type="button"
                data-testid="clip-commit"
                intent="primary"
                disabled={isClipDisabled()}
                style={{
                  cursor: "pointer",
                  marginRight: 5,
                  marginLeft: 5,
                }}
                onClick={handleClipCommit}
              >
                Clip
              </Button>
            </div>
          </div>
        }
      />
    </ButtonGroup>
  );
}

export default React.memo(Clip);
