import React, { FormEvent } from "react";
import { connect } from "react-redux";
import { useAsync } from "react-async";
import {
  Button,
  ButtonGroup,
  H4,
  Position,
  Radio,
  RadioGroup,
  Tooltip,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { Popover2 } from "@blueprintjs/popover2";
import * as globals from "../../globals";
import actions from "../../actions";
import { getDiscreteCellEmbeddingRowIndex } from "../../util/stateManager/viewStackHelpers";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { AppDispatch, RootState } from "../../reducers";
import { Schema } from "../../common/types/schema";
import { AnnoMatrixObsCrossfilter } from "../../annoMatrix";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";

interface StateProps {
  layoutChoice: RootState["layoutChoice"];
  schema?: Schema;
  crossfilter: RootState["obsCrossfilter"];
  imageUnderlay: RootState["controls"]["imageUnderlay"];
  sideIsOpen: RootState["panelEmbedding"]["open"];
}

interface OwnProps {
  isSidePanel: boolean;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

type Props = StateProps & DispatchProps & OwnProps;

const mapStateToProps = (state: RootState, props: OwnProps): StateProps => ({
  layoutChoice: props.isSidePanel
    ? state.panelEmbedding.layoutChoice
    : state.layoutChoice,
  schema: state.annoMatrix?.schema,
  crossfilter: state.obsCrossfilter,
  imageUnderlay: state.controls.imageUnderlay,
  sideIsOpen: state.panelEmbedding.open,
});

const Embedding = (props: Props) => {
  const {
    layoutChoice,
    schema,
    crossfilter,
    dispatch,
    imageUnderlay,
    isSidePanel,
    sideIsOpen,
  } = props;
  const { annoMatrix } = crossfilter || {};
  if (!crossfilter || !annoMatrix) return null;

  const isSpatial = getFeatureFlag(FEATURES.SPATIAL);

  const handleLayoutChoiceClick = (): void => {
    track(EVENTS.EXPLORER_LAYOUT_CHOICE_BUTTON_CLICKED);
  };

  const handleLayoutChoiceChange = async (
    e: FormEvent<HTMLInputElement>
  ): Promise<void> => {
    track(EVENTS.EXPLORER_LAYOUT_CHOICE_CHANGE_ITEM_CLICKED);

    await dispatch(
      actions.layoutChoiceAction(e.currentTarget.value, isSidePanel)
    );
    if (
      imageUnderlay &&
      !isSidePanel &&
      !e.currentTarget.value.includes(globals.spatialEmbeddingKeyword)
    ) {
      dispatch({
        type: "toggle image underlay",
        toggle: false,
      });
    }
  };

  const handleOpenPanelEmbedding = async (): Promise<void> => {
    dispatch({
      type: "toggle panel embedding",
    });
  };

  return (
    <div
      style={{
        zIndex: 9999,
      }}
    >
      <ButtonGroup>
        <Popover2
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
                onChange={handleLayoutChoiceChange}
                annoMatrix={annoMatrix}
                layoutChoice={layoutChoice}
              />
            </div>
          }
        >
          <Tooltip
            content="Select embedding for visualization"
            position="top"
            hoverOpenDelay={globals.tooltipHoverOpenDelay}
          >
            <Button
              type="button"
              data-testid="layout-choice"
              id="embedding"
              style={{
                cursor: "pointer",
              }}
              icon={IconNames.GRAPH}
              rightIcon={IconNames.CARET_DOWN}
              onClick={handleLayoutChoiceClick}
            >
              {layoutChoice?.current}
            </Button>
          </Tooltip>
        </Popover2>
        {!isSidePanel && isSpatial && (
          <Button
            icon={IconNames.MULTI_SELECT}
            onClick={handleOpenPanelEmbedding}
            active={sideIsOpen}
          />
        )}
      </ButtonGroup>

      {!isSidePanel && (
        <span
          style={{
            color: "#767676",
            fontWeight: 400,
            marginTop: "8px",
            position: "absolute",
            top: "38px",
            left: "64px",
          }}
        >
          {crossfilter.countSelected()} of {crossfilter.size()} cells
        </span>
      )}
    </div>
  );
};

export default connect(mapStateToProps)(Embedding);

const loadAllEmbeddingCounts = async ({ annoMatrix, available }: any) => {
  const embeddings = await Promise.all(
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

interface EmbeddingChoiceProps {
  onChange: (e: FormEvent<HTMLInputElement>) => Promise<void>;
  annoMatrix: AnnoMatrixObsCrossfilter["annoMatrix"];
  layoutChoice: Props["layoutChoice"];
}

const EmbeddingChoices = ({
  onChange,
  annoMatrix,
  layoutChoice,
}: EmbeddingChoiceProps) => {
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
        {layoutChoice.available.map((name) => (
          <Radio label={`${name}`} value={name} key={name} />
        ))}
      </RadioGroup>
    );
  }
  if (data) {
    return (
      <RadioGroup onChange={onChange} selectedValue={layoutChoice.current}>
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
