import React from "react";
import { AnchorButton, Tooltip, Position } from "@blueprintjs/core";
import { connect } from "react-redux";
import * as globals from "../../globals";
import Category from "./category";
import { STANDARD_CATEGORY_NAMES } from "../../common/types/entities";
import { Schema } from "../../common/types/schema";
import Collapse from "../../util/collapse";
import { AnnotationsHelpers, ControlsHelpers } from "../../util/stateManager";
import AnnoDialog from "../annoDialog";
import AnnoSelect from "./annoSelect";
import LabelInput from "../labelInput";
import { labelPrompt } from "./labelUtil";
import actions from "../../actions";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type State = any;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => ({
  writableCategoriesEnabled:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    (state as any).config?.parameters?.annotations ?? false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  schema: (state as any).annoMatrix?.schema,
}))
// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class Categories extends React.Component<{}, State> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
  constructor(props: {}) {
    super(props);
    this.state = {
      createAnnoModeActive: false,
      newCategoryText: "",
      categoryToDuplicate: null,
      expandedCats: new Set(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleCreateUserAnno = (e: any) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch } = this.props;
    const { newCategoryText, categoryToDuplicate } = this.state;
    dispatch(
      actions.annotationCreateCategoryAction(
        newCategoryText,
        categoryToDuplicate
      )
    );
    this.setState({
      createAnnoModeActive: false,
      categoryToDuplicate: null,
      newCategoryText: "",
    });
    e.preventDefault();
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleEnableAnnoMode = () => {
    track(EVENTS.EXPLORER_OPEN_CREATE_GENESET_DIALOG_BUTTON_CLICKED);

    this.setState({ createAnnoModeActive: true });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleDisableAnnoMode = () => {
    this.setState({
      createAnnoModeActive: false,
      categoryToDuplicate: null,
      newCategoryText: "",
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleModalDuplicateCategorySelection = (d: any) => {
    this.setState({ categoryToDuplicate: d });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  categoryNameError = (name: any) => {
    /*
        return false if this is a LEGAL/acceptable category name or NULL/empty string,
        or return an error type.
        */
    /* allow empty string */
    if (name === "") return false;
    /*
        test for uniqueness against *all* annotation names, not just the subset
        we render as categorical.
        */
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'schema' does not exist on type 'Readonly... Remove this comment to see the full error message
    const { schema } = this.props;
    const allCategoryNames = schema.annotations.obs.columns.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      (c: any) => c.name
    );
    /* check category name syntax */
    const error = AnnotationsHelpers.annotationNameIsErroneous(name);
    if (error) {
      return error;
    }
    /* disallow duplicates */
    if (allCategoryNames.indexOf(name) !== -1) {
      return "duplicate";
    }
    /* otherwise, no error */
    return false;
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleChange = (name: any) => {
    this.setState({ newCategoryText: name });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleSelect = (name: any) => {
    this.setState({ newCategoryText: name });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  instruction = (name: any) =>
    labelPrompt(this.categoryNameError(name), "New, unique category name", ":");

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  onExpansionChange = (catName: any) => {
    const { expandedCats } = this.state;
    if (expandedCats.has(catName)) {
      const _expandedCats = new Set(expandedCats);
      _expandedCats.delete(catName);
      this.setState({ expandedCats: _expandedCats });
    } else {
      const _expandedCats = new Set(expandedCats);
      _expandedCats.add(catName);
      this.setState({ expandedCats: _expandedCats });
    }
  };

  /**
   * Determine if category name is an ontology key.
   * @param catName - Name of category.
   * @returns True if category name includes ontology key.
   */
  isCategoryNameOntologyKey = (catName: string): boolean =>
    catName.includes(globals.ONTOLOGY_KEY);

  /**
   * Categories are included for display if category has more than one category value or categories are not defined
   * (for the case where category is a string or boolean type).
   * @param schema - Matrix schema.
   * @param catName - Name of category.
   * @returns True if category has more than one category value or categories are not defined.
   */
  isCategoryDisplayable = (schema: Schema, catName: string): boolean => {
    const columnSchema = schema.annotations.obsByName[catName];
    // Always display string and boolean types.
    if (!("categories" in columnSchema)) {
      return true;
    }
    // Only display categoricals if they have more than one value.
    return columnSchema.categories.length > 1;
  };

  /**
   * Determine if category is standard.
   * @param catName - Name of category.
   * @returns True if given category name is in the set of standard category names.
   */
  isCategoryNameStandard = (catName: string): boolean =>
    STANDARD_CATEGORY_NAMES.includes(catName);

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
    const {
      createAnnoModeActive,
      categoryToDuplicate,
      newCategoryText,
      expandedCats,
    } = this.state;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'writableCategoriesEnabled' does not exis... Remove this comment to see the full error message
    const { writableCategoriesEnabled, schema } = this.props;
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
        <AnnoDialog
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ isActive: any; title: string; instruction:... Remove this comment to see the full error message
          isActive={createAnnoModeActive}
          title="Create new category"
          instruction={this.instruction(newCategoryText)}
          cancelTooltipContent="Close this dialog without creating a category."
          primaryButtonText="Create new category"
          primaryButtonProps={{ "data-testid": "submit-category" }}
          text={newCategoryText}
          validationError={this.categoryNameError(newCategoryText)}
          handleSubmit={this.handleCreateUserAnno}
          handleCancel={this.handleDisableAnnoMode}
          annoInput={
            <LabelInput
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ labelSuggestions: null; onChange: (name: a... Remove this comment to see the full error message
              labelSuggestions={null}
              onChange={this.handleChange}
              onSelect={this.handleSelect}
              inputProps={{
                "data-testid": "new-category-name",
                leftIcon: "tag",
                intent: "none",
                autoFocus: true,
              }}
              newLabelMessage="New category"
            />
          }
          annoSelect={
            <AnnoSelect
              // @ts-expect-error ts-migrate(2322) FIXME: Type '{ handleModalDuplicateCategorySelection: (d:... Remove this comment to see the full error message
              handleModalDuplicateCategorySelection={
                this.handleModalDuplicateCategorySelection
              }
              categoryToDuplicate={categoryToDuplicate}
              allCategoryNames={selectableCategoryNames}
            />
          }
        />
        {writableCategoriesEnabled ? (
          <div style={{ marginBottom: 10 }}>
            <Tooltip
              content="Create a new category"
              position={Position.RIGHT}
              boundary="viewport"
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
              modifiers={{
                preventOverflow: { enabled: false },
                hide: { enabled: false },
              }}
            >
              <AnchorButton
                type="button"
                data-testid="open-annotation-dialog"
                onClick={this.handleEnableAnnoMode}
                intent="primary"
              >
                Create new <strong>category</strong>
              </AnchorButton>
            </Tooltip>
          </div>
        ) : null}
        {/* STANDARD FIELDS */}
        {/* this is duplicative but flat, could be abstracted */}
        {standardCategoryNames.length ? (
          <Collapse>
            <span>Standard Categories</span>
            {standardCategoryNames.map((catName: string) => (
              <Category
                key={catName}
                // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                metadataField={catName}
                onExpansionChange={this.onExpansionChange}
                isExpanded={expandedCats.has(catName)}
                createAnnoModeActive={createAnnoModeActive}
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
                // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                metadataField={catName}
                onExpansionChange={this.onExpansionChange}
                isExpanded={expandedCats.has(catName)}
                createAnnoModeActive={createAnnoModeActive}
                categoryType="author"
              />
            ))}
          </Collapse>
        ) : null}
      </div>
    );
  }
}

export default Categories;
