import React from "react";
import { connect } from "react-redux";
import { useAsync } from "react-async";
import {
  Button,
  ButtonGroup,
  H4,
  Popover,
  Position,
  Radio,
  RadioGroup,
  Tooltip,
} from "@blueprintjs/core";
import * as globals from "../../globals";
import actions from "../../actions";
import { getDiscreteCellEmbeddingRowIndex } from "../../util/stateManager/viewStackHelpers";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type EmbeddingState = any;

const heatmapIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.3333 13C14.3333 13.7364 13.7364 14.3333 13 14.3333C12.2636 14.3333 11.6667 13.7364 11.6667 13C11.6667 12.2636 12.2636 11.6667 13 11.6667C13.7364 11.6667 14.3333 12.2636 14.3333 13Z"
      fill="#767676"
    />
    <path
      d="M8 9.33333C8 10.0697 7.40305 10.6667 6.66667 10.6667C5.93029 10.6667 5.33333 10.0697 5.33333 9.33333C5.33333 8.59695 5.93029 8 6.66667 8C7.40305 8 8 8.59695 8 9.33333Z"
      fill="#767676"
    />
    <path
      d="M10.6667 12C10.6667 11.2636 10.0697 10.6667 9.33333 10.6667C8.59695 10.6667 8 11.2636 8 12C8 12.7364 8.59695 13.3333 9.33333 13.3333C10.0697 13.3333 10.6667 12.7364 10.6667 12Z"
      fill="#767676"
    />
    <path
      d="M12 14.6667C12 13.9303 11.403 13.3333 10.6667 13.3333C9.93029 13.3333 9.33333 13.9303 9.33333 14.6667C9.33333 15.403 9.93029 16 10.6667 16C11.403 16 12 15.403 12 14.6667Z"
      fill="#767676"
    />
    <path
      d="M10.6667 8C10.6667 7.26362 10.0697 6.66667 9.33333 6.66667C8.59695 6.66667 8 7.26362 8 8C8 8.73638 8.59695 9.33333 9.33333 9.33333C10.0697 9.33333 10.6667 8.73638 10.6667 8Z"
      fill="#767676"
    />
    <path
      d="M13.3333 9.33333C13.3333 8.59695 12.7364 8 12 8C11.2636 8 10.6667 8.59695 10.6667 9.33333C10.6667 10.0697 11.2636 10.6667 12 10.6667C12.7364 10.6667 13.3333 10.0697 13.3333 9.33333Z"
      fill="#767676"
    />
    <path
      d="M16 9.33333C16 8.59695 15.403 8 14.6667 8C13.9303 8 13.3333 8.59695 13.3333 9.33333C13.3333 10.0697 13.9303 10.6667 14.6667 10.6667C15.403 10.6667 16 10.0697 16 9.33333Z"
      fill="#767676"
    />
    <path
      d="M8 10.6667C8 9.93029 7.40305 9.33333 6.66667 9.33333C5.93029 9.33333 5.33333 9.93029 5.33333 10.6667C5.33333 11.403 5.93029 12 6.66667 12C7.40305 12 8 11.403 8 10.6667Z"
      fill="#767676"
    />
    <path
      d="M14.6667 10.6667C14.6667 9.93029 14.0697 9.33333 13.3333 9.33333C12.597 9.33333 12 9.93029 12 10.6667C12 11.403 12.597 12 13.3333 12C14.0697 12 14.6667 11.403 14.6667 10.6667Z"
      fill="#767676"
    />
    <path
      d="M13.3333 6.66667C13.3333 7.40305 12.7364 8 12 8C11.2636 8 10.6667 7.40305 10.6667 6.66667C10.6667 5.93029 11.2636 5.33333 12 5.33333C12.7364 5.33333 13.3333 5.93029 13.3333 6.66667Z"
      fill="#767676"
    />
    <path
      d="M10.6667 2.66667C10.6667 3.40305 10.0697 4 9.33333 4C8.59695 4 8 3.40305 8 2.66667C8 1.93029 8.59695 1.33333 9.33333 1.33333C10.0697 1.33333 10.6667 1.93029 10.6667 2.66667Z"
      fill="#767676"
    />
    <path
      d="M9.33333 6.66667C9.33333 7.40305 8.73638 8 8 8C7.26362 8 6.66667 7.40305 6.66667 6.66667C6.66667 5.93029 7.26362 5.33333 8 5.33333C8.73638 5.33333 9.33333 5.93029 9.33333 6.66667Z"
      fill="#767676"
    />
    <path
      d="M2.66667 8C2.66667 8.73638 2.06971 9.33333 1.33333 9.33333C0.596954 9.33333 0 8.73638 0 8C0 7.26362 0.596954 6.66667 1.33333 6.66667C2.06971 6.66667 2.66667 7.26362 2.66667 8Z"
      fill="#767676"
    />
    <path
      d="M6.66667 5.33333C6.66667 6.06971 6.06971 6.66667 5.33333 6.66667C4.59695 6.66667 4 6.06971 4 5.33333C4 4.59695 4.59695 4 5.33333 4C6.06971 4 6.66667 4.59695 6.66667 5.33333Z"
      fill="#767676"
    />
    <path
      d="M10.6667 4C10.6667 4.73638 10.0697 5.33333 9.33333 5.33333C8.59695 5.33333 8 4.73638 8 4C8 3.26362 8.59695 2.66667 9.33333 2.66667C10.0697 2.66667 10.6667 3.26362 10.6667 4Z"
      fill="#767676"
    />
    <path
      d="M12 6.66667C12 7.40305 11.403 8 10.6667 8C9.93029 8 9.33333 7.40305 9.33333 6.66667C9.33333 5.93029 9.93029 5.33333 10.6667 5.33333C11.403 5.33333 12 5.93029 12 6.66667Z"
      fill="#767676"
    />
    <path
      d="M3.66667 7C3.66667 7.73638 3.06971 8.33333 2.33333 8.33333C1.59695 8.33333 1 7.73638 1 7C1 6.26362 1.59695 5.66667 2.33333 5.66667C3.06971 5.66667 3.66667 6.26362 3.66667 7Z"
      fill="#767676"
    />
    <path
      d="M6.66667 2.66667C6.66667 3.40305 6.06971 4 5.33333 4C4.59695 4 4 3.40305 4 2.66667C4 1.93029 4.59695 1.33333 5.33333 1.33333C6.06971 1.33333 6.66667 1.93029 6.66667 2.66667Z"
      fill="#767676"
    />
    <path
      d="M12 2.66667C12 3.40305 11.403 4 10.6667 4C9.93029 4 9.33333 3.40305 9.33333 2.66667C9.33333 1.93029 9.93029 1.33333 10.6667 1.33333C11.403 1.33333 12 1.93029 12 2.66667Z"
      fill="#767676"
    />
    <path
      d="M14.6667 4C14.6667 4.73638 14.0697 5.33333 13.3333 5.33333C12.597 5.33333 12 4.73638 12 4C12 3.26362 12.597 2.66667 13.3333 2.66667C14.0697 2.66667 14.6667 3.26362 14.6667 4Z"
      fill="#767676"
    />
    <path
      d="M5.33333 1.33333C5.33333 2.06971 4.73638 2.66667 4 2.66667C3.26362 2.66667 2.66667 2.06971 2.66667 1.33333C2.66667 0.596954 3.26362 0 4 0C4.73638 0 5.33333 0.596954 5.33333 1.33333Z"
      fill="#767676"
    />
    <path
      d="M12 10.6667C12 11.403 11.403 12 10.6667 12C9.93029 12 9.33333 11.403 9.33333 10.6667C9.33333 9.93029 9.93029 9.33333 10.6667 9.33333C11.403 9.33333 12 9.93029 12 10.6667Z"
      fill="#767676"
    />
    <path
      d="M4 12C4 12.7364 3.40305 13.3333 2.66667 13.3333C1.93029 13.3333 1.33333 12.7364 1.33333 12C1.33333 11.2636 1.93029 10.6667 2.66667 10.6667C3.40305 10.6667 4 11.2636 4 12Z"
      fill="#767676"
    />
    <path
      d="M6.66667 13.3333C6.66667 14.0697 6.06971 14.6667 5.33333 14.6667C4.59695 14.6667 4 14.0697 4 13.3333C4 12.597 4.59695 12 5.33333 12C6.06971 12 6.66667 12.597 6.66667 13.3333Z"
      fill="#767676"
    />
    <path
      d="M5.33333 10.6667C5.33333 11.403 4.73638 12 4 12C3.26362 12 2.66667 11.403 2.66667 10.6667C2.66667 9.93029 3.26362 9.33333 4 9.33333C4.73638 9.33333 5.33333 9.93029 5.33333 10.6667Z"
      fill="#767676"
    />
    <path
      d="M8 4C8 4.73638 7.40305 5.33333 6.66667 5.33333C5.93029 5.33333 5.33333 4.73638 5.33333 4C5.33333 3.26362 5.93029 2.66667 6.66667 2.66667C7.40305 2.66667 8 3.26362 8 4Z"
      fill="#767676"
    />
  </svg>
);

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  layoutChoice: (state as any).layoutChoice,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  schema: (state as any).annoMatrix?.schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  crossfilter: (state as any).obsCrossfilter,
}))
// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class Embedding extends React.PureComponent<{}, EmbeddingState> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
  constructor(props: {}) {
    super(props);
    this.state = {};
  }

  handleLayoutChoiceClick = (): void => {
    track(EVENTS.EXPLORER_LAYOUT_CHOICE_BUTTON_CLICKED);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleLayoutChoiceChange = (e: any) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch } = this.props;

    track(EVENTS.EXPLORER_LAYOUT_CHOICE_CHANGE_ITEM_CLICKED);

    dispatch(actions.layoutChoiceAction(e.currentTarget.value));
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'layoutChoice' does not exist on type 'Re... Remove this comment to see the full error message
    const { layoutChoice, schema, crossfilter } = this.props;
    const { annoMatrix } = crossfilter;

    return (
      <ButtonGroup
        style={{
          paddingTop: 8,
          zIndex: 9999,
        }}
      >
        <Popover
          target={
            <Tooltip
              content="Select embedding for visualization"
              position="top"
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
            >
              <Button
                type="button"
                data-testid="layout-choice"
                icon={heatmapIcon}
                // minimal
                id="embedding"
                style={{
                  cursor: "pointer",
                }}
                onClick={this.handleLayoutChoiceClick}
              >
                {layoutChoice?.current}: {crossfilter.countSelected()} out of{" "}
                {crossfilter.size()} cells
              </Button>
            </Tooltip>
          }
          // minimal /* removes arrow */
          position={Position.TOP_LEFT}
          content={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-start",
                flexDirection: "column",
                padding: 10,
                width: 400,
              }}
            >
              <H4>Embedding Choice</H4>
              <p style={{ fontStyle: "italic" }}>
                There are {schema?.dataframe?.nObs} cells in the entire dataset.
              </p>
              <EmbeddingChoices
                onChange={this.handleLayoutChoiceChange}
                annoMatrix={annoMatrix}
                layoutChoice={layoutChoice}
              />
            </div>
          }
        />
      </ButtonGroup>
    );
  }
}

export default Embedding;

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const loadAllEmbeddingCounts = async ({ annoMatrix, available }: any) => {
  const embeddings = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    available.map((name: any) => annoMatrix.base().fetch("emb", name))
  );
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
  return available.map((name, idx) => ({
    embeddingName: name,
    embedding: embeddings[idx],
    discreteCellIndex: getDiscreteCellEmbeddingRowIndex(embeddings[idx]),
  }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const EmbeddingChoices = ({ onChange, annoMatrix, layoutChoice }: any) => {
  const { available } = layoutChoice;
  const { data, error, isPending } = useAsync({
    promiseFn: loadAllEmbeddingCounts,
    annoMatrix,
    available,
  });

  if (error) {
    /* log, as this is unexpected */
    console.error(error);
  }
  if (error || isPending) {
    /* still loading, or errored out - just omit counts (TODO: spinner?) */
    return (
      <RadioGroup onChange={onChange} selectedValue={layoutChoice.current}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS. */}
        {layoutChoice.available.map((name: any) => (
          <Radio label={`${name}`} value={name} key={name} />
        ))}
      </RadioGroup>
    );
  }
  if (data) {
    return (
      <RadioGroup onChange={onChange} selectedValue={layoutChoice.current}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS. */}
        {data.map((summary: any) => {
          const { discreteCellIndex, embeddingName } = summary;
          const sizeHint = `${discreteCellIndex.size()} cells`;
          return (
            <Radio
              label={`${embeddingName}: ${sizeHint}`}
              value={embeddingName}
              key={embeddingName}
            />
          );
        })}
      </RadioGroup>
    );
  }
  return null;
};
