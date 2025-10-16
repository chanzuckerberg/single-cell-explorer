import React from "react";
import { connect } from "react-redux";
import { AnnotationsHelpers } from "util/stateManager";
import actions from "actions";
import type { RootState, AppDispatch } from "reducers";
import { AnnoDialog } from "../../../../../../../AnnoDialog/AnnoDialog";
import { LabelInput } from "../../../../../../../LabelInput/LabelInput";
import { labelPrompt } from "../CategoryValue/labelUtil";

interface OwnProps {
  metadataField: string;
}

interface StateProps {
  annotations: RootState["annotations"];
  schema?: RootState["annoMatrix"]["schema"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}

type Props = OwnProps & StateProps & DispatchProps;

interface ComponentState {
  newCategoryText: string;
}

const mapStateToProps = (state: RootState): StateProps => ({
  annotations: state.annotations,
  schema: state.annoMatrix?.schema,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

class AnnoDialogEditCategoryName extends React.PureComponent<
  Props,
  ComponentState
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      newCategoryText: props.metadataField,
    };
  }

  handleChangeOrSelect = (name: string) => {
    this.setState({
      newCategoryText: name,
    });
  };

  disableEditCategoryMode = () => {
    const { dispatch, metadataField } = this.props;
    dispatch({
      type: "annotation: disable category edit mode",
    });
    this.setState({ newCategoryText: metadataField });
  };

  handleEditCategory = (e: React.FormEvent) => {
    const { dispatch, metadataField, schema } = this.props;
    const { newCategoryText } = this.state;

    /*
    test for uniqueness against *all* annotation names, not just the subset
    we render as categorical.
    */
    if (!schema) return;

    const allCategoryNames = schema.annotations.obs.columns.map((c) => c.name);

    if (
      (allCategoryNames.indexOf(newCategoryText) > -1 &&
        newCategoryText !== metadataField) ||
      newCategoryText === ""
    ) {
      return;
    }

    this.disableEditCategoryMode();

    if (metadataField !== newCategoryText)
      dispatch(
        actions.annotationRenameCategoryAction(metadataField, newCategoryText)
      );
    e.preventDefault();
  };

  editedCategoryNameError = (name: string) => {
    const { metadataField, schema } = this.props;

    /* check for syntax errors in category name */
    const error = AnnotationsHelpers.annotationNameIsErroneous(name);
    if (error) {
      return error;
    }

    /* check for duplicative categories */

    /*
    test for uniqueness against *all* annotation names, not just the subset
    we render as categorical.
    */
    if (!schema) return false;

    const allCategoryNames = schema.annotations.obs.columns.map((c) => c.name);

    const categoryNameAlreadyExists = allCategoryNames.indexOf(name) > -1;
    const sameName = name === metadataField;
    if (categoryNameAlreadyExists && !sameName) {
      return "duplicate";
    }

    /* otherwise, no error */
    return false;
  };

  instruction = (name: string) =>
    labelPrompt(
      this.editedCategoryNameError(name),
      "New, unique category name",
      ":"
    );

  allCategoryNames() {
    const { schema } = this.props;
    if (!schema) return [];
    return schema.annotations.obs.columns.map((c) => c.name);
  }

  render(): JSX.Element {
    const { newCategoryText } = this.state;
    const { metadataField, annotations } = this.props;

    return (
      <>
        <AnnoDialog
          isActive={
            annotations.isEditingCategoryName &&
            annotations.categoryBeingEdited === metadataField
          }
          title="Edit category name"
          instruction={this.instruction(newCategoryText)}
          cancelTooltipContent="Close this dialog without editing this category."
          primaryButtonText="Edit category name"
          text={newCategoryText}
          validationError={this.editedCategoryNameError(newCategoryText)}
          handleSubmit={this.handleEditCategory}
          handleCancel={this.disableEditCategoryMode}
          annoInput={
            <LabelInput
              label={newCategoryText}
              labelSuggestions={null}
              onChange={this.handleChangeOrSelect}
              onSelect={this.handleChangeOrSelect}
              inputProps={{
                leftIcon: "tag",
                intent: "none",
                autoFocus: true,
              }}
              newLabelMessage="New category"
            />
          }
        />
      </>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AnnoDialogEditCategoryName);
