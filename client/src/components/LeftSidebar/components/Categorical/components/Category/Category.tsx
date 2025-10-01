import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React, { useRef, useEffect, useCallback } from "react";
import { connect, shallowEqual } from "react-redux";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";
import { Button, Classes, Position, Tooltip } from "@blueprintjs/core";
import Async, { AsyncProps } from "react-async";
import memoize from "memoize-one";
import Truncate from "common/components/Truncate/Truncate";
import { createCategorySummaryFromDfCol } from "util/stateManager/controlsHelpers";
import {
  createColorTable,
  createColorQuery,
  ColorTable,
} from "util/stateManager/colorHelpers";
import actions from "actions";
import { Dataframe } from "util/dataframe";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { RootState, AppDispatch } from "reducers";
import * as globals from "~/globals";
import { CategoryCrossfilterContext } from "../../categoryContext";
import CategoryValue from "./components/CategoryValue/CategoryValue";
import {
  thunkTrackColorByCategoryExpand,
  thunkTrackColorByCategoryHighlightHistogram,
} from "./analytics";
import AddLabelDialog from "../AddLabelDialog";

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

interface DispatchProps {
  dispatch: AppDispatch;
}

type CategoryProps = PureCategoryProps & StateProps & DispatchProps;

const mapStateToProps = (
  state: RootState,
  ownProps: PureCategoryProps
): StateProps => {
  const schema = state.obsCrossfilter?.annoMatrix?.schema ?? state.annoMatrix?.schema;
  const { metadataField } = ownProps;
  const categoricalSelection =
    state.categoricalSelection?.[metadataField] ?? new Map();
  return {
    colors: state.colors,
    categoricalSelection,
    annoMatrix: state.obsCrossfilter?.annoMatrix ?? state.annoMatrix,
    schema,
    crossfilter: state.obsCrossfilter,
    genesets: state.genesets.genesets,
    isCellGuideCxg: state.controls.isCellGuideCxg,
  };
};

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

class Category extends React.PureComponent<CategoryProps> {
  constructor(props: CategoryProps) {
    super(props);
    console.log('[Category] constructor called for:', props.metadataField);
  }

  componentDidMount() {
    console.log('[Category] componentDidMount for:', this.props.metadataField);
  }

  componentDidUpdate(prevProps: CategoryProps) {
    const { metadataField } = this.props;
    console.log(`[Category ${metadataField}] componentDidUpdate called`);
    console.log(`[Category ${metadataField}] annoMatrix changed?`, prevProps.annoMatrix !== this.props.annoMatrix);
    console.log(`[Category ${metadataField}] schema changed?`, prevProps.schema !== this.props.schema);
    console.log(`[Category ${metadataField}] crossfilter changed?`, prevProps.crossfilter !== this.props.crossfilter);
    if (prevProps.metadataField !== this.props.metadataField) {
      console.log('[Category] metadataField changed from', prevProps.metadataField, 'to', this.props.metadataField);
    }
  }

  static getSelectionState(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    categoricalSelection: any,
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
    const shouldRefetch = !shallowEqual(props.watchProps, prevProps.watchProps);
    if (shouldRefetch) {
      console.log(`[Category ${props.watchProps.metadataField}] watchAsync triggered refetch`);
      console.log(`[Category ${props.watchProps.metadataField}] annoMatrix changed?`, props.watchProps.annoMatrix !== prevProps?.watchProps?.annoMatrix);
    }
    return shouldRefetch;
  }

  createCategorySummaryFromDfCol = memoize(createCategorySummaryFromDfCol);

  handleAddLabel = (metadataField: string) => {
    const { dispatch } = this.props;
    dispatch({
      type: "annotation: activate add new label mode",
      data: metadataField,
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  getSelectionState(categorySummary: any) {
    const { categoricalSelection, metadataField } = this.props;
    return Category.getSelectionState(
      categoricalSelection,
      categorySummary
    );
  }

  handleColorChange = (currentIsColorAccessor: boolean) => {
    const { dispatch, metadataField, categoryType } = this.props;

    /**
     * (thuang): If we're going from `currentIsColorAccessor` being `false` to `true`,
     * we should track the event!
     */
    if (!currentIsColorAccessor) {
      track(EVENTS.EXPLORER_COLORBY_CATEGORIES_BUTTON_CLICKED, {
        type: categoryType,
        category: metadataField,
      });
    }

    /**
     * (thuang): If `currentIsColorAccessor` is currently `true`, we're turning off
     * color by category, thus passing `!currentIsColorAccessor` as arg `isColorByCategory`
     */
    dispatch(thunkTrackColorByCategoryExpand(!currentIsColorAccessor));
    dispatch(
      thunkTrackColorByCategoryHighlightHistogram(!currentIsColorAccessor)
    );

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

    console.log(`[Category ${metadataField}] fetchAsyncProps called`);
    console.log(`[Category ${metadataField}] annoMatrix:`, annoMatrix);

    const [categoryData, categorySummary, colorData] = await this.fetchData(
      annoMatrix,
      metadataField,
      colors
    );

    console.log(`[Category ${metadataField}] fetchAsyncProps complete - categorySummary:`, categorySummary);

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
      colorTable: createColorTable({
        colorMode,
        colorByAccessor: colorAccessor,
        colorByData: colorData,
        schema,
        userColors,
        isSpatial: false,
      }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  toggleNone(categorySummary: any) {
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

    console.log(`[Category ${metadataField}] render called`);

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
            {(() => {
              console.log(`[Category ${metadataField}] Rendering Async.Pending`);
              return <StillLoading />;
            })()}
          </Async.Pending>
          <Async.Rejected>
            {(error) => {
              console.log(`[Category ${metadataField}] Rendering Async.Rejected:`, error);
              return <ErrorLoading metadataField={metadataField} error={error} />;
            }}
          </Async.Rejected>
          <Async.Fulfilled persist>
            {(asyncProps: CategoryAsyncProps) => {
              console.log(`[Category ${metadataField}] Rendering Async.Fulfilled`);
              console.log(`[Category ${metadataField}] asyncProps:`, asyncProps);
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
              const isUserAnnotation =
                this.props.schema?.annotations.obsByName[metadataField]?.writable ??
                false;
              return (
                <CategoryRender
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
                  isUserAnnotation={isUserAnnotation}
                  onAddLabelClick={() => this.handleAddLabel(metadataField)}
                />
              );
            }}
          </Async.Fulfilled>
        </Async>
      </CategoryCrossfilterContext.Provider>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Category);

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
  metadataField: string;
  checkboxID: string;
  isColorAccessor: boolean;
  isExpanded: boolean;
  selectionState: string;
  onColorChangeClick: (isColorAccessor: boolean) => void;
  onCategoryMenuClick: () => void;
  onCategoryMenuKeyPress: (event: React.KeyboardEvent<HTMLSpanElement>) => void;
  onCategoryToggleAllClick: () => void;
  isUserAnnotation: boolean;
  onAddLabelClick: () => void;
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
    isUserAnnotation,
    onAddLabelClick,
  }: CategoryHeaderProps) => {
    /*
    Render category name and controls (eg, color-by button).
    */
    const checkboxRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = selectionState === "some";
      }
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
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- TODO: Need to separate expand and checkbox label */}
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
            tabIndex={0}
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
                tabIndex={-1}
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
          {isUserAnnotation ? (
            <Tooltip
              content="Add label"
              position={Position.LEFT}
              usePortal
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
            >
              <Button
                data-testid={`${metadataField}:add-label`}
                icon="plus"
                minimal
                small
                onClick={onAddLabelClick}
              />
            </Tooltip>
          ) : null}
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

interface CategoryRenderProps {
  metadataField: string;
  checkboxID: string;
  isColorAccessor: boolean;
  isExpanded: boolean;
  selectionState: string;
  categoryData: Dataframe;
  categorySummary: ReturnType<typeof createCategorySummaryFromDfCol>;
  colorAccessor: string | null;
  colorData: Dataframe | null;
  colorTable: ColorTable;
  onColorChangeClick: (isColorAccessor: boolean) => void;
  onCategoryMenuClick: () => void;
  onCategoryMenuKeyPress: (event: React.KeyboardEvent<HTMLSpanElement>) => void;
  onCategoryToggleAllClick: () => void;
  colorMode: string;
  isCellGuideCxg: boolean;
  isUserAnnotation: boolean;
  onAddLabelClick: () => void;
}

const CategoryRender = React.memo(
  ({
    metadataField,
    checkboxID,
    isColorAccessor,
    isExpanded,
    selectionState,
    categoryData,
    categorySummary,
    colorAccessor,
    colorData,
    colorTable,
    onColorChangeClick,
    onCategoryMenuClick,
    onCategoryMenuKeyPress,
    onCategoryToggleAllClick,
    colorMode,
    isCellGuideCxg,
    isUserAnnotation,
    onAddLabelClick,
  }: CategoryRenderProps) => {
    /*
    Render the core of the category, including checkboxes, controls, etc.
    */
    const { numCategoryValues } = categorySummary;
    const isSingularValue = numCategoryValues === 1;

    if (isSingularValue && !isCellGuideCxg && !isUserAnnotation) {
      /*
      Entire category has a single value, special case.
      But always show user annotations even with single value so users can add labels.
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
            isUserAnnotation={isUserAnnotation}
            onAddLabelClick={onAddLabelClick}
          />
        </div>
        {isUserAnnotation ? (
          <AddLabelDialog metadataField={metadataField} />
        ) : null}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  metadataField: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  categoryData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  categorySummary: any;
  colorAccessor: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  colorData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
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
          <CategoryValue
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
