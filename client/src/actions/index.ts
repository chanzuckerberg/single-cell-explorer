import type { Config } from "../globals";
import * as globals from "../globals";
import { AnnoMatrixLoader, AnnoMatrixObsCrossfilter } from "../annoMatrix";
import {
  catchErrorsWrap,
  doJsonRequest,
  dispatchNetworkErrorMessageToUser,
} from "../util/actionHelpers";
import { loadUserColorConfig } from "../util/stateManager/colorHelpers";
import { removeLargeDatasets } from "../util/stateManager/datasetMetadataHelpers";
import * as selnActions from "./selection";
import * as annoActions from "./annotation";
import * as viewActions from "./viewStack";
import * as embActions from "./embedding";
import * as genesetActions from "./geneset";
import { AppDispatch, GetState } from "../reducers";
import { EmbeddingSchema, Schema } from "../common/types/schema";
import { ConvertedUserColors } from "../reducers/colors";
import { DatasetMetadata, Dataset } from "../common/types/entities";
import { postExplainNewTab } from "../components/framework/toasters";
import { KEYS } from "../components/util/localStorage";
import {
  storageGetTransient,
  storageSetTransient,
} from "../components/util/transientLocalStorage";
import { selectIsUserStateDirty } from "../selectors/global";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function setGlobalConfig(config: any) {
  /**
   * Set any global run-time config not _exclusively_ managed by the config reducer.
   * This should only set fields defined in globals.globalConfig.
   */
  globals.globalConfig.maxCategoricalOptionsToDisplay =
    config?.parameters?.["max-category-items"] ??
    globals.globalConfig.maxCategoricalOptionsToDisplay;
}

/*
return promise fetching user-configured colors
*/
async function userColorsFetchAndLoad(
  dispatch: AppDispatch
): Promise<{ type: string; userColors: ConvertedUserColors }> {
  return fetchJson<{ [category: string]: { [label: string]: string } }>(
    "colors"
  ).then((response) =>
    dispatch({
      type: "universe: user color load success",
      userColors: loadUserColorConfig(response),
    })
  );
}

async function schemaFetch(): Promise<{ schema: Schema }> {
  return fetchJson<{ schema: Schema }>("schema");
}

async function configFetch(dispatch: AppDispatch): Promise<Config> {
  const response = await fetchJson<{ config: globals.Config }>("config");
  const config = { ...globals.configDefaults, ...response.config };

  setGlobalConfig(config);

  dispatch({
    type: "configuration load complete",
    config,
  });
  return config;
}

/**
 * Fetch dataset metadata and dispatch save to store, including portal URL returned in /config.
 * @param dispatch Function facilitating update of store.
 * @param config Response from config endpoint containing collection ID for the current dataset.
 */
async function datasetMetadataFetch(
  dispatch: AppDispatch,
  config: Config
): Promise<void> {
  const datasetMetadataResponse = await fetchJson<{
    metadata: DatasetMetadata;
  }>("dataset-metadata");

  // Create new dataset array with large datasets removed
  const { metadata: datasetMetadata } = datasetMetadataResponse;
  const datasets = removeLargeDatasets(
    datasetMetadata.collection_datasets,
    globals.DATASET_MAX_CELL_COUNT
  );

  const { links } = config;
  dispatch({
    type: "dataset metadata load complete",
    datasetMetadata: {
      ...datasetMetadata,
      collection_datasets: datasets,
    },
    portalUrl: links["collections-home-page"],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
async function genesetsFetch(dispatch: any, config: any) {
  /* request genesets ONLY if the backend supports the feature */
  const defaultResponse = {
    genesets: [],
    tid: 0,
  };
  if (config?.parameters?.annotations_genesets ?? false) {
    fetchJson("genesets").then((response) => {
      dispatch({
        type: "geneset: initial load",
        data: response ?? defaultResponse,
      });
    });
  } else {
    dispatch({
      type: "geneset: initial load",
      data: defaultResponse,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function prefetchEmbeddings(annoMatrix: any) {
  /*
  prefetch requests for all embeddings
  */
  const { schema } = annoMatrix;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  const available = schema.layout.obs.map((v: any) => v.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
  available.forEach((embName: any) => annoMatrix.prefetch("emb", embName));
}

/*
Application bootstrap
*/
const doInitialDataLoad = (): ((
  dispatch: AppDispatch,
  getState: GetState
) => void) =>
  catchErrorsWrap(async (dispatch: AppDispatch) => {
    dispatch({ type: "initial data load start" });

    try {
      const [config, schema] = await Promise.all([
        configFetch(dispatch),
        schemaFetch(),
        userColorsFetchAndLoad(dispatch),
      ]);

      datasetMetadataFetch(dispatch, config);

      genesetsFetch(dispatch, config);

      const baseDataUrl = `${globals.API.prefix}${globals.API.version}`;
      const annoMatrix = new AnnoMatrixLoader(baseDataUrl, schema.schema);
      const obsCrossfilter = new AnnoMatrixObsCrossfilter(annoMatrix);
      prefetchEmbeddings(annoMatrix);

      dispatch({
        type: "annoMatrix: init complete",
        annoMatrix,
        obsCrossfilter,
      });
      dispatch({ type: "initial data load complete" });

      const defaultEmbedding = config?.parameters?.default_embedding;
      const layoutSchema = schema?.schema?.layout?.obs ?? [];
      if (
        defaultEmbedding &&
        layoutSchema.some((s: EmbeddingSchema) => s.name === defaultEmbedding)
      ) {
        dispatch(embActions.layoutChoiceAction(defaultEmbedding));
      }
    } catch (error) {
      dispatch({ type: "initial data load error", error });
    }
  }, true);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
function requestSingleGeneExpressionCountsForColoringPOST(gene: any) {
  return {
    type: "color by expression",
    gene,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
const requestUserDefinedGene = (gene: any) => ({
  type: "request user defined gene success",

  data: {
    genes: [gene],
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const dispatchDiffExpErrors = (dispatch: any, response: any) => {
  switch (response.status) {
    case 403:
      dispatchNetworkErrorMessageToUser(
        "Too many cells selected for differential experesion calculation - please make a smaller selection."
      );
      break;
    case 501:
      dispatchNetworkErrorMessageToUser(
        "Differential expression is not implemented."
      );
      break;
    default: {
      const msg = `Unexpected differential expression HTTP response ${response.status}, ${response.statusText}`;
      dispatchNetworkErrorMessageToUser(msg);
      dispatch({
        type: "request differential expression error",
        error: new Error(msg),
      });
    }
  }
};

const requestDifferentialExpression =
  (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    set1: any,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    set2: any,
    num_genes = 50
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  async (dispatch: any, getState: any) => {
    dispatch({ type: "request differential expression started" });
    try {
      /*
    Steps:
    1. get the most differentially expressed genes
    2. get expression data for each
    */
      const { annoMatrix } = getState();
      const varIndexName = annoMatrix.schema.annotations.var.index;

      // Legal values are null, Array or TypedArray.  Null is initial state.
      if (!set1) set1 = [];
      if (!set2) set2 = [];

      // These lines ensure that we convert any TypedArray to an Array.
      // This is necessary because JSON.stringify() does some very strange
      // things with TypedArrays (they are marshalled to JSON objects, rather
      // than being marshalled as a JSON array).
      set1 = Array.isArray(set1) ? set1 : Array.from(set1);
      set2 = Array.isArray(set2) ? set2 : Array.from(set2);

      const res = await fetch(
        `${globals.API.prefix}${globals.API.version}diffexp/obs`,
        {
          method: "POST",
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            mode: "topN",
            count: num_genes,
            set1: { filter: { obs: { index: set1 } } },
            set2: { filter: { obs: { index: set2 } } },
          }),
          credentials: "include",
        }
      );

      if (!res.ok || res.headers.get("Content-Type") !== "application/json") {
        return dispatchDiffExpErrors(dispatch, res);
      }

      const response = await res.json();
      const varIndex = await annoMatrix.fetch("var", varIndexName);
      const diffexpLists = { negative: [], positive: [] };
      for (const polarity of Object.keys(diffexpLists)) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
        diffexpLists[polarity] = response[polarity].map((v: any) => [
          varIndex.at(v[0], varIndexName),
          ...v.slice(1),
        ]);
      }

      /* then send the success case action through */
      return dispatch({
        type: "request differential expression success",
        data: diffexpLists,
      });
    } catch (error) {
      return dispatch({
        type: "request differential expression error",
        error,
      });
    }
  };

/**
 * Check local storage for flag indicating that the work in progress toast should be displayed.
 */
const checkExplainNewTab =
  () =>
  (dispatch: AppDispatch): void => {
    const workInProgressWarn = storageGetTransient(KEYS.WORK_IN_PROGRESS_WARN);
    if (workInProgressWarn) {
      dispatch({ type: "work in progress warning displayed" });
      postExplainNewTab(
        "To maintain your in-progress work on the previous dataset, we opened this dataset in a new tab."
      );
    }
  };

/**
 * Navigate to URL in the same browser tab if there is no work in progress, otherwise open URL in new tab.
 * @param url - URL to navigate to.
 */
const navigateCheckUserState =
  (url: string): ((dispatch: AppDispatch, getState: GetState) => void) =>
  (_dispatch: AppDispatch, getState: GetState) => {
    const workInProgress = selectIsUserStateDirty(getState());
    if (workInProgress) {
      openTab(`${url}?${globals.QUERY_PARAM_EXPLAIN_NEW_TAB}`);
    } else {
      window.location.href = url;
    }
  };

/**
 * Handle select of dataset from dataset selector: determine whether to display dataset in current browser tab or open
 * dataset in new tab if user currently has work in progress.
 * @param dataset Dataset to switch to and load in the current tab.
 */
const selectDataset =
  (dataset: Dataset): ((dispatch: AppDispatch, getState: GetState) => void) =>
  (dispatch: AppDispatch, getState: GetState) => {
    const workInProgress = selectIsUserStateDirty(getState());
    if (workInProgress) {
      dispatch(openDataset(dataset));
    } else {
      dispatch(switchDataset(dataset));
    }
  };

/**
 * Open selected dataset in a new tab. Create local storage with expiry to pop toast once dataset is opened.
 * @param dataset Dataset to open in new tab.
 */
const openDataset =
  (dataset: Dataset): ((dispatch: AppDispatch) => void) =>
  (dispatch: AppDispatch) => {
    const deploymentUrl = dataset.dataset_deployments?.[0].url;
    if (!deploymentUrl) {
      dispatchNetworkErrorMessageToUser("Unable to open dataset.");
      return;
    }

    dispatch({ type: "dataset opened" });
    storageSetTransient(KEYS.WORK_IN_PROGRESS_WARN, 10000);
    openTab(deploymentUrl);
  };

/**
 * Open new tab and navigate to the given URL.
 * @param url - URL to navigate to.
 */
const openTab = (url: string) => {
  window.open(url, "_blank", "noopener");
};

/**
 * Open selected dataset in a new tab.
 * @param dataset Dataset to open in new tab.
 */
const switchDataset =
  (dataset: Dataset): ((dispatch: AppDispatch) => void) =>
  (dispatch: AppDispatch) => {
    dispatch({ type: "reset" });
    dispatch({ type: "dataset switch" });

    const deploymentUrl = dataset.dataset_deployments?.[0].url;
    if (!deploymentUrl) {
      dispatchNetworkErrorMessageToUser("Unable to switch datasets.");
      return;
    }
    dispatch(updateLocation(deploymentUrl));
    globals.updateApiPrefix();
    dispatch(doInitialDataLoad());
  };

/**
 * Update browser location by adding corresponding entry to the session's history stack.
 * @param url - URL to update browser location to.
 */
const updateLocation = (url: string) => (dispatch: AppDispatch) => {
  dispatch({ type: "location update" });
  window.history.pushState(null, "", url);
};

function fetchJson<T>(pathAndQuery: string): Promise<T> {
  return doJsonRequest<T>(
    `${globals.API.prefix}${globals.API.version}${pathAndQuery}`
  ) as Promise<T>;
}

export default {
  doInitialDataLoad,
  requestDifferentialExpression,
  requestSingleGeneExpressionCountsForColoringPOST,
  requestUserDefinedGene,
  checkExplainNewTab,
  navigateCheckUserState,
  selectDataset,
  selectContinuousMetadataAction: selnActions.selectContinuousMetadataAction,
  selectCategoricalMetadataAction: selnActions.selectCategoricalMetadataAction,
  selectCategoricalAllMetadataAction:
    selnActions.selectCategoricalAllMetadataAction,
  graphBrushStartAction: selnActions.graphBrushStartAction,
  graphBrushChangeAction: selnActions.graphBrushChangeAction,
  graphBrushDeselectAction: selnActions.graphBrushDeselectAction,
  graphBrushCancelAction: selnActions.graphBrushCancelAction,
  graphBrushEndAction: selnActions.graphBrushEndAction,
  graphLassoStartAction: selnActions.graphLassoStartAction,
  graphLassoEndAction: selnActions.graphLassoEndAction,
  graphLassoCancelAction: selnActions.graphLassoCancelAction,
  graphLassoDeselectAction: selnActions.graphLassoDeselectAction,
  clipAction: viewActions.clipAction,
  subsetAction: viewActions.subsetAction,
  resetSubsetAction: viewActions.resetSubsetAction,
  annotationCreateCategoryAction: annoActions.annotationCreateCategoryAction,
  annotationRenameCategoryAction: annoActions.annotationRenameCategoryAction,
  annotationDeleteCategoryAction: annoActions.annotationDeleteCategoryAction,
  annotationCreateLabelInCategory: annoActions.annotationCreateLabelInCategory,
  annotationDeleteLabelFromCategory:
    annoActions.annotationDeleteLabelFromCategory,
  annotationRenameLabelInCategory: annoActions.annotationRenameLabelInCategory,
  annotationLabelCurrentSelection: annoActions.annotationLabelCurrentSelection,
  saveObsAnnotationsAction: annoActions.saveObsAnnotationsAction,
  saveGenesetsAction: annoActions.saveGenesetsAction,
  needToSaveObsAnnotations: annoActions.needToSaveObsAnnotations,
  layoutChoiceAction: embActions.layoutChoiceAction,
  setCellSetFromSelection: selnActions.setCellSetFromSelection,
  genesetDelete: genesetActions.genesetDelete,
  genesetAddGenes: genesetActions.genesetAddGenes,
  genesetDeleteGenes: genesetActions.genesetDeleteGenes,
};
