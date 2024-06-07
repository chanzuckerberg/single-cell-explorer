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
import { RootState } from "../../reducers";
import { LAYOUT_CHOICE_TEST_ID } from "../../util/constants";

type Props = RootState;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState) => ({
  layoutChoice: state.layoutChoice,
  schema: state.annoMatrix?.schema,
  crossfilter: state.obsCrossfilter,
  imageUnderlay: state.imageUnderlay,
}))
class Embedding extends React.PureComponent<Props> {
  handleLayoutChoiceClick = (): void => {
    track(EVENTS.EXPLORER_LAYOUT_CHOICE_BUTTON_CLICKED);
  };

  handleLayoutChoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { dispatch, imageUnderlay } = this.props;

    track(EVENTS.EXPLORER_LAYOUT_CHOICE_CHANGE_ITEM_CLICKED);

    dispatch(actions.layoutChoiceAction(e.currentTarget.value));
    if (
      imageUnderlay &&
      !e.target.value.includes(globals.spatialEmbeddingKeyword)
    ) {
      dispatch({
        type: "toggle image underlay",
        toggle: false,
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    const { layoutChoice, schema, crossfilter } = this.props;
    const { annoMatrix } = crossfilter || {};

    if (!crossfilter) return null;

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
                data-testid={LAYOUT_CHOICE_TEST_ID}
                id="embedding"
                style={{
                  cursor: "pointer",
                }}
                onClick={this.handleLayoutChoiceClick}
              >
                {layoutChoice?.current}: {crossfilter.countSelected()} of{" "}
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
    available.map((name: any) =>
      annoMatrix.base().fetch("emb", name, globals.numBinsEmb)
    )
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
              label={
                (
                  <span
                    data-testid={`${LAYOUT_CHOICE_TEST_ID}-label-${embeddingName}`}
                  >
                    {embeddingName}: {sizeHint}
                  </span>
                ) as unknown as string // (thuang): `label` does accept React.Node, but the BlueprintJS type is incorrect
              }
              data-testid={`${LAYOUT_CHOICE_TEST_ID}-radio-${embeddingName}`}
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
