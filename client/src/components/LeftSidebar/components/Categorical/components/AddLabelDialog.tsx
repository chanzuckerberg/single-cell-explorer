import React from "react";
import { connect } from "react-redux";

import { AnnoDialog } from "components/AnnoDialog/AnnoDialog";
import { LabelInputWithSuggestions } from "components/LabelInput/LabelInputWithSuggestions";
import actions from "actions";
import type { RootState, AppDispatch } from "reducers";
import type { Schema } from "common/types/schema";
import {
  labelPrompt,
  isLabelErroneous,
} from "./Category/components/CategoryValue/labelUtil";

interface OwnProps {
  metadataField: string;
}

interface StateProps {
  annotations: RootState["annotations"];
  schema?: Schema;
  obsCrossfilter: RootState["obsCrossfilter"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}

interface ComponentState {
  newLabelText: string;
}

type Props = OwnProps & StateProps & DispatchProps;

class AddLabelDialog extends React.PureComponent<Props, ComponentState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      newLabelText: "",
    };
  }

  handleClose = () => {
    const { dispatch } = this.props;
    this.setState({ newLabelText: "" });
    dispatch({ type: "annotation: disable add new label mode" });
  };

  handleChange = (value: string) => {
    this.setState({ newLabelText: value });
  };

  handleCreate = async (assignSelected: boolean) => {
    const { dispatch, metadataField } = this.props;
    const { newLabelText } = this.state;
    const trimmed = newLabelText.trim();
    if (!trimmed || this.labelNameError(trimmed)) return;
    await dispatch(
      actions.annotationCreateLabelInCategory(
        metadataField,
        trimmed,
        assignSelected
      )
    );
    this.handleClose();
  };

  labelNameError = (labelName: string): boolean | string => {
    const { metadataField, schema } = this.props;
    if (!schema) return "invalid";
    return isLabelErroneous(labelName, metadataField, schema);
  };

  render(): JSX.Element | null {
    const { annotations, metadataField, obsCrossfilter } = this.props;
    const { newLabelText } = this.state;

    const isActive =
      annotations.isAddingNewLabel &&
      annotations.categoryAddingNewLabel === metadataField;
    if (!isActive) return null;

    const selectedCount = obsCrossfilter?.countSelected?.() ?? 0;
    const validationError = this.labelNameError(newLabelText);

    return (
      <AnnoDialog
        isActive={isActive}
        title="Add new label to category"
        instruction={labelPrompt(validationError, "New, unique label", ":")}
        cancelTooltipContent="Close this dialog without adding a label."
        primaryButtonText="Add label"
        secondaryButtonText={`Add label & assign ${selectedCount} selected cells`}
        handleSecondaryButtonSubmit={() => this.handleCreate(true)}
        text={newLabelText}
        validationError={validationError}
        handleSubmit={() => this.handleCreate(false)}
        handleCancel={this.handleClose}
        annoInput={
          <LabelInputWithSuggestions
            onChange={(value) => this.handleChange(value)}
            inputProps={{
              "data-testid": `${metadataField}:new-label-name`,
              leftIcon: "tag",
              intent: "none",
              autoFocus: true,
            }}
          />
        }
        annoSelect={null}
      />
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => ({
  annotations: state.annotations,
  schema: state.annoMatrix?.schema,
  obsCrossfilter: state.obsCrossfilter,
});

export default connect(mapStateToProps)(AddLabelDialog);
