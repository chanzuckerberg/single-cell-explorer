import pull from "lodash.pull";
import uniq from "lodash.uniq";
import React from "react";
import { connect } from "react-redux";
import { Button, Dialog, Classes, Colors, Tooltip } from "@blueprintjs/core";

import actions from "actions";
import { LabelInput } from "components/LabelInput/LabelInput";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import type { RootState, AppDispatch } from "reducers";

interface StateProps {
  genesets: RootState["genesets"]["genesets"];
  genesetsUI: RootState["genesetsUI"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}

interface ComponentState {
  genesetName: string;
  genesToPopulateGeneset: string;
  genesetDescription: string;
  nameErrorMessage: string;
}

type Props = StateProps & DispatchProps;

class CreateGenesetDialogue extends React.PureComponent<Props, ComponentState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      genesetName: "",
      genesToPopulateGeneset: "",
      genesetDescription: "",
      nameErrorMessage: "",
    };
  }

  disableCreateGenesetMode = (event?: React.SyntheticEvent<HTMLElement>) => {
    const { dispatch } = this.props;
    this.setState({
      genesetName: "",
      genesToPopulateGeneset: "",
      genesetDescription: "",
      nameErrorMessage: "",
    });
    dispatch({ type: "geneset: disable create geneset mode" });
    event?.preventDefault();
  };

  createGeneset = (event: React.SyntheticEvent<HTMLElement>) => {
    const { dispatch } = this.props;
    const { genesetName, genesToPopulateGeneset, genesetDescription } =
      this.state;

    track(EVENTS.EXPLORER_ADD_GENE_SET);

    dispatch({
      type: "geneset: create",
      genesetName: genesetName.trim(),
      genesetDescription,
    });

    if (genesToPopulateGeneset) {
      const genesTmpHardcodedFormat = [] as Array<{ geneSymbol: string }>;
      const genesArrayFromString = pull(
        uniq(genesToPopulateGeneset.split(/[ ,]+/)),
        ""
      );
      genesArrayFromString.forEach((gene) => {
        genesTmpHardcodedFormat.push({ geneSymbol: gene });
      });
      dispatch(
        actions.genesetAddGenes(genesetName, genesTmpHardcodedFormat)
      ).catch(() => {
        /* ignore errors */
      });
    }

    dispatch({ type: "geneset: disable create geneset mode" });
    this.setState({
      genesetName: "",
      genesToPopulateGeneset: "",
    });
    event.preventDefault();
  };

  handleChange = (value: string) => {
    const { genesets } = this.props;
    this.setState({ genesetName: value });
    this.validate(value, genesets);
  };

  handleGenesetInputChange = (value: string) => {
    this.setState({ genesToPopulateGeneset: value });
  };

  handleDescriptionInputChange = (value: string) => {
    this.setState({ genesetDescription: value });
  };

  instruction = (genesetName: string, genesets: Map<string, unknown>) =>
    genesets.has(genesetName)
      ? "Gene set name must be unique."
      : "New, unique gene set name";

  validate = (genesetName: string, genesets: Map<string, unknown>) => {
    if (genesets.has(genesetName)) {
      this.setState({
        nameErrorMessage: "There is already a geneset with that name",
      });
      return false;
    }
    if (
      genesetName.length > 1 &&
      // unicode 32-126 (printable ASCII chars only)
      genesetName.match(/^[^\u0020-\u007E]|[ ]{2,}/g)?.length
    ) {
      this.setState({
        nameErrorMessage:
          "Gene set names can only contain alphanumeric characters and the following special characters: ! ” # $ % ’ ( ) * + , - . / : ; < = > ? @  ] ^ _ ` | ~",
      });
      return false;
    }
    this.setState({ nameErrorMessage: "" });
    return true;
  };

  render(): JSX.Element {
    const { genesetName, nameErrorMessage } = this.state;
    const { genesetsUI, genesets } = this.props;
    return (
      <Dialog
        icon="tag"
        title="Create gene set"
        isOpen={genesetsUI.createGenesetModeActive}
        onClose={this.disableCreateGenesetMode}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className={Classes.DIALOG_BODY}>
            <div style={{ marginBottom: 20 }}>
              <p>{this.instruction(genesetName, genesets)}</p>
              <LabelInput
                onChange={this.handleChange}
                inputProps={{
                  "data-testid": "create-geneset-input",
                  leftIcon: "manually-entered-data",
                  intent: "none",
                  autoFocus: true,
                }}
                newLabelMessage="Create gene set"
              />
              <p
                style={{
                  marginTop: 7,
                  visibility: nameErrorMessage !== "" ? "visible" : "hidden",
                  color: Colors.ORANGE3,
                }}
              >
                {nameErrorMessage}
              </p>
              <p style={{ marginTop: 20 }}>
                Optionally add a{" "}
                <span style={{ fontWeight: 700 }}>description</span> for this
                gene set
              </p>
              <LabelInput
                onChange={this.handleDescriptionInputChange}
                inputProps={{
                  "data-testid": "add-geneset-description",
                  intent: "none",
                  autoFocus: false,
                }}
                newLabelMessage="Add geneset description"
              />

              <p style={{ marginTop: 20 }}>
                Optionally add a list of comma separated{" "}
                <span style={{ fontWeight: 700 }}>genes</span> to populate the
                gene set
              </p>
              <LabelInput
                onChange={this.handleGenesetInputChange}
                inputProps={{
                  "data-testid": "add-genes",
                  intent: "none",
                  autoFocus: false,
                }}
                newLabelMessage="Populate geneset with genes"
              />
            </div>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Tooltip content="Close this dialog without creating a new gene set.">
                <Button onClick={this.disableCreateGenesetMode}>Cancel</Button>
              </Tooltip>
              <Button
                data-testid="submit-geneset"
                onClick={this.createGeneset}
                disabled={nameErrorMessage !== ""}
                intent="primary"
                type="submit"
              >
                Create gene set
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => ({
  genesets: state.genesets.genesets,
  genesetsUI: state.genesetsUI,
});

export default connect(mapStateToProps)(CreateGenesetDialogue);
