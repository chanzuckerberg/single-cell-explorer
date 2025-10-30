import React, { FormEvent, useState } from "react";
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
  AnchorButton,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import actions from "actions";
import { getDiscreteCellEmbeddingRowIndex } from "util/stateManager/viewStackHelpers";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { AppDispatch, RootState } from "reducers";
import { LAYOUT_CHOICE_TEST_ID } from "util/constants";
import { Schema } from "common/types/schema";
import { AnnoMatrixObsCrossfilter } from "annoMatrix";
import { shouldShowOpenseadragon } from "common/selectors";
import { sidePanelAttributeNameChange } from "../../../components/Graph/util";
import * as globals from "~/globals";
import { ImageToggleWrapper, ImageDropdownButton } from "./style";
import Opacities from "./components/Opacities/Opacities";
import {
  thunkTrackColorByCategoryChangeEmbedding,
  thunkTrackColorByHistogramChangeEmbedding,
  thunkTrackLassoChangeEmbedding,
} from "./analytics";
import ChromatinViewerButton from "./components/ChromatinViewerButton/ChromatinViewerButton";

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
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  unsMetadata: RootState["controls"]["unsMetadata"];
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
  unsMetadata: state.controls.unsMetadata,
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

        <ChromatinViewerButton isSidePanel={isSidePanel} />

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

// Helper function to close all children when expanding a node
const closeAllChildren = (node: string, tree: any, expanded: any) => {
  const children = tree[node]?.children;
  if (children) {
    expanded[node] = false;
    for (const child of children) {
      closeAllChildren(child, tree, expanded);
    }
  }
};

// Recursively render the indented embedding tree
const IndentedEmbeddingTree = (
  node: string,
  roots: string[],
  tree: any,
  padding: number,
  els: JSX.Element[],
  currView: string,
  isEmbeddingExpanded: any,
  handleEmbeddingExpansionChange: (e: any, node: string, val: boolean, tree: any) => void,
  initEmbeddings: string[]
) => {
  const children = tree[node]?.children;
  const isExpanded = isEmbeddingExpanded?.[node] ?? tree[node]?.expandedByDefault ?? false;
  const isVisible = isEmbeddingExpanded?.[tree[node]?.parent] ?? tree[tree[node]?.parent]?.expandedByDefault ?? true;

  if (isVisible) {
    els.push(
      <Radio
        label={`${node.split(';;').at(-1)}: ${tree[node]?.sizeHint || '0 cells'}`}
        value={node}
        key={node}
        style={{
          display: "flex",
          verticalAlign: "middle",
          paddingLeft: `${padding + 26}px`
        }}
        children={
          <div style={{
            paddingLeft: "5px",
          }}>
            {children && !(tree[node]?.disable ?? false) ? 
              <AnchorButton
                icon={isExpanded ? "chevron-down" : "chevron-right"}
                data-testid={`${node}:expand-embeddings`}
                onClick={(e) => handleEmbeddingExpansionChange(e, node, isExpanded, tree)}
                minimal
                style={{
                  cursor: "pointer",
                  marginLeft: "auto",
                  marginTop: "-5px"
                }}                    
              /> : null}
          </div> 
        }
      />
    );
  }

  if (children && isExpanded) {
    for (const child of children) {
      IndentedEmbeddingTree(
        child,
        roots,
        tree,
        padding + 26,
        els,
        currView,
        isEmbeddingExpanded,
        handleEmbeddingExpansionChange,
        initEmbeddings
      );
    }
  }
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
  const [isEmbeddingExpanded, setIsEmbeddingExpanded] = useState<Record<string, boolean>>({});
  const [renderedEmbeddingTree, setRenderedEmbeddingTree] = useState<JSX.Element | null>(null);

  const { data, error, isPending } = useAsync({
    promiseFn: loadAllEmbeddingCounts,
    annoMatrix,
    available,
  });

  const handleEmbeddingExpansionChange = (e: any, node: string, val: boolean, tree: any) => {
    const newExpanded = { ...isEmbeddingExpanded };
    if (val) {
      closeAllChildren(node, tree, newExpanded);
      setIsEmbeddingExpanded(newExpanded);
    } else {
      setIsEmbeddingExpanded({ ...newExpanded, [node]: true });
    }
    if (e) {
      e.preventDefault();
    }
  };

  React.useEffect(() => {
    if (data) {
      console.log(`EmbeddingChoices: Building tree with data:`, data);
      const name = layoutChoice.current;
      console.log(`Current embedding: ${name}`);
      
      let parentName: string;
      if (name.includes(";;")) {
        parentName = name.replace(`;;${name.split(";;").at(-1)}`, "");
      } else {
        parentName = "";
      }
      console.log(`Parent name: ${parentName}`);

      const embeddingTree: any = {};
      data.forEach((summary: any) => {
        const { discreteCellIndex, embeddingName: queryName } = summary;
        console.log(`Processing embedding: ${queryName}`);
        
        let queryParent: string;
        if (queryName.includes(";;")) {
          queryParent = queryName.replace(`;;${queryName.split(";;").at(-1)}`, "");
        } else {
          queryParent = "";
        }
        console.log(`Query parent: ${queryParent}`);

        const sizeHint = `${discreteCellIndex.size()} cells`;
        
        // Add queryName to children of queryParent
        if (embeddingTree?.[queryParent]?.children) {
          embeddingTree[queryParent].children.push(queryName);
        } else if (embeddingTree?.[queryParent]) {
          embeddingTree[queryParent] = { ...embeddingTree[queryParent], children: [queryName] };
        } else {
          embeddingTree[queryParent] = { children: [queryName] };
        }

        const expandedByDefault = (queryParent === "" || queryName === name);

        if (embeddingTree?.[queryName]) {
          embeddingTree[queryName] = { 
            ...embeddingTree[queryName], 
            sizeHint: sizeHint, 
            expandedByDefault: expandedByDefault, 
            parent: queryParent 
          };
        } else {
          embeddingTree[queryName] = { 
            sizeHint: sizeHint, 
            expandedByDefault: expandedByDefault, 
            parent: queryParent 
          };
        }
      });
      
      console.log(`Built embedding tree:`, embeddingTree);

      const els: JSX.Element[] = [];
      let iterable: string[];
      let roots: string[] | undefined;

      if (parentName === "") {
        iterable = embeddingTree[""]?.children || [];
      } else {
        let currNode = parentName;
        let iterate = true;
        roots = [currNode];
        embeddingTree[currNode].expandedByDefault = true;
        embeddingTree[currNode].disable = true;
        while (iterate) {
          if (embeddingTree[currNode].parent === "") {
            iterate = false;
          } else {
            currNode = embeddingTree[currNode].parent;
            embeddingTree[currNode].expandedByDefault = true;
            embeddingTree[currNode].disable = true;
            roots.push(currNode);
          }
        }
        iterable = [currNode];
      }

      for (const c of iterable) {
        IndentedEmbeddingTree(
          c,
          roots ?? iterable.filter((item) => item !== c),
          embeddingTree,
          0,
          els,
          name,
          isEmbeddingExpanded,
          handleEmbeddingExpansionChange,
          [] // initEmbeddings - empty for now
        );
      }

      setRenderedEmbeddingTree(
        <RadioGroup onChange={onChange} selectedValue={layoutChoice.current}>
          {els}
        </RadioGroup>
      );
    }
  }, [data, layoutChoice, isEmbeddingExpanded, onChange]);

  if (error) {
    console.error(error);
  }
  if (error || isPending) {
    return (
      <RadioGroup onChange={onChange} selectedValue={layoutChoice.current}>
        {layoutChoice.available.map((name) => (
          <Radio label={`${name}`} value={name} key={name} />
        ))}
      </RadioGroup>
    );
  }
  if (data) {
    return renderedEmbeddingTree;
  }
  return null;
};
