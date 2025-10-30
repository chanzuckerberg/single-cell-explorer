import {
  createStore,
  applyMiddleware,
  AnyAction,
  Action,
  Reducer,
} from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";

import cascadeReducers from "./cascade";
import undoable from "./undoable";
import datasetMetadata from "./datasetMetadata";
import config from "./config";
import annoMatrix from "./annoMatrix";
import obsCrossfilter from "./obsCrossfilter";
import categoricalSelection from "./categoricalSelection";
import continuousSelection from "./continuousSelection";
import graphSelection from "./graphSelection";
import colors from "./colors";
import differential from "./differential";
import layoutChoice from "./layoutChoice";
import controls from "./controls";
import genesets from "./genesets";
import genesetsUI from "./genesetsUI";
import centroidLabels from "./centroidLabels";
import pointDilation from "./pointDilation";
import quickGenes from "./quickGenes";
import singleContinuousValue from "./singleContinuousValue";
import panelEmbedding from "./panelEmbedding";
import autosave from "./autosave";
import annotations from "./annotations";
import { reembedController, preprocessController, reembedParameters, workflowPolling } from "./reembed";

import { gcMiddleware as annoMatrixGC } from "../annoMatrix";

import undoableConfig from "./undoableConfig";

const AppReducer = undoable(
  cascadeReducers([
    ["config", config],
    ["annoMatrix", annoMatrix],
    ["obsCrossfilter", obsCrossfilter],
    ["genesets", genesets],
    ["genesetsUI", genesetsUI],
    ["layoutChoice", layoutChoice],
    ["panelEmbedding", panelEmbedding],
    ["singleContinuousValue", singleContinuousValue],
    ["categoricalSelection", categoricalSelection],
    ["continuousSelection", continuousSelection],
    ["graphSelection", graphSelection],
    ["colors", colors],
    ["controls", controls],
    ["quickGenes", quickGenes],
    ["differential", differential],
    ["centroidLabels", centroidLabels],
    ["pointDilation", pointDilation],
    ["datasetMetadata", datasetMetadata],
    ["annotations", annotations],
    ["autosave", autosave],
    ["reembedParameters", reembedParameters],
  ] as Parameters<typeof cascadeReducers>[0]),
  [
    "annoMatrix",
    "obsCrossfilter",
    "categoricalSelection",
    "continuousSelection",
    "graphSelection",
    "colors",
    "controls",
    "quickGenes",
    "differential",
    "layoutChoice",
    "centroidLabels",
    "genesets",
    "annotations",
    "autosave",
    "reembedParameters",
  ],
  undoableConfig
);

const RootReducer: Reducer = (state: RootState, action: Action) => {
  // when a logout action is dispatched it will reset redux state
  if (action.type === "reset") {
    state = {} as RootState;
  }

  const newState = AppReducer(state, action);
  
  // Handle non-undoable controller states
  return {
    ...newState,
    reembedController: reembedController(state?.reembedController, action as any),
    preprocessController: preprocessController(state?.preprocessController, action as any),
    workflowPolling: workflowPolling(state?.workflowPolling, action as any),
  };
};

const store = createStore(RootReducer, applyMiddleware(thunk, annoMatrixGC));

export interface RootState {
  actionCount: number;
  config: ReturnType<typeof config>;
  annoMatrix: ReturnType<typeof annoMatrix>;
  obsCrossfilter: ReturnType<typeof obsCrossfilter>;
  genesets: ReturnType<typeof genesets>;
  genesetsUI: ReturnType<typeof genesetsUI>;
  layoutChoice: ReturnType<typeof layoutChoice>;
  panelEmbedding: ReturnType<typeof panelEmbedding>;
  singleContinuousValue: ReturnType<typeof singleContinuousValue>;
  categoricalSelection: ReturnType<typeof categoricalSelection>;
  continuousSelection: ReturnType<typeof continuousSelection>;
  graphSelection: ReturnType<typeof graphSelection>;
  colors: ReturnType<typeof colors>;
  controls: ReturnType<typeof controls>;
  quickGenes: ReturnType<typeof quickGenes>;
  differential: ReturnType<typeof differential>;
  centroidLabels: ReturnType<typeof centroidLabels>;
  pointDilation: ReturnType<typeof pointDilation>;
  datasetMetadata: ReturnType<typeof datasetMetadata>;
  annotations: ReturnType<typeof annotations>;
  autosave: ReturnType<typeof autosave>;
  reembedParameters: ReturnType<typeof reembedParameters>;
  reembedController: ReturnType<typeof reembedController>;
  preprocessController: ReturnType<typeof preprocessController>;
  workflowPolling: ReturnType<typeof workflowPolling>;
}

export type AppDispatch = ThunkDispatch<RootState, never, AnyAction>;

export type GetState = () => RootState;

export default store;
