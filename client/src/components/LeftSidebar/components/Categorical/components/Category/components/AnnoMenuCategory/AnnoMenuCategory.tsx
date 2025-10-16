import React from "react";
import { connect } from "react-redux";
import {
  Button,
  Menu,
  MenuItem,
  Popover,
  Position,
  Tooltip,
  Icon,
  PopoverInteractionKind,
  Intent,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import actions from "actions";
import type { RootState, AppDispatch } from "reducers";
import * as globals from "~/globals";

interface OwnProps {
  metadataField: string;
  createText: string;
  editText: string;
  deleteText: string;
}

interface StateProps {
  annotations: RootState["annotations"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}

type Props = OwnProps & StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => ({
  annotations: state.annotations,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

class AnnoMenuCategory extends React.PureComponent<Props> {
  activateAddNewLabelMode = () => {
    const { dispatch, metadataField } = this.props;
    dispatch({
      type: "annotation: activate add new label mode",
      data: metadataField,
    });
  };

  activateEditCategoryMode = () => {
    const { dispatch, metadataField } = this.props;

    dispatch({
      type: "annotation: activate category edit mode",
      data: metadataField,
    });
  };

  handleDeleteCategory = () => {
    const { dispatch, metadataField } = this.props;
    dispatch(actions.annotationDeleteCategoryAction(metadataField));
  };

  render(): JSX.Element {
    const { metadataField, annotations, createText, editText, deleteText } =
      this.props;

    return (
      <>
        <Tooltip
          content={createText}
          position="bottom"
          hoverOpenDelay={globals.tooltipHoverOpenDelay}
        >
          <Button
            style={{ marginLeft: 0, marginRight: 2 }}
            data-testid={`${metadataField}:add-new-label-to-category`}
            icon={<Icon icon="plus" iconSize={10} />}
            onClick={this.activateAddNewLabelMode}
            small
            minimal
          />
        </Tooltip>
        <Popover
          interactionKind={PopoverInteractionKind.HOVER}
          position={Position.RIGHT_TOP}
          content={
            <Menu>
              <MenuItem
                icon="edit"
                disabled={annotations.isEditingCategoryName}
                data-testid={`${metadataField}:edit-category-mode`}
                onClick={this.activateEditCategoryMode}
                text={editText}
              />
              <MenuItem
                icon={IconNames.TRASH}
                intent={Intent.DANGER}
                data-testid={`${metadataField}:delete-category`}
                onClick={this.handleDeleteCategory}
                text={deleteText}
              />
            </Menu>
          }
        >
          <Button
            style={{ marginLeft: 0, marginRight: 5 }}
            data-testid={`${metadataField}:see-actions`}
            icon={<Icon icon="more" iconSize={10} />}
            small
            minimal
          />
        </Popover>
      </>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AnnoMenuCategory);
