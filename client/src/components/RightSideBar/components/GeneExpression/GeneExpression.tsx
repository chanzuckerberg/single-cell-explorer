import React from "react";
import { connect } from "react-redux";
import { Button, H4, H5, Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { track } from "analytics";
import { EVENTS } from "analytics/events";
import { Dataframe } from "util/dataframe";

import { GeneSet } from "./components/GeneSet/GeneSet";
import { QuickGene } from "./components/QuickGene/QuickGene";
import { CreateGenesetDialogue } from "./components/CreateGenesetDialogue/CreateGenesetDialogue";

import * as globals from "~/globals";
import { MARKER_GENE_SUFFIX_IDENTIFIER } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type State = any;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState) => ({
  genesets: state.genesets.genesets,
  annoMatrix: state.annoMatrix,
  isCellGuideCxg: state.controls.isCellGuideCxg,
  infoPanelMinimized: state.controls.infoPanelMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
}))
// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class GeneExpression extends React.Component<{}, State> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
  constructor(props: {}) {
    super(props);
    this.state = {
      geneSetsExpanded: true,
      markerGeneSetsExpanded: false,
      geneIds: null,
      geneNames: null,
    };
  }

  async componentDidMount(): Promise<void> {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'annoMatrix' does not exist on type 'Readon... Remove this comment to see the full error message
    const { annoMatrix } = this.props;

    const { schema } = annoMatrix || {};

    if (!schema) return;

    const varIndex = schema.annotations.var.index;
    const varLabel = "feature_name";

    const dfIds: Dataframe = await annoMatrix.fetch("var", varIndex);

    const varColumns = annoMatrix.getMatrixColumns("var");

    // This is a fallback in case the varLabel is not available.
    const labelToUse = varColumns.includes(varLabel) ? varLabel : varIndex;

    const dfNames: Dataframe = await annoMatrix.fetch("var", labelToUse);

    this.setState({
      geneIds: dfIds.col(varIndex).asArray(),
      geneNames: dfNames.col(labelToUse).asArray(),
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  renderGeneSets = (getMarkerGeneSets: boolean) => {
    const sets = [];
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'genesets' does not exist on type 'Readon... Remove this comment to see the full error message
    const { genesets, isCellGuideCxg } = this.props;
    const { geneIds, geneNames } = this.state;

    for (const [name, geneset] of genesets) {
      /**
       * This conditional checks if the current geneset should be displayed based on the following criteria:
       * 1. If the geneset name does not include MARKER_GENE_SUFFIX_IDENTIFIER, it's not a marker geneset and we're not
       * looking for marker genesets,and it's a CellGuide CXG dataset, then it should be displayed.
       * This yields non-marker genesets in CellGuide Explorer instances.
       *
       * 2. If the geneset name includes MARKER_GENE_SUFFIX_IDENTIFIER, it's a marker geneset and we're looking for marker
       * genesets, and it's a CellGuide CXG dataset, then it should be displayed.
       * This yields marker genesets in CellGuide Explorer instances.
       *
       * 3. If it's not a CellGuide CXG dataset, then there's no filtering or grouping based on geneset type,
       * so it should be displayed.
       * This is the behavior for genesets in non-CellGuide Explorer instances.
       */
      const isMarkerGeneSet = name.includes(MARKER_GENE_SUFFIX_IDENTIFIER);

      const condition1 =
        !isMarkerGeneSet && !getMarkerGeneSets && isCellGuideCxg;
      const condition2 = isMarkerGeneSet && getMarkerGeneSets && isCellGuideCxg;
      const condition3 = !isCellGuideCxg;

      if (condition1 || condition2 || condition3) {
        const genesetIds = [];
        const genesetNames = [];
        const displayName = name.replace(MARKER_GENE_SUFFIX_IDENTIFIER, "");
        const updatedGenes = new Map();

        // find ensembl IDs for each gene in the geneset
        for (const [geneName, geneData] of geneset.genes) {
          const geneId = geneIds
            ? geneIds[geneNames.indexOf(geneName)] || ""
            : "";

          if (geneId) {
            updatedGenes.set(geneId, geneData);
            genesetIds.push(geneId);
            genesetNames.push(geneName);
          } else {
            console.warn(`No ID found for gene: ${geneName}`);
          }
        }

        sets.push(
          <GeneSet
            key={name}
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ key: any; setGenes: any; setName: any; gen... Remove this comment to see the full error message
            setGenes={updatedGenes}
            setName={name}
            displayName={displayName}
            genesetDescription={geneset.genesetDescription}
            geneIds={genesetIds}
            geneNames={genesetNames}
          />
        );
      }
    }
    if (getMarkerGeneSets) {
      sets.sort((a, b) => a.props.setName.localeCompare(b.props.setName));
    }
    return sets;
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleActivateCreateGenesetMode = () => {
    track(EVENTS.EXPLORER_OPEN_CREATE_GENESET_DIALOG_BUTTON_CLICKED);

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch } = this.props;
    const { geneSetsExpanded } = this.state;
    dispatch({ type: "geneset: activate add new geneset mode" });
    if (!geneSetsExpanded) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      this.setState((state: any) => ({ ...state, geneSetsExpanded: true }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleExpandGeneSets = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    this.setState((state: any) => {
      if (!state.geneSetsExpanded) {
        track(EVENTS.EXPLORER_GENESET_HEADING_EXPAND_BUTTON_CLICKED);
      }

      return {
        ...state,
        geneSetsExpanded: !state.geneSetsExpanded,
      };
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleExpandMarkerGeneSets = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    this.setState((state: any) => {
      if (!state.markerGeneSetsExpanded) {
        track(EVENTS.EXPLORER_CG_MARKER_GENE_SETS_HEADING_EXPANDED);
      }

      return {
        ...state,
        markerGeneSetsExpanded: !state.markerGeneSetsExpanded,
      };
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isCellGuideCxg' does not exist on type 'Readon... Remove this comment to see the full error message
    const { isCellGuideCxg, infoPanelMinimized, infoPanelHidden } = this.props;
    const { geneSetsExpanded, markerGeneSetsExpanded } = this.state;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "start",
          padding: globals.rightSidebarSectionPadding,
          height: "50%",
          overflowY: infoPanelMinimized || infoPanelHidden ? "visible" : "auto",
        }}
      >
        <QuickGene />
        <div>
          <div
            data-chromatic="ignore"
            className="chromatic-ignore"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <H4
              role="menuitem"
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number | ... Remove this comment to see the full error message
              tabIndex="0"
              data-testid="geneset-heading-expand"
              data-chromatic="ignore"
              onKeyPress={this.handleExpandGeneSets}
              style={{
                cursor: "pointer",
              }}
              onClick={this.handleExpandGeneSets}
            >
              Gene Sets{" "}
              {geneSetsExpanded ? (
                <Icon icon={IconNames.CHEVRON_DOWN} />
              ) : (
                <Icon icon={IconNames.CHEVRON_RIGHT} />
              )}
            </H4>

            <div style={{ marginBottom: 10, position: "relative", top: -2 }}>
              <Button
                data-testid="open-create-geneset-dialog"
                onClick={this.handleActivateCreateGenesetMode}
                intent="primary"
              >
                Create new
              </Button>
            </div>
          </div>
          <CreateGenesetDialogue />
        </div>

        {geneSetsExpanded && <div>{this.renderGeneSets(false)}</div>}
        {isCellGuideCxg && (
          <>
            <H5
              role="menuitem"
              data-testid="cellguide-marker-geneset-heading-expand"
              onKeyPress={this.handleExpandMarkerGeneSets}
              style={{
                cursor: "pointer",
              }}
              onClick={this.handleExpandMarkerGeneSets}
            >
              Marker Gene Sets{" "}
              {markerGeneSetsExpanded ? (
                <Icon icon={IconNames.CHEVRON_DOWN} />
              ) : (
                <Icon icon={IconNames.CHEVRON_RIGHT} />
              )}
            </H5>
            {markerGeneSetsExpanded && <div>{this.renderGeneSets(true)}</div>}
          </>
        )}
      </div>
    );
  }
}

export default GeneExpression;
