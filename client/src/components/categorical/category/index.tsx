import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React, { useRef, useEffect, useCallback } from "react";
import { connect, shallowEqual } from "react-redux";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";
import { Button, Classes, Position, Tooltip } from "@blueprintjs/core";
import Async, { AsyncProps } from "react-async";
import memoize from "memoize-one";

import Value from "../value";
import Truncate from "../../util/truncate";
import { CategoryCrossfilterContext } from "../categoryContext";

import * as globals from "../../../globals";
import { createCategorySummaryFromDfCol } from "../../../util/stateManager/controlsHelpers";
import {
  createColorTable,
  createColorQuery,
  ColorTable,
} from "../../../util/stateManager/colorHelpers";
import actions from "../../../actions";
import { Dataframe } from "../../../util/dataframe";
import { track } from "../../../analytics";
import { EVENTS } from "../../../analytics/events";
import { RootState } from "../../../reducers";
import {
  thunkTrackColorByCategoryExpand,
  thunkTrackColorByCategoryHighlightHistogram,
} from "./analytics";

const LABEL_WIDTH = globals.leftSidebarWidth - 100;

type CategoryAsyncProps = {
  categoryData: Dataframe;
  categorySummary: ReturnType<typeof createCategorySummaryFromDfCol>;
  colorData: Dataframe | null;
  colorTable: ColorTable;
  isColorAccessor: boolean;
  handleCategoryToggleAllClick: () => void;
} & StateProps["colors"];

interface PureCategoryProps {
  metadataField: string;
  isExpanded: boolean;
  onExpansionChange: (metadataField: string) => void;
  categoryType: string;
}

interface StateProps {
  colors: RootState["colors"];
  categoricalSelection: RootState["categoricalSelection"][string];
  annoMatrix: RootState["annoMatrix"];
  schema: RootState["annoMatrix"]["schema"];
  crossfilter: RootState["obsCrossfilter"];
  genesets: RootState["genesets"]["genesets"];
  isCellGuideCxg: boolean;
}

type CategoryProps = PureCategoryProps & StateProps;

const mapStateToProps = (
  state: RootState,
  ownProps: PureCategoryProps
): StateProps => {
  const schema = state.annoMatrix?.schema;
  const { metadataField } = ownProps;
  const categoricalSelection = state.categoricalSelection?.[metadataField];
  return {
    colors: state.colors,
    categoricalSelection,
    annoMatrix: state.annoMatrix,
    schema,
    crossfilter: state.obsCrossfilter,
    genesets: state.genesets.genesets,
    isCellGuideCxg: state.controls.isCellGuideCxg,
  };
};

class Category extends React.PureComponent<CategoryProps> {
  static getSelectionState(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    categoricalSelection: any,
    // @ts-expect-error ts-migrate(6133) FIXME: 'metadataField' is declared but its value is never... Remove this comment to see the full error message
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    metadataField: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    categorySummary: any
  ): string {
    // total number of categories in this dimension
    const totalCatCount = categorySummary.numCategoryValues;
    // number of selected options in this category
    const selectedCatCount = categorySummary.categoryValues.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      (res: any, label: any) =>
        categoricalSelection.get(label) ?? true ? res + 1 : res,
      0
    );
    return selectedCatCount === totalCatCount
      ? "all"
      : selectedCatCount === 0
      ? "none"
      : "some";
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  static watchAsync(props: any, prevProps: any) {
    return !shallowEqual(props.watchProps, prevProps.watchProps);
  }

  createCategorySummaryFromDfCol = memoize(createCategorySummaryFromDfCol);

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  getSelectionState(categorySummary: any) {
    const { categoricalSelection, metadataField } = this.props;
    return Category.getSelectionState(
      categoricalSelection,
      metadataField,
      categorySummary
    );
  }

  handleColorChange = (isColorAccessor: boolean) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, metadataField, categoryType } = this.props;

    /**
     * (thuang): If we're going from `isColorAccessor` being `false` to `true`,
     * we should track the event!
     */
    if (!isColorAccessor) {
      track(EVENTS.EXPLORER_COLORBY_CATEGORIES_BUTTON_CLICKED, {
        type: categoryType,
        category: metadataField,
      });
    }

    /**
     * (thuang): If `isColorAccessor` is currently `true`, we're turning off
     * color by category, thus passing `!isColorAccessor` as arg `isColorByCategory`
     */
    dispatch(thunkTrackColorByCategoryExpand(!isColorAccessor));
    dispatch(thunkTrackColorByCategoryHighlightHistogram(!isColorAccessor));

    dispatch({
      type: "color by categorical metadata",
      colorAccessor: metadataField,
    });
  };

  handleCategoryClick = () => {
    const { metadataField, onExpansionChange } = this.props;
    onExpansionChange(metadataField);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleCategoryKeyPress = (e: any) => {
    if (e.key === "Enter") {
      this.handleCategoryClick();
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleToggleAllClick = (categorySummary: any) => {
    track(EVENTS.EXPLORER_CATEGORY_SELECT_BUTTON_CLICKED);

    const isChecked = this.getSelectionState(categorySummary);
    if (isChecked === "all") {
      this.toggleNone(categorySummary);
    } else {
      this.toggleAll(categorySummary);
    }
  };

  fetchAsyncProps = async (
    props: AsyncProps<CategoryAsyncProps>
  ): Promise<CategoryAsyncProps> => {
    const { annoMatrix, metadataField, colors } = props.watchProps;

    const [categoryData, categorySummary, colorData] = await this.fetchData(
      annoMatrix,
      metadataField,
      colors
    );

    return {
      categoryData,
      categorySummary,
      colorData,
      ...this.updateColorTable(colorData),
      handleCategoryToggleAllClick: () =>
        this.handleToggleAllClick(categorySummary),
    };
  };

  async fetchData(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    annoMatrix: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    metadataField: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    colors: any
  ): Promise<
    [
      Dataframe,
      ReturnType<typeof createCategorySummaryFromDfCol>,
      Dataframe | null,
      string | null
    ]
  > {
    /*
    fetch our data and the color-by data if appropriate, and then build a summary
    of our category and a color table for the color-by annotation.
    */
    const { schema } = annoMatrix;
    const { colorAccessor, colorMode } = colors;
    const { genesets } = this.props;
    let colorDataPromise: Promise<Dataframe | null> = Promise.resolve(null);
    if (colorAccessor) {
      const query = createColorQuery(
        colorMode,
        colorAccessor,
        schema,
        genesets
      );
      if (query)
        colorDataPromise = annoMatrix.fetch(...query, globals.numBinsObsX);
    }
    const [categoryData, colorData]: [Dataframe, Dataframe | null] =
      await Promise.all([
        annoMatrix.fetch("obs", metadataField),
        colorDataPromise,
      ]);

    // our data
    const column = categoryData.icol(0);
    const colSchema = schema.annotations.obsByName[metadataField];
    const categorySummary = this.createCategorySummaryFromDfCol(
      column,
      colSchema
    );
    return [categoryData, categorySummary, colorData, colorMode];
  }

  updateColorTable(colorData: Dataframe | null): {
    isColorAccessor: boolean;
    colorTable: ColorTable;
  } & StateProps["colors"] {
    // color table, which may be null
    const { schema, colors, metadataField } = this.props;
    const { colorAccessor, userColors, colorMode } = colors;
    return {
      isColorAccessor:
        colorAccessor === metadataField &&
        colorMode === "color by categorical metadata",
      colorAccessor,
      colorMode,
      colorTable: createColorTable(
        colorMode,
        colorAccessor,
        colorData,
        schema,
        userColors
      ),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  toggleNone(categorySummary: any) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, metadataField } = this.props;
    dispatch(
      actions.selectCategoricalAllMetadataAction(
        "categorical metadata filter none of these",
        metadataField,
        categorySummary.allCategoryValues,
        false
      )
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  toggleAll(categorySummary: any) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, metadataField } = this.props;
    dispatch(
      actions.selectCategoricalAllMetadataAction(
        "categorical metadata filter all of these",
        metadataField,
        categorySummary.allCategoryValues,
        true
      )
    );
  }

  render(): JSX.Element {
    const {
      metadataField,
      isExpanded,
      categoricalSelection,
      crossfilter,
      colors,
      annoMatrix,
      isCellGuideCxg,
    } = this.props;

    const checkboxID = `category-select-${metadataField}`;

    return (
      <CategoryCrossfilterContext.Provider value={crossfilter}>
        <Async
          watchFn={Category.watchAsync}
          promiseFn={this.fetchAsyncProps}
          watchProps={{
            metadataField,
            annoMatrix,
            categoricalSelection,
            colors,
          }}
        >
          <Async.Pending initial>
            <StillLoading />
          </Async.Pending>
          <Async.Rejected>
            {(error) => (
              <ErrorLoading metadataField={metadataField} error={error} />
            )}
          </Async.Rejected>
          <Async.Fulfilled persist>
            {(asyncProps: CategoryAsyncProps) => {
              const {
                /**
                 * (thuang): `colorAccessor` needs to be accessed from `asyncProps` instead
                 * of `this.props.colors` to prevent the bug below
                 * https://github.com/chanzuckerberg/single-cell-explorer/issues/1022
                 */
                colorAccessor,
                colorTable,
                colorData,
                categoryData,
                categorySummary,
                isColorAccessor,
                handleCategoryToggleAllClick,
                colorMode,
              } = asyncProps;
              const selectionState = this.getSelectionState(categorySummary);
              return (
                <CategoryRender
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ metadataField: any; checkboxID: string; is... Remove this comment to see the full error message
                  metadataField={metadataField}
                  checkboxID={checkboxID}
                  isExpanded={isExpanded}
                  isColorAccessor={isColorAccessor}
                  selectionState={selectionState}
                  categoryData={categoryData}
                  categorySummary={categorySummary}
                  colorAccessor={colorAccessor}
                  colorData={colorData}
                  colorTable={colorTable}
                  onColorChangeClick={this.handleColorChange}
                  onCategoryToggleAllClick={handleCategoryToggleAllClick}
                  onCategoryMenuClick={this.handleCategoryClick}
                  onCategoryMenuKeyPress={this.handleCategoryKeyPress}
                  colorMode={colorMode}
                  isCellGuideCxg={isCellGuideCxg}
                />
              );
            }}
          </Async.Fulfilled>
        </Async>
      </CategoryCrossfilterContext.Provider>
    );
  }
}

export default connect(mapStateToProps)(Category);

/**
 * We are still loading this category, so render a "busy" signal.
 */
export const StillLoading = (): JSX.Element => (
  <div style={{ paddingBottom: 2.7 }}>
    <div className={SKELETON} style={{ height: 30 }} />
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const ErrorLoading = ({ metadataField, error }: any) => {
  console.error(error); // log error to console as it is unexpected.
  return (
    <div style={{ marginBottom: 10, marginTop: 4 }}>
      <span
        style={{
          cursor: "pointer",
          display: "inline-block",
          width: LABEL_WIDTH,
          fontStyle: "italic",
        }}
      >
        {`Failure loading ${metadataField}`}
      </span>
    </div>
  );
};

interface CategoryHeaderProps {
  metadataField: any;
  checkboxID: any;
  isColorAccessor: boolean;
  isExpanded: boolean;
  selectionState: any;
  onColorChangeClick: (isColorAccessor: boolean) => void;
  onCategoryMenuClick: any;
  onCategoryMenuKeyPress: any;
  onCategoryToggleAllClick: any;
}

const CategoryHeader = React.memo(
  ({
    metadataField,
    checkboxID,
    isColorAccessor,
    isExpanded,
    selectionState,
    onColorChangeClick,
    onCategoryMenuClick,
    onCategoryMenuKeyPress,
    onCategoryToggleAllClick,
  }: CategoryHeaderProps) => {
    /*
    Render category name and controls (eg, color-by button).
    */
    const checkboxRef = useRef(null);

    useEffect(() => {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      checkboxRef.current.indeterminate = selectionState === "some";
    }, [selectionState]);

    const handleColorChangeClick = useCallback(() => {
      onColorChangeClick(isColorAccessor);
    }, [onColorChangeClick, isColorAccessor]);

    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <label
            className={`${Classes.CONTROL} ${Classes.CHECKBOX} ignore-capture`}
            htmlFor={checkboxID}
          >
            <input
              id={checkboxID}
              data-testid={`${metadataField}:category-select`}
              onChange={onCategoryToggleAllClick}
              ref={checkboxRef}
              checked={selectionState === "all"}
              type="checkbox"
            />
            <span className={Classes.CONTROL_INDICATOR} />
          </label>
          <span
            role="menuitem"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number | ... Remove this comment to see the full error message
            tabIndex="0"
            data-testid={`${metadataField}:category-expand`}
            onKeyPress={onCategoryMenuKeyPress}
            style={{
              cursor: "pointer",
            }}
            onClick={onCategoryMenuClick}
          >
            <Truncate>
              <span
                style={{
                  maxWidth: LABEL_WIDTH,
                }}
                data-testid={`${metadataField}:category-label`}
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number | ... Remove this comment to see the full error message
                tabIndex="-1"
              >
                {metadataField}
              </span>
            </Truncate>
            {isExpanded ? (
              <FaChevronDown
                data-testid="category-expand-is-expanded"
                style={{ fontSize: 10, marginLeft: 5 }}
              />
            ) : (
              <FaChevronRight
                data-testid="category-expand-is-not-expanded"
                style={{ fontSize: 10, marginLeft: 5 }}
              />
            )}
          </span>
        </div>

        <div className="ignore-capture">
          <Tooltip
            content="Use as color scale"
            position={Position.LEFT}
            usePortal
            hoverOpenDelay={globals.tooltipHoverOpenDelay}
            modifiers={{
              preventOverflow: { enabled: false },
              hide: { enabled: false },
            }}
          >
            <Button
              data-testid={`colorby-${metadataField}`}
              onClick={handleColorChangeClick}
              active={isColorAccessor}
              intent={isColorAccessor ? "primary" : "none"}
              icon="tint"
            />
          </Tooltip>
        </div>
      </>
    );
  }
);

const CategoryRender = React.memo(
  ({
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'metadataField' does not exist on type '{... Remove this comment to see the full error message
    metadataField,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'checkboxID' does not exist on type '{ ch... Remove this comment to see the full error message
    checkboxID,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isColorAccessor' does not exist on type ... Remove this comment to see the full error message
    isColorAccessor,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isExpanded' does not exist on type '{ ch... Remove this comment to see the full error message
    isExpanded,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'selectionState' does not exist on type '... Remove this comment to see the full error message
    selectionState,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'categoryData' does not exist on type '{ ... Remove this comment to see the full error message
    categoryData,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'categorySummary' does not exist on type ... Remove this comment to see the full error message
    categorySummary,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'colorAccessor' does not exist on type '{... Remove this comment to see the full error message
    colorAccessor,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'colorData' does not exist on type '{ chi... Remove this comment to see the full error message
    colorData,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'colorTable' does not exist on type '{ ch... Remove this comment to see the full error message
    colorTable,
    onColorChangeClick,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onCategoryMenuClick' does not exist on t... Remove this comment to see the full error message
    onCategoryMenuClick,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onCategoryMenuKeyPress' does not exist o... Remove this comment to see the full error message
    onCategoryMenuKeyPress,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onCategoryToggleAllClick' does not exist... Remove this comment to see the full error message
    onCategoryToggleAllClick,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'colorMode' does not exist... Remove this comment to see the full error message
    colorMode,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isCellGuideCxg' does not exist... Remove this comment to see the full error message
    isCellGuideCxg,
  }: {
    onColorChangeClick: (isColorAccessor: boolean) => void;
  }) => {
    /*
    Render the core of the category, including checkboxes, controls, etc.
    */
    const { numCategoryValues } = categorySummary;
    const isSingularValue = numCategoryValues === 1;

    if (isSingularValue && !isCellGuideCxg) {
      /*
      Entire category has a single value, special case.
      */
      return null;
    }

    /*
    Otherwise, our normal multi-layout layout
    */
    return (
      <div
        style={{
          maxWidth: globals.maxControlsWidth,
        }}
        data-testid={`category-${metadataField}`}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <CategoryHeader
            metadataField={metadataField}
            checkboxID={checkboxID}
            isExpanded={isExpanded}
            isColorAccessor={isColorAccessor}
            selectionState={selectionState}
            onColorChangeClick={onColorChangeClick}
            onCategoryToggleAllClick={onCategoryToggleAllClick}
            onCategoryMenuClick={onCategoryMenuClick}
            onCategoryMenuKeyPress={onCategoryMenuKeyPress}
          />
        </div>
        <div style={{ marginLeft: 26 }}>
          {
            /* values*/
            isExpanded ? (
              <CategoryValueList
                metadataField={metadataField}
                categoryData={categoryData}
                categorySummary={categorySummary}
                colorAccessor={colorAccessor}
                colorData={colorData}
                colorTable={colorTable}
                colorMode={colorMode}
              />
            ) : null
          }
        </div>
      </div>
    );
  }
);

interface CategoryValueListProps {
  metadataField: any;
  categoryData: any;
  categorySummary: any;
  colorAccessor: string;
  colorData: any;
  colorTable: any;
  colorMode: string;
}
const CategoryValueList = React.memo(
  ({
    metadataField,
    categoryData,
    categorySummary,
    colorAccessor,
    colorData,
    colorTable,
    colorMode,
  }: CategoryValueListProps) => {
    const tuples = [...categorySummary.categoryValueIndices].filter(
      ([, index]) => categorySummary.categoryValueCounts[index] > 0
    );

    // sort categorical labels in descending order by average values of whatever
    // continuous metadata is currently being colored by
    if (
      colorMode === "color by continuous metadata" ||
      colorMode === "color by expression" ||
      colorMode === "color by geneset mean expression"
    ) {
      const categoryDataArray = categoryData.col(metadataField).asArray();
      const colorDataArray = colorData.icol(0).asArray();
      const categoryColorMap = new Map();
      categoryDataArray.forEach((category: string, index: number) => {
        if (!categoryColorMap.has(category)) {
          categoryColorMap.set(category, { sum: 0, count: 0 });
        }
        const colorValue = colorDataArray[index];
        const categoryColor = categoryColorMap.get(category);
        categoryColor.sum += colorValue;
        categoryColor.count += 1;
      });

      const categoryAverageColor = new Map();
      categoryColorMap.forEach((value, key) => {
        categoryAverageColor.set(key, value.sum / value.count);
      });
      tuples.sort((a, b) => {
        const colorA = categoryAverageColor.get(a[0]);
        const colorB = categoryAverageColor.get(b[0]);
        return colorB - colorA;
      });

      /*
      Render the value list.  If this is a user annotation, we use a flipper
      animation, if read-only, we don't bother and save a few bits of perf.
      */
    }
    return (
      <>
        {tuples.map(([value, index]) => (
          <Value
            key={value}
            metadataField={metadataField}
            categoryIndex={index}
            categoryData={categoryData}
            categorySummary={categorySummary}
            colorAccessor={colorAccessor}
            colorData={colorData}
            colorTable={colorTable}
            colorMode={colorMode}
          />
        ))}
      </>
    );
  }
);
