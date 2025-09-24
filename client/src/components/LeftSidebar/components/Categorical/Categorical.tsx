import React from "react";
import { connect } from "react-redux";
import { AnchorButton, Tooltip, Position } from "@blueprintjs/core";
import {
  EXCLUDED_CATEGORY_NAMES,
  STANDARD_CATEGORY_NAMES,
} from "common/types/entities";
import { CategoricalAnnotationColumnSchema, Schema } from "common/types/schema";
import Collapse from "util/collapse";
import { ControlsHelpers, AnnotationsHelpers } from "util/stateManager";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { RootState } from "reducers";
import { toggleCategoryExpansion } from "actions/controls";
import actions from "actions";
import { AnnoDialog } from "components/AnnoDialog/AnnoDialog";
import { LabelInput } from "components/LabelInput/LabelInput";
import { labelPrompt } from "./components/Category/components/CategoryValue/labelUtil";
import Category from "./components/Category/Category";
import * as globals from "~/globals";
import { CATEGORICAL_SECTION_TEST_ID } from "./constants";
import { Props, StateProps } from "./types";

class Categorical extends React.Component<Props> {
  state = {
    createCategoryDialogOpen: false,
    newCategoryName: "",
  };

  handleOpenCreateCategory = () => {
    this.setState({ createCategoryDialogOpen: true, newCategoryName: "" });
  };

  handleCloseCreateCategory = () => {
    this.setState({ createCategoryDialogOpen: false, newCategoryName: "" });
  };

  handleCreateCategory = async () => {
    const { dispatch } = this.props;
    const { newCategoryName } = this.state;
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || this.categoryNameError(trimmedName)) return;
    await dispatch(actions.annotationCreateCategoryAction(trimmedName));
    this.handleCloseCreateCategory();
  };

  handleNewCategoryNameChange = (name: string) => {
    this.setState({ newCategoryName: name });
  };

  categoryNameError = (name: string): boolean | string => {
    if (name === "") return false;
    const { schema } = this.props;
    if (!schema) return "invalid";

    const error = AnnotationsHelpers.annotationNameIsErroneous(name);
    if (error) return error;

    const existingNames = schema.annotations.obs.columns.map((col) => col.name);
    if (existingNames.includes(name)) return "duplicate";

    return false;
  };
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
    const {
      schema,
      isCellGuideCxg,
      expandedCategories,
      writableCategoriesEnabled,
    } = this.props;
    const { createCategoryDialogOpen, newCategoryName } = this.state;

    /* Names for categorical, string and boolean types, sorted in display order.  Will be rendered in this order */
    const selectableCategoryNames = ControlsHelpers.selectableCategoryNames(
      schema
    )
      .filter((catName) => !this.isCategoryNameOntologyKey(catName)) // Ontology keys are not selectable
      .sort();

    const categoryNameError = this.categoryNameError(newCategoryName);

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
        {writableCategoriesEnabled ? (
          <>
            <AnnoDialog
              isActive={createCategoryDialogOpen}
              title="Create new category"
              instruction={labelPrompt(
                categoryNameError,
                "New, unique category name",
                ":"
              )}
              cancelTooltipContent="Close this dialog without creating a category."
              primaryButtonText="Create new category"
              primaryButtonProps={{ "data-testid": "submit-category" }}
              text={newCategoryName}
              validationError={categoryNameError}
              handleSubmit={this.handleCreateCategory}
              handleCancel={this.handleCloseCreateCategory}
              annoInput={
                <LabelInput
                  labelSuggestions={null}
                  onChange={(value) => this.handleNewCategoryNameChange(value)}
                  inputProps={{
                    "data-testid": "new-category-name",
                    leftIcon: "tag",
                    intent: "none",
                    autoFocus: true,
                  }}
                  newLabelMessage="New category"
                />
              }
              annoSelect={null}
            />
            <div style={{ marginBottom: 10 }}>
              <Tooltip
                content="Create a new category"
                position={Position.RIGHT}
                hoverOpenDelay={globals.tooltipHoverOpenDelay}
                modifiers={{
                  preventOverflow: { enabled: false },
                  hide: { enabled: false },
                }}
              >
                <AnchorButton
                  type="button"
                  intent="primary"
                  onClick={this.handleOpenCreateCategory}
                  data-testid="open-annotation-dialog"
                >
                  Create new <strong>category</strong>
                </AnchorButton>
              </Tooltip>
            </div>
          </>
        ) : null}

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
    writableCategoriesEnabled: !!state.config?.parameters?.annotations,
  };
}

export default connect(mapStateToProps)(Categorical);
