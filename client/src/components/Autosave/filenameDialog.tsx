import React from "react";
import { connect } from "react-redux";
import {
  Button,
  Classes,
  Code,
  Colors,
  Dialog,
  InputGroup,
  Tooltip,
} from "@blueprintjs/core";

import type { RootState, AppDispatch } from "reducers";

interface StateProps {
  idhash: string | null;
  annotations: RootState["annotations"];
  writableCategoriesEnabled: boolean;
  writableGenesetsEnabled: boolean;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

interface ComponentState {
  filenameText: string;
}

type Props = StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => {
  const idhashValue =
    state.config?.parameters?.["annotations-user-data-idhash"];
  const idhash = typeof idhashValue === "string" ? idhashValue : null;

  return {
    idhash,
    annotations: state.annotations,
    writableCategoriesEnabled: !!state.config?.parameters?.annotations,
    writableGenesetsEnabled: !(
      state.config?.parameters?.annotations_genesets_readonly ?? true
    ),
  };
};

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

class FilenameDialog extends React.PureComponent<Props, ComponentState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      filenameText: "",
    };
  }

  dismissFilenameDialog = (): void => {
    // Intentionally noop for now; dialog stays open until user provides a name
  };

  handleCreateFilename = (): void => {
    const { dispatch } = this.props;
    const { filenameText } = this.state;

    dispatch({
      type: "set annotations collection name",
      data: filenameText,
    });
  };

  filenameError(): "empty_string" | "characters" | false {
    const legalNames = /^\w+$/;
    const { filenameText } = this.state;

    if (filenameText === "") {
      return "empty_string";
    }
    if (!legalNames.test(filenameText)) {
      return "characters";
    }
    return false;
  }

  filenameErrorMessage(): JSX.Element | null {
    const error = this.filenameError();
    if (error === "empty_string") {
      return (
        <span
          style={{
            fontStyle: "italic",
            fontSize: 12,
            marginTop: 5,
            color: Colors.ORANGE3,
          }}
        >
          Name cannot be blank
        </span>
      );
    }
    if (error === "characters") {
      return (
        <span
          style={{
            fontStyle: "italic",
            fontSize: 12,
            marginTop: 5,
            color: Colors.ORANGE3,
          }}
        >
          Only alphanumeric and underscore allowed
        </span>
      );
    }
    return null;
  }

  render(): JSX.Element | null {
    const {
      writableCategoriesEnabled,
      writableGenesetsEnabled,
      annotations,
      idhash,
    } = this.props;
    const { filenameText } = this.state;
    if (
      !(writableCategoriesEnabled || writableGenesetsEnabled) ||
      !annotations.promptForFilename ||
      annotations.dataCollectionNameIsReadOnly ||
      annotations.dataCollectionName
    ) {
      return null;
    }

    const error = this.filenameError();

    return (
      <Dialog
        icon="tag"
        title="User Generated Data Directory"
        isOpen={!annotations.dataCollectionName}
        onClose={this.dismissFilenameDialog}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!error) this.handleCreateFilename();
          }}
        >
          <div className={Classes.DIALOG_BODY} data-testid="annotation-dialog">
            <div style={{ marginBottom: 20 }}>
              <p>Name your user generated data directory:</p>
              <InputGroup
                autoFocus
                value={filenameText}
                intent={error ? "warning" : "none"}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  this.setState({ filenameText: event.target.value })
                }
                leftIcon="tag"
                data-testid="new-annotation-name"
              />
              <p
                style={{
                  marginTop: 7,
                  visibility: error ? "visible" : "hidden",
                  color: Colors.ORANGE3,
                }}
              >
                {this.filenameErrorMessage()}
              </p>
            </div>
            <div>
              <p>
                {"Your annotations are stored in this file: "}
                <Code>
                  {filenameText || "<name>"}-cell-labels-{idhash}.csv
                </Code>
              </p>
              <p>
                {"Your gene sets are stored in this file: "}
                <Code>
                  {filenameText || "<name>"}-gene-sets-{idhash}.csv
                </Code>
              </p>
              <p style={{ fontStyle: "italic" }}>
                (We added a unique ID to your filename)
              </p>
            </div>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Tooltip content="Cancel naming collection">
                <Button onClick={this.dismissFilenameDialog}>Cancel</Button>
              </Tooltip>
              <Button
                disabled={!filenameText || Boolean(error)}
                onClick={this.handleCreateFilename}
                intent="primary"
                type="submit"
                data-testid="submit-annotation"
              >
                Create user generated data directory
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(FilenameDialog);
