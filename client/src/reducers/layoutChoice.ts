/*
we have a UI heuristic to pick the default layout, based on assumptions
about commonly used names.  Preferentially, pick in the following order:

  1. "umap"
  2. "tsne"
  3. "pca"
  4. give up, use the first available
*/

import { type Action, type AnyAction } from "redux";
import { type RootState } from ".";
import { selectAvailableLayouts } from "../selectors/layoutChoice";
import { getCurrentLayout } from "../util/layout";

export interface LayoutChoiceState {
  available: Array<string>;
  current: string;
  currentDimNames: Array<string>;
}

export interface LayoutChoiceAction extends Action<string> {
  layoutChoice: string;
}

export interface ReembeddingAddAction extends Action<string> {
  type: "reembed: add reembedding";
  name: string;
  schema: any;
}

export interface ReembeddingDeleteAction extends Action<string> {
  type: "reembed: delete reembedding";
  embName: string;
}

export interface ReembeddingRenameAction extends Action<string> {
  type: "reembed: rename reembedding";
  embName: string;
  newName: string;
}

const LayoutChoice = (
  state: LayoutChoiceState,
  action: AnyAction,
  nextSharedState: RootState
): LayoutChoiceState => {
  switch (action.type) {
    case "initial data load complete": {
      const { layoutChoice } = action;

      return {
        ...state,
        available: selectAvailableLayouts(nextSharedState),
        ...getCurrentLayout(nextSharedState, layoutChoice),
      };
    }

    case "set layout choice": {
      const { layoutChoice } = action as LayoutChoiceAction;

      return { ...state, ...getCurrentLayout(nextSharedState, layoutChoice) };
    }

    case "reembed: add reembedding": {
      const { name } = action as ReembeddingAddAction;
      console.log(`LayoutChoice reducer: Adding reembedding ${name}`);
      console.log(`Current available embeddings:`, state.available);
      
      const available = Array.from(new Set(state.available).add(name));
      console.log(`New available embeddings:`, available);
      
      // Default to 2D embedding dims since the embedding won't be in the schema yet
      const currentDimNames = [`${name}_0`, `${name}_1`];
      console.log(`Using default dims for ${name}:`, currentDimNames);
      
      const newState = {
        ...state,
        available,
        current: name,
        currentDimNames,
      };
      
      console.log(`LayoutChoice new state:`, newState);
      return newState;
    }

    case "reembed: delete reembedding": {
      const { embName } = action as ReembeddingDeleteAction;
      let available = Array.from(new Set(state.available));
      available = available.filter(e => e !== embName);
      return {
        ...state,
        available
      };
    }

    case "reembed: rename reembedding": {
      const { embName, newName } = action as ReembeddingRenameAction;
      let { current } = state;
      const available = Array.from(new Set(state.available));
      const availableNew: string[] = [];
      
      available.forEach((item) => {
        if (item === embName) {
          availableNew.push(newName);
        } else {
          availableNew.push(item);
        }
      });

      const oldname = embName.split(';;').at(-1) || embName;
      const newname = newName.split(';;').at(-1) || newName;
      let newCurrent = current;
      if (current === embName || current.includes(`${embName};;`)) {
        if (current.includes(`;;${oldname};;`)) { // middle
          newCurrent = current.replace(`;;${oldname};;`, `;;${newname};;`);
        } else if (current.includes(`${oldname};;`)) { // root
          newCurrent = current.replace(`${oldname};;`, `${newname};;`);
        } else if (current.includes(`;;${oldname}`)) { // leaf
          newCurrent = current.replace(`;;${oldname}`, `;;${newname}`);
        } else if (current === oldname) { // no children
          newCurrent = newname;
        }
      }

      return {
        ...state,
        available: availableNew,
        current: newCurrent,
        currentDimNames: [`${newCurrent}_0`, `${newCurrent}_1`]
      };
    }

    default: {
      return state;
    }
  }
};

export default LayoutChoice;
