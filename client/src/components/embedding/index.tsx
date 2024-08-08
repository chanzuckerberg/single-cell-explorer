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
  Popover,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import * as globals from "../../globals";
import actions from "../../actions";
import { getDiscreteCellEmbeddingRowIndex } from "../../util/stateManager/viewStackHelpers";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { AppDispatch, RootState } from "../../reducers";
import { LAYOUT_CHOICE_TEST_ID } from "../../util/constants";
import { Schema } from "../../common/types/schema";
import { AnnoMatrixObsCrossfilter } from "../../annoMatrix";
import { sidePanelAttributeNameChange } from "../graph/util";
import { shouldShowOpenseadragon } from "../../common/selectors";
import { ImageToggleWrapper, ImageDropdownButton } from "./style";
import Opacities from "./components/Opacities";
import {
  thunkTrackColorByCategoryChangeEmbedding,
  thunkTrackColorByHistogramChangeEmbedding,
  thunkTrackLassoChangeEmbedding,
} from "./analytics";

interface StateProps {
  layoutChoice: RootState["layoutChoice"];
  schema?: Schema;
  crossfilter: RootState["obsCrossfilter"];
  sideIsOpen: RootState["panelEmbedding"]["open"];
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  config: RootState["config"];
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  panelEmbedding: RootState["panelEmbedding"];
  imageUnderlay: RootState["controls"]["imageUnderlay"];
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
  sideIsOpen: state.panelEmbedding.open,
  config: state.config,
  panelEmbedding: state.panelEmbedding,
  imageUnderlay: state.controls.imageUnderlay,
});

const Embedding = (props: Props) => {
  const {
    layoutChoice,
    schema,
    crossfilter,
    dispatch,
    isSidePanel,
    sideIsOpen,
    imageUnderlay,
  } = props;
  const { annoMatrix } = crossfilter || {};
  if (!crossfilter || !annoMatrix) return null;

  const isSingleEmbedding = layoutChoice.available.length === 1;

  /**
   * (thuang): Attach to `onOpening` event to only track the event when the user
   * clicks on the dropdown to open the popover, not when the popover is closed.
   */
  const handleLayoutChoiceClick = (): void => {
    track(
      isSidePanel
        ? EVENTS.EXPLORER_SBS_SIDE_WINDOW_EMBEDDING_CLICKED
        : EVENTS.EXPLORER_EMBEDDING_CLICKED
    );
  };

  const handleLayoutChoiceChange = async (
    e: FormEvent<HTMLInputElement>
  ): Promise<void> => {
    const {
      currentTarget: { value },
    } = e;

    track(
      isSidePanel
        ? EVENTS.EXPLORER_SBS_SIDE_WINDOW_EMBEDDING_SELECTED
        : EVENTS.EXPLORER_EMBEDDING_SELECTED,
      {
        embedding: value,
      }
    );

    dispatch(thunkTrackColorByCategoryChangeEmbedding());
    dispatch(thunkTrackColorByHistogramChangeEmbedding());

    /**
     * (thuang): Analytics requirement to only track embedding change while the
     * blue lasso selection is active.
     * Thus, this action needs to be dispatched BEFORE the layout choice action,
     * since the layout choice action will reset the selection mode to "all".
     *
     * Example:
     * Steps:
     * 1. Use lasso to select some dots
     * 2. The graph has the blue lasso selection
     * 3. Switch to a different embedding <-- trigger event `EXPLORER_LASSO_CHANGE_EMBEDDING`
     * 4. The blue lasso selection thing disappears (but the lasso’d dots are still in effect)
     * 5. Switch to another different embedding <-- do NOT trigger event `EXPLORER_LASSO_CHANGE_EMBEDDING`
     */
    dispatch(thunkTrackLassoChangeEmbedding());

    await dispatch(actions.layoutChoiceAction(value, isSidePanel));
  };

  const handleOpenPanelEmbedding = async (): Promise<void> => {
    dispatch({
      type: "toggle panel embedding",
    });

    /**
     * (thuang): Product requirement to only track when the side panel goes from
     * closed to open.
     */
    if (!sideIsOpen) {
      track(EVENTS.EXPLORER_SBS_SELECTED, {
        embedding: layoutChoice.current,
      });
    }
  };

  return (
    <div
      style={{
        zIndex: 1,
      }}
    >
      <ButtonGroup>
        <Popover
          hasBackdrop
          onOpening={handleLayoutChoiceClick}
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
              data-testid={sidePanelAttributeNameChange(
                LAYOUT_CHOICE_TEST_ID,
                isSidePanel
              )}
              id="embedding"
              style={{
                cursor: "pointer",
              }}
              icon={IconNames.GRAPH}
              rightIcon={IconNames.CARET_DOWN}
            >
              {layoutChoice?.current}
            </Button>
          </Tooltip>
        </Popover>
        {!isSidePanel && !isSingleEmbedding && (
          <Button
            icon={IconNames.MULTI_SELECT}
            onClick={handleOpenPanelEmbedding}
            active={sideIsOpen}
            data-testid="side-panel-toggle"
          />
        )}

        {!isSidePanel && shouldShowOpenseadragon(props) && (
          <ImageToggleWrapper>
            <ButtonGroup>
              <Tooltip
                usePortal
                content="Toggle image"
                position="bottom"
                hoverOpenDelay={globals.tooltipHoverOpenDelay}
              >
                <Button
                  type="button"
                  data-testid="toggle-image-underlay"
                  icon="media"
                  intent={imageUnderlay ? "primary" : "none"}
                  active={imageUnderlay}
                  onClick={() => {
                    track(
                      /**
                       * (thuang): If `imageUnderlay` is currently `true`, then
                       * we're about to deselect it thus firing the deselection event.
                       */
                      imageUnderlay
                        ? EVENTS.EXPLORER_IMAGE_DESELECT
                        : EVENTS.EXPLORER_IMAGE_SELECT
                    );
                    dispatch({
                      type: "toggle image underlay",
                      toggle: !imageUnderlay,
                    });
                  }}
                />
              </Tooltip>
              <Popover
                hasBackdrop
                onOpening={handleLayoutChoiceClick}
                position={Position.BOTTOM_LEFT}
                content={<Opacities />}
              >
                <ImageDropdownButton
                  type="button"
                  data-testid="image-underlay-dropdown"
                  icon="caret-down"
                />
              </Popover>
            </ButtonGroup>
          </ImageToggleWrapper>
        )}
      </ButtonGroup>

      {!isSidePanel && (
        <span
          style={{
            color: "#767676",
            fontWeight: 400,
            marginTop: "8px",
            /**
             * (thuang): This needs to be taken out of the normal flow to prevent
             * expanding the parent container height and distorting the action button icon sizes
             */
            position: "absolute",
            top: "35px",
            left: "0",
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
