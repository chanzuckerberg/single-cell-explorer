import { connect } from "react-redux";
import React from "react";
import * as d3 from "d3";
import { Checkbox } from "@blueprintjs/core";
import Truncate from "common/components/Truncate/Truncate";
import { AnnotationsHelpers } from "util/stateManager";
import actions from "actions";
import { Dataframe, ContinuousHistogram } from "util/dataframe";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { RootState, AppDispatch } from "reducers";
import { Schema, Category } from "common/types/schema";
import { isDataframeDictEncodedColumn } from "util/dataframe/types";
import { CategorySummary } from "util/stateManager/controlsHelpers";
import { ColorTable } from "util/stateManager/colorHelpers";
import { ActiveTab } from "common/types/entities";
import { InfoButton, InfoButtonWrapper } from "common/style";
import MiniStackedBar from "./components/MiniStackedBar/MiniStackedBar";
import MiniHistogram from "./components/MiniHistogram/MiniHistogram";
import { labelPrompt, isLabelErroneous } from "./labelUtil";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '../categorical.css' or its cor... Remove this comment to see the full error message
import styles from "../../../../categorical.css";
import * as globals from "~/globals";

const STACKED_BAR_HEIGHT = 11;
const STACKED_BAR_WIDTH = 100;

function _currentLabelAsString(label: Category): string {
  return String(label);
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
    categoryData,
  } = ownProps;

  const label = categorySummary.categoryValues[categoryIndex];
  const isDilated =
    pointDilation.metadataField === metadataField &&
    pointDilation.categoryField === _currentLabelAsString(label);

  const category = categoricalSelection[metadataField];
  const col = categoryData.icol(0);
  const labelName = isDataframeDictEncodedColumn(col)
    ? col.codeMapping[parseInt(label as string, 10)]
    : label;
  const isSelected = category.get(label as string) ?? true;

  const isColorBy =
    metadataField === colorAccessor &&
    colorMode === "color by categorical metadata";
  return {
    schema: state.annoMatrix?.schema,
    isDilated,
    isSelected,
    label: label as string,
    labelName: labelName as string,
    isColorBy,
  };
};
interface InternalStateProps {
  editedLabelText: string;
}
class CategoryValue extends React.Component<Props, InternalStateProps> {
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
    Checks to see if at least one of the following changed:
    * world state
    * the color accessor (what is currently being colored by)
    * if this categorical value's selection status has changed
    * the crossfilter (ie, global selection state)
    * the color mode (type of coloring occurring)

    If and only if true, update the component
    */
    const { state } = this;
    const { props } = this;
    const { categoryIndex, categorySummary, isSelected } = props;
    const {
      categoryIndex: newCategoryIndex,
      categorySummary: newCategorySummary,
      isSelected: newIsSelected,
    } = nextProps;

    const label = categorySummary.categoryValues[categoryIndex];
    const newLabel = newCategorySummary.categoryValues[newCategoryIndex];
    const labelChanged = label !== newLabel;
    const valueSelectionChange = isSelected !== newIsSelected;

    const colorAccessorChange = props.colorAccessor !== nextProps.colorAccessor;
    const colorModeChange = props.colorMode !== nextProps.colorMode;
    const editingLabel = state.editedLabelText !== nextState.editedLabelText;
    const dilationChange = props.isDilated !== nextProps.isDilated;

    const count = categorySummary.categoryValueCounts[categoryIndex];
    const newCount = newCategorySummary.categoryValueCounts[newCategoryIndex];
    const countChanged = count !== newCount;

    // If the user edits an annotation that is currently colored-by, colors may be re-assigned.
    // This test is conservative - it may cause re-rendering of entire category (all labels)
    // if any one changes, but only for the currently colored-by category.
    const colorMightHaveChanged =
      nextProps.colorAccessor === nextProps.metadataField &&
      props.categorySummary !== nextProps.categorySummary;

    return (
      labelChanged ||
      valueSelectionChange ||
      colorAccessorChange ||
      editingLabel ||
      dilationChange ||
      countChanged ||
      colorMightHaveChanged ||
      colorModeChange
    );
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
    const { dispatch, metadataField, categoryIndex, label } = this.props;
    dispatch({
      type: "category value mouse hover start",
      metadataField,
      categoryIndex,
      label,
    });
  };

  handleMouseExit = () => {
    const { dispatch, metadataField, categoryIndex, label } = this.props;
    dispatch({
      type: "category value mouse hover end",
      metadataField,
      categoryIndex,
      label,
    });
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

    const bins = histogramMap.has(categoryValue)
      ? (histogramMap.get(categoryValue) as ContinuousHistogram)
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

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  isAddCurrentSelectionDisabled(crossfilter: any, category: any, value: any) {
    /*
    disable "add current selection to label", if one of the following is true:
    1. no cells are selected
    2. all currently selected cells already have this label, on this category
    */
    const { categoryData } = this.props;

    // 1. no cells selected?
    if (crossfilter.countSelected() === 0) {
      return true;
    }
    // 2. all selected cells already have the label
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

    if (!schema) return null;
    if (
      !this.shouldRenderStackedBarOrHistogram ||
      colorMode === "color by expression" ||
      !AnnotationsHelpers.isCategoricalAnnotation(schema, colorAccessor) ||
      isColorBy ||
      !colorData
    ) {
      return null;
    }

    const { domainValues, scale, domain, occupancy } =
      this.createStackedGraphBins(
        metadataField,
        categoryData,
        colorAccessor,
        colorData,
        label,
        colorTable,
        schema,
        STACKED_BAR_WIDTH
      ) ?? {};

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
    } = this.props;
    const colorScale = colorTable?.scale;

    const count = categorySummary.categoryValueCounts[categoryIndex];
    const displayString = this.currentLabelAsString();

    /* this is the color scale, so add swatches below */
    const isColorBy =
      metadataField === colorAccessor &&
      colorMode === "color by categorical metadata";
    const { categoryValueIndices } = categorySummary;

    const valueToggleLabel = `value-toggle-checkbox-${metadataField}-${displayString}`;

    const LEFT_MARGIN = 60;
    const CHECKBOX = 26;
    const CELL_NUMBER = 50;
    const LABEL_MARGIN = 16;
    const CHART_MARGIN = 24;

    const otherElementsWidth =
      LEFT_MARGIN + CHECKBOX + CELL_NUMBER + LABEL_MARGIN;

    const labelWidth =
      colorAccessor && !isColorBy
        ? globals.leftSidebarWidth -
          otherElementsWidth -
          STACKED_BAR_WIDTH -
          CHART_MARGIN
        : globals.leftSidebarWidth - otherElementsWidth;

    const isCellInfo = metadataField === "cell_type";

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
            {isCellInfo && (
              <InfoButtonWrapper>
                <InfoButton
                  data-testid={`get-info-${metadataField}-${displayString}`}
                  onClick={() => this.handleDisplayCellTypeInfo(displayString)}
                  sdsType="tertiary"
                  sdsStyle="icon"
                  icon="InfoCircle"
                  sdsSize="small"
                />
              </InfoButtonWrapper>
            )}
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
          </span>
        </div>
      </div>
    );
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(CategoryValue);
