import React from "react";
import { connect } from "react-redux";
import { Spinner } from "@blueprintjs/core";

import actions from "actions";
import type { RootState, AppDispatch } from "reducers";
import type AnnoMatrix from "../../annoMatrix/annoMatrix";
import type { Genesets } from "../../reducers/genesets";
import FilenameDialog from "./filenameDialog";

interface StateProps {
  obsAnnotationSaveInProgress: boolean;
  genesetSaveInProgress: boolean;
  error: string | false;
  writableCategoriesEnabled: boolean;
  writableGenesetsEnabled: boolean;
  annoMatrix?: AnnoMatrix;
  genesets: Genesets;
  genesetsInitialized: boolean;
  lastSavedAnnoMatrix: AnnoMatrix | null;
  lastSavedGenesets: Genesets | null;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

interface AutosaveComponentState {
  timer: number | null;
}

type Props = StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => {
  return {
    obsAnnotationSaveInProgress:
      state.autosave?.obsAnnotationSaveInProgress ?? false,
    genesetSaveInProgress: state.autosave?.genesetSaveInProgress ?? false,
    error: state.autosave?.error ?? false,
    writableCategoriesEnabled: !!state.config?.parameters?.annotations,
    writableGenesetsEnabled: !(
      state.config?.parameters?.annotations_genesets_readonly ?? true
    ),
    annoMatrix: state.annoMatrix,
    genesets: state.genesets.genesets,
    genesetsInitialized: state.genesets.initialized,
    lastSavedAnnoMatrix: state.autosave?.lastSavedAnnoMatrix ?? null,
    lastSavedGenesets: state.autosave?.lastSavedGenesets ?? null,
  };
};

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  dispatch,
});

class Autosave extends React.PureComponent<Props, AutosaveComponentState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      timer: null,
    };
  }

  componentDidMount(): void {
    this.configureTimer();
  }

  componentDidUpdate(prevProps: Props): void {
    const { writableCategoriesEnabled, writableGenesetsEnabled } = this.props;
    if (
      prevProps.writableCategoriesEnabled !== writableCategoriesEnabled ||
      prevProps.writableGenesetsEnabled !== writableGenesetsEnabled
    ) {
      this.configureTimer();
    }
  }

  componentWillUnmount(): void {
    const { timer } = this.state;
    if (timer) {
      window.clearInterval(timer);
    }
  }

  tick = (): void => {
    const { dispatch, obsAnnotationSaveInProgress, genesetSaveInProgress } =
      this.props;

    if (!obsAnnotationSaveInProgress && this.needToSaveObsAnnotations()) {
      dispatch(actions.saveObsAnnotationsAction());
    }

    if (!genesetSaveInProgress && this.needToSaveGenesets()) {
      dispatch(actions.saveGenesetsAction());
    }
  };

  configureTimer(): void {
    const { writableCategoriesEnabled, writableGenesetsEnabled } = this.props;
    const { timer } = this.state;

    if (timer) {
      window.clearInterval(timer);
    }

    if (writableCategoriesEnabled || writableGenesetsEnabled) {
      const newTimer = window.setInterval(this.tick, 2500);
      this.setState({ timer: newTimer });
    } else {
      this.setState({ timer: null });
    }
  }

  needToSaveObsAnnotations(): boolean {
    const { annoMatrix, lastSavedAnnoMatrix } = this.props;
    return actions.needToSaveObsAnnotations(annoMatrix, lastSavedAnnoMatrix);
  }

  needToSaveGenesets(): boolean {
    const { genesets, genesetsInitialized, lastSavedGenesets } = this.props;
    if (!genesetsInitialized) return false;
    return genesets !== lastSavedGenesets;
  }

  needToSave(): boolean {
    return this.needToSaveGenesets() || this.needToSaveObsAnnotations();
  }

  saveInProgress(): boolean {
    const { obsAnnotationSaveInProgress, genesetSaveInProgress } = this.props;
    return obsAnnotationSaveInProgress || genesetSaveInProgress;
  }

  statusMessage(): string {
    const { error } = this.props;
    if (error) {
      return `Autosave error: ${error}`;
    }
    return this.needToSave() ? "Unsaved" : "All saved";
  }

  render(): JSX.Element | null {
    const {
      writableCategoriesEnabled,
      writableGenesetsEnabled,
      lastSavedAnnoMatrix,
    } = this.props;

    const initialDataLoadComplete = Boolean(lastSavedAnnoMatrix);

    if (!writableCategoriesEnabled && !writableGenesetsEnabled) {
      return null;
    }

    const saving = this.saveInProgress();
    const hasError = typeof this.props.error === "string" && this.props.error;
    const unsaved = this.needToSave();

    let statusContent: JSX.Element;
    if (hasError) {
      statusContent = <span>Autosave error: {this.props.error}</span>;
    } else if (saving) {
      statusContent = (
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <Spinner size={16} />
          <span style={{ marginLeft: 6 }}>Saving…</span>
        </span>
      );
    } else if (unsaved) {
      statusContent = <span>Unsaved changes</span>;
    } else {
      statusContent = <span>All saved</span>;
    }

    return (
      <div
        id="autosave"
        data-testclass={
          !initialDataLoadComplete
            ? "autosave-init"
            : saving || unsaved
            ? "autosave-incomplete"
            : "autosave-complete"
        }
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          gap: 8,
          right: 8,
          bottom: 8,
          padding: "4px 8px",
          background: "rgba(255,255,255,0.9)",
          borderRadius: 4,
          boxShadow: "0 0 6px rgba(0,0,0,0.15)",
          zIndex: 1,
        }}
      >
        {statusContent}
        <FilenameDialog />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Autosave);
