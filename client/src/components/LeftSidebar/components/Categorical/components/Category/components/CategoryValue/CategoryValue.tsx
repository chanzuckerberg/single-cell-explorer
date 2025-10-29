import { connect } from "react-redux";
import React from "react";
import * as d3 from "d3";
import {
  Checkbox,
  Button,
  Icon,
  Menu,
  MenuItem,
  Popover,
  PopoverInteractionKind,
  Position,
  Intent,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import Truncate from "common/components/Truncate/Truncate";
import { AnnotationsHelpers } from "util/stateManager";
import actions from "actions";
import { Dataframe, ContinuousHistogram } from "util/dataframe";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { RootState, AppDispatch } from "reducers";
import { Schema, Category } from "common/types/schema";
import { CategorySummary } from "util/stateManager/controlsHelpers";
import { ColorTable } from "util/stateManager/colorHelpers";
import { ActiveTab } from "common/types/entities";
import { InfoButton, InfoButtonWrapper } from "common/style";
import { useCellTypeSuggestions } from "common/hooks/useCellTypeSuggestions";
import type { AnnoMatrixObsCrossfilter } from "annoMatrix";
import MiniStackedBar from "./components/MiniStackedBar/MiniStackedBar";
import MiniHistogram from "./components/MiniHistogram/MiniHistogram";
import { labelPrompt, isLabelErroneous } from "./labelUtil";
import { AnnoDialog } from "../../../../../../../AnnoDialog/AnnoDialog";
import { LabelInputWithSuggestions } from "../../../../../../../LabelInput/LabelInputWithSuggestions";
import { CategoryCrossfilterContext } from "../../../../categoryContext";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '../categorical.css' or its cor... Remove this comment to see the full error message
import styles from "../../../../categorical.css";
import * as globals from "~/globals";

const STACKED_BAR_HEIGHT = 11;
const STACKED_BAR_WIDTH = 100;

function _currentLabelAsString(label: Category): string {
  return String(label);
}

interface CellTypeInfoButtonProps {
  metadataField: string;
  displayString: string;
  onDisplayCellTypeInfo: (cellName: string) => void;
}

function CellTypeInfoButton({
  metadataField,
  displayString,
  onDisplayCellTypeInfo,
}: CellTypeInfoButtonProps) {
  const cellTypeSuggestions = useCellTypeSuggestions();

  // Check if the current label is a valid cell type
  const isCellInfo = cellTypeSuggestions?.includes(displayString) ?? false;

  if (!isCellInfo) {
    return null;
  }

  return (
    <InfoButtonWrapper>
      <InfoButton
        data-testid={`get-info-${metadataField}-${displayString}`}
        onClick={() => onDisplayCellTypeInfo(displayString)}
        sdsType="tertiary"
        sdsStyle="icon"
        icon="InfoCircle"
        sdsSize="small"
      />
    </InfoButtonWrapper>
  );
}
interface PureCategoryValueProps {
  metadataField: string;
  colorMode: string;
  categoryIndex: number;
  categorySummary: CategorySummary;
  colorAccessor: string;
  colorTable: ColorTable;
  colorData: Dataframe | null;
  categoryData: Dataframe;
}

interface StateProps {
  schema?: RootState["annoMatrix"]["schema"];
  isDilated: boolean;
  isSelected: boolean;
  label: string;
  labelName: string;
  isColorBy: boolean;
  annotations: RootState["annotations"];
  isUserAnnotation: boolean;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

type Props = StateProps & PureCategoryValueProps & DispatchProps;

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

const mapStateToProps = (
  state: RootState,
  ownProps: PureCategoryValueProps
): StateProps => {
  const { pointDilation, categoricalSelection } = state;
  const {
    metadataField,
    categorySummary,
    colorAccessor,
    colorMode,
    categoryIndex,
  } = ownProps;

  const label = categorySummary.categoryValues[categoryIndex];
  const labelKey = String(label);
  const isDilated =
    pointDilation.metadataField === metadataField &&
    pointDilation.categoryField === _currentLabelAsString(labelKey);

  const category = categoricalSelection[metadataField];
  const labelName = String(label);
  const isSelected = category.get(labelKey) ?? true;

  const isColorBy =
    metadataField === colorAccessor &&
    colorMode === "color by categorical metadata";

  const schema = state.annoMatrix?.schema;
  const isUserAnnotation =
    schema?.annotations.obsByName[metadataField]?.writable ?? false;

  return {
    schema,
    isDilated,
    isSelected,
    label: labelKey,
    labelName: String(labelName),
    isColorBy,
    annotations: state.annotations,
    isUserAnnotation,
  };
};
interface InternalStateProps {
  editedLabelText: string;
}
class CategoryValue extends React.Component<Props, InternalStateProps> {
  private mouseEnterTimeout: NodeJS.Timeout | null = null;

  private mouseExitTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      editedLabelText: this.currentLabelAsString(),
    };
  }

  componentDidUpdate(prevProps: Props): void {
    const { metadataField, categoryIndex, categorySummary, colorMode } =
      this.props;
    if (
      prevProps.metadataField !== metadataField ||
      prevProps.colorMode !== colorMode ||
      prevProps.categoryIndex !== categoryIndex ||
      prevProps.categorySummary !== categorySummary
    ) {
      this.setState({
        editedLabelText: this.currentLabelAsString(),
      });
    }
  }

  componentWillUnmount(): void {
    // Clean up any pending timeouts to prevent memory leaks
    if (this.mouseEnterTimeout) {
      clearTimeout(this.mouseEnterTimeout);
    }
    if (this.mouseExitTimeout) {
      clearTimeout(this.mouseExitTimeout);
    }
  }

  labelNameError = (name: string) => {
    const { metadataField, schema } = this.props;
    if (name === this.currentLabelAsString()) return false;
    return isLabelErroneous(name, metadataField, schema);
  };

  instruction = (label: string) =>
    labelPrompt(this.labelNameError(label), "New, unique label", ":");

  activateEditLabelMode = () => {
    const { dispatch, metadataField, categoryIndex, label } = this.props;
    dispatch({
      type: "annotation: activate edit label mode",
      metadataField,
      categoryIndex,
      label,
    });
  };

  cancelEditMode = () => {
    const { dispatch, metadataField, categoryIndex, label } = this.props;
    this.setState({
      editedLabelText: this.currentLabelAsString(),
    });
    dispatch({
      type: "annotation: cancel edit label mode",
      metadataField,
      categoryIndex,
      label,
    });
  };

  handleDeleteValue = () => {
    const { dispatch, metadataField, labelName } = this.props;
    dispatch(
      actions.annotationDeleteLabelFromCategory(metadataField, labelName)
    );
  };

  handleAddCurrentSelectionToThisLabel = () => {
    const { dispatch, metadataField, labelName } = this.props;
    dispatch(actions.annotationLabelCurrentSelection(metadataField, labelName));
  };

  handleEditValue = (e: React.FormEvent) => {
    const { dispatch, metadataField, labelName } = this.props;
    const { editedLabelText } = this.state;

    // Validate the label name before proceeding
    if (this.labelNameError(editedLabelText)) {
      e.preventDefault();
      return;
    }

    // Cancel edit mode first to prevent state conflicts
    this.cancelEditMode();

    // Use setTimeout to ensure state update is processed before dispatching action
    setTimeout(() => {
      dispatch(
        actions.annotationRenameLabelInCategory(
          metadataField,
          labelName,
          editedLabelText
        )
      );
    }, 0);

    e.preventDefault();
  };

  toggleOff = async () => {
    track(EVENTS.EXPLORER_CATEGORICAL_VALUE_SELECT_BUTTON_CLICKED);

    const { dispatch, metadataField, categoryIndex, categorySummary } =
      this.props;

    const label = categorySummary.categoryValues[categoryIndex];

    await dispatch(
      actions.selectCategoricalMetadataAction(
        "categorical metadata filter deselect",
        metadataField,
        categorySummary.allCategoryValues,
        label,
        false
      )
    );
  };

  shouldComponentUpdate = (
    nextProps: Props,
    nextState: InternalStateProps
  ): boolean => {
    /*
    Optimized update check that reduces unnecessary re-renders by checking
    only the most critical state changes first
    */
    const { state } = this;
    const { props } = this;

    // Quick checks first - most common changes
    const editingLabel = state.editedLabelText !== nextState.editedLabelText;
    const valueSelectionChange = props.isSelected !== nextProps.isSelected;
    const dilationChange = props.isDilated !== nextProps.isDilated;
    const colorAccessorChange = props.colorAccessor !== nextProps.colorAccessor;
    const colorModeChange = props.colorMode !== nextProps.colorMode;

    // If any of these changed, update immediately
    if (
      editingLabel ||
      valueSelectionChange ||
      dilationChange ||
      colorAccessorChange ||
      colorModeChange
    ) {
      return true;
    }

    // Check annotation state changes (edit mode active/inactive)
    const currentEditMode =
      props.annotations.isEditingLabelName &&
      props.annotations.labelEditable.category === props.metadataField &&
      props.annotations.labelEditable.label === props.categoryIndex;
    const nextEditMode =
      nextProps.annotations.isEditingLabelName &&
      nextProps.annotations.labelEditable.category ===
        nextProps.metadataField &&
      nextProps.annotations.labelEditable.label === nextProps.categoryIndex;

    if (currentEditMode !== nextEditMode) {
      return true;
    }

    // More expensive checks only if needed
    const { categoryIndex, categorySummary } = props;
    const {
      categoryIndex: newCategoryIndex,
      categorySummary: newCategorySummary,
    } = nextProps;

    const label = categorySummary.categoryValues[categoryIndex];
    const newLabel = newCategorySummary.categoryValues[newCategoryIndex];
    const labelChanged = label !== newLabel;

    const count = categorySummary.categoryValueCounts[categoryIndex];
    const newCount = newCategorySummary.categoryValueCounts[newCategoryIndex];
    const countChanged = count !== newCount;

    // Conservative check for color changes - only for the currently colored-by category
    const colorMightHaveChanged =
      nextProps.colorAccessor === nextProps.metadataField &&
      props.categorySummary !== nextProps.categorySummary;

    return labelChanged || countChanged || colorMightHaveChanged;
  };

  toggleOn = async () => {
    track(EVENTS.EXPLORER_CATEGORICAL_VALUE_SELECT_BUTTON_CLICKED);

    const { dispatch, metadataField, categoryIndex, categorySummary } =
      this.props;
    const label = categorySummary.categoryValues[categoryIndex];

    await dispatch(
      actions.selectCategoricalMetadataAction(
        "categorical metadata filter select",
        metadataField,
        categorySummary.allCategoryValues,
        label,
        true
      )
    );
  };

  handleMouseEnter = () => {
    // Clear any pending exit timeout
    if (this.mouseExitTimeout) {
      clearTimeout(this.mouseExitTimeout);
      this.mouseExitTimeout = null;
    }

    // Debounce mouse enter to prevent rapid state changes
    if (this.mouseEnterTimeout) return;

    this.mouseEnterTimeout = setTimeout(() => {
      const { dispatch, metadataField, categoryIndex, label } = this.props;
      dispatch({
        type: "category value mouse hover start",
        metadataField,
        categoryIndex,
        label,
      });
      this.mouseEnterTimeout = null;
    }, 50); // 50ms debounce
  };

  handleMouseExit = () => {
    // Clear any pending enter timeout
    if (this.mouseEnterTimeout) {
      clearTimeout(this.mouseEnterTimeout);
      this.mouseEnterTimeout = null;
    }

    // Debounce mouse exit to prevent rapid state changes
    if (this.mouseExitTimeout) return;

    this.mouseExitTimeout = setTimeout(() => {
      const { dispatch, metadataField, categoryIndex, label } = this.props;
      dispatch({
        type: "category value mouse hover end",
        metadataField,
        categoryIndex,
        label,
      });
      this.mouseExitTimeout = null;
    }, 100); // 100ms debounce (longer to avoid flickering)
  };

  handleTextChange = (text: string) => {
    this.setState({ editedLabelText: text });
  };

  createHistogramBins = (
    metadataField: string,
    categoryData: Dataframe,
    _colorAccessor: string,
    colorData: Dataframe,
    categoryValue: string,
    width: number,
    height: number
  ) => {
    /*
      Knowing that colorScale is based off continuous data,
      createHistogramBins fetches the continuous data in relation to the cells relevant to the category value.
      It then separates that data into 50 bins for drawing the mini-histogram
    */
    const groupBy = categoryData.col(metadataField);
    const col = colorData.icol(0);
    const range = col.summarizeContinuous();

    const histogramMap = col.histogramContinuousBy(
      50,
      [range.min, range.max],
      groupBy
    );

    // For dict-encoded columns, categoryValue is a label string but histogramMap is keyed by codes
    // Convert to code for lookup
    const lookupValue = groupBy.getInternalRep(categoryValue);

    const bins = histogramMap.has(lookupValue)
      ? (histogramMap.get(lookupValue) as ContinuousHistogram)
      : new Array<number>(50).fill(0);

    const xScale = d3.scaleLinear().domain([0, bins.length]).range([0, width]);

    const largestBin = Math.max(...bins);

    const yScale = d3.scaleLinear().domain([0, largestBin]).range([0, height]);

    return {
      xScale,
      yScale,
      bins,
    };
  };

  createStackedGraphBins = (
    metadataField: string,
    categoryData: Dataframe,
    colorAccessor: string,
    colorData: Dataframe,
    categoryValue: string,
    _colorTable: ColorTable,
    schema: Schema,
    width: number
  ) => {
    /*
      Knowing that the color scale is based off of categorical data,
      createOccupancyStack obtains a map showing the number if cells per colored value
      Using the colorScale a stack of colored bars is drawn representing the map
     */
    const groupBy = categoryData.col(metadataField);
    const occupancyMap = colorData
      .col(colorAccessor)
      .histogramCategoricalBy(groupBy);

    // Histogram now returns label-keyed maps, so use label directly
    const occupancy = occupancyMap.get(categoryValue);

    if (occupancy && occupancy.size > 0) {
      // not all categories have occupancy, so occupancy may be undefined.
      const scale = d3
        .scaleLinear()
        /* get all the keys d[1] as an array, then find the sum */
        .domain([0, d3.sum(Array.from(occupancy.values()))])
        .range([0, width]);
      const { categories } = schema.annotations.obsByName[colorAccessor];

      const dfColumn = colorData.col(colorAccessor);

      // Use unified interface - no conditional logic needed
      const categoryValues = dfColumn.summarizeCategorical().categories;

      return {
        domainValues: categoryValues,
        scale,
        domain: categories,
        occupancy,
      };
    }
    return null;
  };

  handleDisplayCellTypeInfo = async (cellName: string): Promise<void> => {
    const { dispatch } = this.props;

    track(EVENTS.EXPLORER_CELLTYPE_INFO_BUTTON_CLICKED, { cellName });

    dispatch({ type: "request cell info start", cellName });

    dispatch({
      type: "toggle active info panel",
      activeTab: ActiveTab.CellType,
    });

    const info = await actions.fetchCellTypeInfo(cellName, dispatch);

    if (!info) {
      return;
    }

    dispatch({
      type: "open cell info",
      cellInfo: info,
    });
  };

  // If coloring by and this isn't the colorAccessor and it isn't being edited
  shouldRenderStackedBarOrHistogram() {
    const { colorAccessor, isColorBy } = this.props;
    return !!colorAccessor && !isColorBy;
  }

  currentLabelAsString() {
    const { labelName } = this.props;
    return _currentLabelAsString(labelName);
  }

  isAddCurrentSelectionDisabled(
    crossfilter: AnnoMatrixObsCrossfilter | null,
    category: string,
    value: string
  ): boolean {
    /*
    disable "add current selection to label", if one of the following is true:
    1. no cells are selected
    2. all currently selected cells already have this label, on this category
    */
    const { categoryData } = this.props;

    // 1. check if crossfilter is available
    if (!crossfilter) {
      return true;
    }
    // 2. no cells selected?
    if (crossfilter.countSelected() === 0) {
      return true;
    }
    // 3. all selected cells already have the label
    const mask = crossfilter.allSelectedMask();
    if (
      AnnotationsHelpers.allHaveLabelByMask(categoryData, category, value, mask)
    ) {
      return true;
    }
    // else, don't disable
    return false;
  }

  renderMiniStackedBar = (): JSX.Element | null => {
    const {
      colorAccessor,
      metadataField,
      categoryData,
      colorData,
      colorTable,
      schema,
      label,
      colorMode,
    } = this.props;

    const isColorBy =
      metadataField === colorAccessor &&
      colorMode === "color by categorical metadata";

    if (!schema) {
      return null;
    }
    if (
      !this.shouldRenderStackedBarOrHistogram ||
      colorMode === "color by expression" ||
      !AnnotationsHelpers.isCategoricalAnnotation(schema, colorAccessor) ||
      isColorBy ||
      !colorData
    ) {
      return null;
    }

    const result = this.createStackedGraphBins(
      metadataField,
      categoryData,
      colorAccessor,
      colorData,
      label,
      colorTable,
      schema,
      STACKED_BAR_WIDTH
    );

    const { domainValues, scale, domain, occupancy } = result ?? {};

    if (!domainValues || !scale || !domain || !occupancy) {
      return null;
    }

    return (
      <MiniStackedBar
        {...{
          colorTable,
          domainValues,
          scale,
          domain,
          occupancy,
        }}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ height: number; width: number; colorTable:... Remove this comment to see the full error message
        height={STACKED_BAR_HEIGHT}
        width={STACKED_BAR_WIDTH}
      />
    );
  };

  renderMiniHistogram = (): JSX.Element | null => {
    const {
      colorAccessor,
      metadataField,
      colorData,
      categoryData,
      colorTable,
      schema,
      label,
      colorMode,
    } = this.props;
    const colorScale = colorTable?.scale;
    if (!schema) return null;
    if (
      !this.shouldRenderStackedBarOrHistogram ||
      // This function returns true on categorical annotations(when stacked bar should not render),
      //  in cases where the colorAccessor is a gene this function will return undefined since genes do not live on the schema
      (AnnotationsHelpers.isCategoricalAnnotation(schema, colorAccessor) ===
        true &&
        colorMode !== "color by expression" &&
        colorMode !== "color by continuous metadata") ||
      !colorData
    ) {
      return null;
    }

    const { xScale, yScale, bins } =
      this.createHistogramBins(
        metadataField,
        categoryData,
        colorAccessor,
        colorData,
        label,
        STACKED_BAR_WIDTH,
        STACKED_BAR_HEIGHT
      ) ?? {}; // if createHistogramBins returns empty object assign null to deconstructed

    if (!xScale || !yScale || !bins) return null;
    return (
      <MiniHistogram
        {...{
          colorScale,
          xScale,
          yScale,
          bins,
        }}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ obsOrVarContinuousFieldDisplayName: any; d... Remove this comment to see the full error message
        obsOrVarContinuousFieldDisplayName={colorAccessor}
        domainLabel={this.currentLabelAsString()}
        height={STACKED_BAR_HEIGHT}
        width={STACKED_BAR_WIDTH}
      />
    );
  };

  render(): JSX.Element {
    const {
      metadataField,
      categoryIndex,
      colorAccessor,
      colorTable,
      isDilated,
      isSelected,
      categorySummary,
      label,
      colorMode,
      annotations,
      isUserAnnotation,
      labelName,
    } = this.props;
    const colorScale = colorTable?.scale;
    const { editedLabelText } = this.state;

    const count = categorySummary.categoryValueCounts[categoryIndex];
    const displayString = this.currentLabelAsString();

    /* this is the color scale, so add swatches below */
    const isColorBy =
      metadataField === colorAccessor &&
      colorMode === "color by categorical metadata";
    const { categoryValueIndices } = categorySummary;

    const editModeActive =
      isUserAnnotation &&
      annotations.labelEditable.category === metadataField &&
      annotations.isEditingLabelName &&
      annotations.labelEditable.label === categoryIndex;

    const valueToggleLabel = `value-toggle-checkbox-${metadataField}-${displayString}`;

    const LEFT_MARGIN = 60;
    const CHECKBOX = 26;
    const CELL_NUMBER = 50;
    const ANNO_MENU = 26;
    const LABEL_MARGIN = 16;
    const CHART_MARGIN = 24;

    const otherElementsWidth =
      LEFT_MARGIN +
      CHECKBOX +
      CELL_NUMBER +
      LABEL_MARGIN +
      (isUserAnnotation ? ANNO_MENU : 0);

    const labelWidth =
      colorAccessor && !isColorBy
        ? globals.leftSidebarWidth -
          otherElementsWidth -
          STACKED_BAR_WIDTH -
          CHART_MARGIN
        : globals.leftSidebarWidth - otherElementsWidth;

    return (
      <div
        className={
          /* This code is to change the styles on centroid label hover is causing over-rendering */
          `${styles.value}${isDilated ? ` ${styles.hover}` : ""}`
        }
        data-testid="categorical-row"
        style={{
          padding: "4px 10px 4px 7px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "2px",
          borderRadius: "2px",
        }}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseExit}
      >
        <div
          style={{
            margin: 0,
            padding: 0,
            userSelect: "none",
            width: globals.leftSidebarWidth - 120,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              className="ignore-capture"
              style={{ margin: 0, height: "18px" }}
            >
              <Checkbox
                id={valueToggleLabel}
                onChange={isSelected ? this.toggleOff : this.toggleOn}
                data-testid={`categorical-value-select-${metadataField}-${displayString}`}
                checked={isSelected}
                type="checkbox"
              />
            </span>
            <Truncate>
              <label
                htmlFor={valueToggleLabel}
                data-testid="categorical-value"
                tabIndex={-1}
                style={{
                  width: labelWidth - 25,
                  color:
                    displayString === globals.unassignedCategoryLabel
                      ? "#ababab"
                      : "black",
                  fontStyle:
                    displayString === globals.unassignedCategoryLabel
                      ? "italic"
                      : "normal",
                  display: "inline-block",
                  overflow: "hidden",
                  lineHeight: "1.1em",
                  height: "1.1em",
                  verticalAlign: "middle",
                  marginRight: LABEL_MARGIN,
                }}
              >
                {displayString}
              </label>
            </Truncate>
            {/* Always render dialog container to avoid mount/unmount issues */}
            <div style={{ display: editModeActive ? "block" : "none" }}>
              <AnnoDialog
                isActive={editModeActive}
                title="Edit label"
                instruction={this.instruction(editedLabelText)}
                cancelTooltipContent="Close this dialog without editing label text."
                primaryButtonText="Change label text"
                text={editedLabelText}
                validationError={this.labelNameError(editedLabelText)}
                handleSubmit={this.handleEditValue}
                handleCancel={this.cancelEditMode}
                annoInput={
                  <LabelInputWithSuggestions
                    label={editedLabelText}
                    onChange={this.handleTextChange}
                    inputProps={{
                      leftIcon: "tag",
                      intent: "none",
                      autoFocus: editModeActive, // Only autofocus when active
                    }}
                  />
                }
              />
            </div>
            <CellTypeInfoButton
              metadataField={metadataField}
              displayString={displayString}
              onDisplayCellTypeInfo={this.handleDisplayCellTypeInfo}
            />
          </div>
          <span style={{ flexShrink: 0 }}>
            {this.renderMiniStackedBar()}
            {this.renderMiniHistogram()}
          </span>
        </div>
        <div
          style={{
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ display: "inline-block", verticalAlign: "baseline" }}>
            <span
              data-testid="categorical-value-count"
              data-testfield={`${metadataField}-${displayString}`}
              style={{
                color:
                  displayString === globals.unassignedCategoryLabel
                    ? "#ababab"
                    : "black",
                fontStyle:
                  displayString === globals.unassignedCategoryLabel
                    ? "italic"
                    : "auto",
                top: "10px",
              }}
            >
              {count}
            </span>
            <span style={{ verticalAlign: "baseline" }}>
              <svg
                display={isColorBy && categoryValueIndices ? "auto" : "none"}
                style={{
                  top: 3,
                  width: 15,
                  height: 15,
                  marginLeft: 5,
                  position: "relative",
                  backgroundColor:
                    isColorBy && categoryValueIndices && colorScale
                      ? (colorScale(
                          categoryValueIndices.get(label) ?? 0
                        ) as string)
                      : "inherit",
                }}
              />
            </span>
            {isUserAnnotation ? (
              <span
                onMouseEnter={editModeActive ? undefined : this.handleMouseExit}
                onMouseLeave={
                  editModeActive ? undefined : this.handleMouseEnter
                }
              >
                <Popover
                  interactionKind={PopoverInteractionKind.HOVER}
                  position={Position.RIGHT_TOP}
                  disabled={editModeActive}
                  content={
                    <Menu>
                      <CategoryCrossfilterContext.Consumer>
                        {(crossfilter: AnnoMatrixObsCrossfilter | null) => (
                          <MenuItem
                            icon="plus"
                            data-testid={`${metadataField}:${displayString}:add-current-selection-to-this-label`}
                            onClick={this.handleAddCurrentSelectionToThisLabel}
                            text={
                              <span>
                                Re-label currently selected cells as
                                <span
                                  style={{
                                    fontStyle:
                                      displayString ===
                                      globals.unassignedCategoryLabel
                                        ? "italic"
                                        : "auto",
                                  }}
                                >
                                  {` ${displayString}`}
                                </span>
                              </span>
                            }
                            disabled={this.isAddCurrentSelectionDisabled(
                              crossfilter,
                              metadataField,
                              labelName
                            )}
                          />
                        )}
                      </CategoryCrossfilterContext.Consumer>
                      {displayString !== globals.unassignedCategoryLabel ? (
                        <MenuItem
                          icon="edit"
                          text="Edit this label's name"
                          data-testid={`${metadataField}:${displayString}:edit-label`}
                          onClick={this.activateEditLabelMode}
                          disabled={annotations.isEditingLabelName}
                        />
                      ) : null}
                      {displayString !== globals.unassignedCategoryLabel ? (
                        <MenuItem
                          icon={IconNames.TRASH}
                          intent={Intent.DANGER}
                          data-testid={`${metadataField}:${displayString}:delete-label`}
                          onClick={this.handleDeleteValue}
                          text={`Delete this label, and reassign all cells to type '${globals.unassignedCategoryLabel}'`}
                        />
                      ) : null}
                    </Menu>
                  }
                >
                  <Button
                    style={{
                      marginLeft: 2,
                      position: "relative",
                      top: -1,
                      minHeight: 16,
                    }}
                    data-testid={`${metadataField}:${displayString}:see-actions`}
                    icon={<Icon icon="more" iconSize={10} />}
                    small
                    minimal
                  />
                </Popover>
              </span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(CategoryValue);
