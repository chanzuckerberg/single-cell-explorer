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

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type State = any;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  schema: (state as any).annoMatrix?.schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  isCellGuideCxg: (state as any).controls.isCellGuideCxg,
}))
// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class Categories extends React.Component<{}, State> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
  constructor(props: {}) {
    super(props);
    this.state = {
      expandedCats: new Set(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleChange = (name: any) => {
    // eslint-disable-next-line react/no-unused-state --- FIXME: disabled temporarily
    this.setState({ newCategoryText: name });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleSelect = (name: any) => {
    // eslint-disable-next-line react/no-unused-state --- FIXME: disabled temporarily
    this.setState({ newCategoryText: name });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  onExpansionChange = (catName: any) => {
    const { expandedCats } = this.state;
    if (expandedCats.has(catName)) {
      const _expandedCats = new Set(expandedCats);
      _expandedCats.delete(catName);
      this.setState({ expandedCats: _expandedCats });
    } else {
      track(EVENTS.EXPLORER_CATEGORY_EXPAND_BUTTON_CLICKED);
      const _expandedCats = new Set(expandedCats);
      _expandedCats.add(catName);
      this.setState({ expandedCats: _expandedCats });
    }
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
  isCategoryDisplayable = (schema: Schema, catName: string): boolean => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'schema' does not exis... Remove this comment to see the full error message
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'schema' does not exis... Remove this comment to see the full error message
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
  isCategoryWritable = (schema: Schema, catName: string): boolean =>
    schema.annotations.obsByName[catName].writable;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    const { expandedCats } = this.state;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'schema' does not exis... Remove this comment to see the full error message
    const { schema, isCellGuideCxg } = this.props;

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
                  isExpanded={expandedCats.has(catName)}
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
                    isExpanded={expandedCats.has(catName)}
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
                    isExpanded={expandedCats.has(catName)}
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

export default Categories;
