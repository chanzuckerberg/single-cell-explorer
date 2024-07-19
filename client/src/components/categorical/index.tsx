import React from "react";
import { connect } from "react-redux";
import * as globals from "../../globals";
import Category from "./category";
import {
  EXCLUDED_CATEGORY_NAMES,
  STANDARD_CATEGORY_NAMES,
} from "../../common/types/entities";
import {
  CategoricalAnnotationColumnSchema,
  Schema,
} from "../../common/types/schema";
import Collapse from "../../util/collapse";
import { ControlsHelpers } from "../../util/stateManager";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { CATEGORICAL_SECTION_TEST_ID } from "./constants";
import { RootState } from "../../reducers";
import { toggleCategoryExpansion } from "../../actions/controls";
import { Props, StateProps } from "./types";

class Categories extends React.Component<Props> {
  onExpansionChange = async (catName: string) => {
    const { expandedCategories, dispatch } = this.props;

    const isExpanding = !expandedCategories.includes(catName);

    if (isExpanding) {
      track(EVENTS.EXPLORER_CATEGORY_EXPAND_BUTTON_CLICKED);
    }

    await dispatch(toggleCategoryExpansion(catName, isExpanding));
  };

  /**
   * Determine if category name is an ontology key.
   * @param catName - Name of category.
   * @returns True if category exists in ontology term id list.
   */
  isCategoryNameOntologyKey = (catName: string): boolean =>
    globals.ONTOLOGY_TERM_ID_KEYS.some((key: string) => catName.includes(key));

  /**
   * Categories are included for display if category has more than one category value or categories are not defined
   * (for the case where category is a string or boolean type).
   * @param schema - Matrix schema.
   * @param catName - Name of category.
   * @returns True if category has more than one category value or categories are not defined.
   */
  isCategoryDisplayable = (
    schema: Schema | undefined,
    catName: string
  ): boolean => {
    if (!schema) return false;

    const { isCellGuideCxg } = this.props;

    const columnSchema = schema.annotations.obsByName[catName];
    // Always display string and boolean types.
    if (!("categories" in columnSchema)) {
      return true;
    }
    // Only display categoricals if they have more than one value.
    return (
      (columnSchema as CategoricalAnnotationColumnSchema).categories.length >
        1 || isCellGuideCxg
    );
  };

  /**
   * Determine if category is standard.
   * @param catName - Name of category.
   * @returns True if given category name is in the set of standard category names.
   */
  isCategoryNameStandard = (catName: string): boolean => {
    const { isCellGuideCxg } = this.props;
    // if isCellGuideCxg is true, then all categories are standard
    return STANDARD_CATEGORY_NAMES.includes(catName) || isCellGuideCxg;
  };

  /**
   * Determine if category is excluded.
   * @param catName - Name of category.
   * @returns True if given category name is in the set of standard category names.
   */
  isCategoryNameExcluded = (catName: string): boolean =>
    EXCLUDED_CATEGORY_NAMES.includes(catName);

  /**
   * Returns true if category is writable.
   * @param schema - Matrix schema.
   * @param catName - Name of category.
   * @returns True if category is marked as writable.
   */
  isCategoryWritable = (schema: Schema | undefined, catName: string): boolean =>
    schema?.annotations.obsByName[catName].writable || false;

  render() {
    const { schema, isCellGuideCxg, expandedCategories } = this.props;

    /* Names for categorical, string and boolean types, sorted in display order.  Will be rendered in this order */
    const selectableCategoryNames = ControlsHelpers.selectableCategoryNames(
      schema
    )
      .filter((catName) => !this.isCategoryNameOntologyKey(catName)) // Ontology keys are not selectable
      .sort();

    // Filter author categories for display; must be non-standard category name, selectable or writable.
    const authorCategoryNames = selectableCategoryNames.filter(
      (catName) =>
        !this.isCategoryNameStandard(catName) &&
        !this.isCategoryNameExcluded(catName) &&
        (this.isCategoryDisplayable(schema, catName) ||
          this.isCategoryWritable(schema, catName))
    );

    // Filter standard categories for display; must be standard name and selectable.
    const standardCategoryNames = selectableCategoryNames.filter(
      (catName) =>
        this.isCategoryNameStandard(catName) &&
        this.isCategoryDisplayable(schema, catName)
    );
    return (
      <div
        data-testid={CATEGORICAL_SECTION_TEST_ID}
        style={{
          padding: globals.leftSidebarSectionPadding,
          paddingBottom: 0,
        }}
      >
        {isCellGuideCxg ? (
          <>
            {standardCategoryNames.length &&
              standardCategoryNames.map((catName: string) => (
                <Category
                  key={catName}
                  metadataField={catName}
                  onExpansionChange={this.onExpansionChange}
                  isExpanded={expandedCategories.includes(catName)}
                  categoryType="standard"
                />
              ))}
          </>
        ) : (
          <>
            {/* STANDARD FIELDS */}
            {/* this is duplicative but flat, could be abstracted */}
            {standardCategoryNames.length ? (
              <Collapse>
                <span>Standard Categories</span>
                {standardCategoryNames.map((catName: string) => (
                  <Category
                    key={catName}
                    metadataField={catName}
                    onExpansionChange={this.onExpansionChange}
                    isExpanded={expandedCategories.includes(catName)}
                    categoryType="standard"
                  />
                ))}
              </Collapse>
            ) : null}

            {/* AUTHOR FIELDS */}
            {authorCategoryNames.length ? (
              <Collapse>
                <span>Author Categories</span>
                {authorCategoryNames.map((catName: string) => (
                  <Category
                    key={catName}
                    metadataField={catName}
                    onExpansionChange={this.onExpansionChange}
                    isExpanded={expandedCategories.includes(catName)}
                    categoryType="author"
                  />
                ))}
              </Collapse>
            ) : null}
          </>
        )}
      </div>
    );
  }
}

function mapStateToProps(state: RootState): StateProps {
  return {
    schema: state.annoMatrix?.schema,
    isCellGuideCxg: state.controls.isCellGuideCxg,
    expandedCategories: state.controls.expandedCategories,
  };
}

export default connect(mapStateToProps)(Categories);
