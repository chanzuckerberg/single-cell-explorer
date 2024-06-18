import { AnyAction, Reducer } from "redux";
import { type RootState } from ".";

export type ReducerFunction<T extends keyof RootState> = (
  prevStateForKey: RootState[T] | undefined,
  action: AnyAction,
  nextState?: RootState,
  prevState?: RootState
) => RootState[T];

type CascadedReducersMap = Map<
  keyof RootState,
  ReducerFunction<keyof RootState>
>;

type CascadedReducers =
  | [keyof RootState, ReducerFunction<keyof RootState>][]
  | CascadedReducersMap;

export default function cascadeReducers(arg: CascadedReducers): Reducer {
  /**
   * Combine a set of cascading reducers into a single reducer. Cascading
   * reducers are reducers which may rely on state computed by another reducer.
   * Therefore, they:
   * - must be composed in a particular order (currently, this is a simple
   *  linear list of reducers, run in list order)
   * - must have access to partially updated "next state" so they can further
   *  derive state.
   *
   * Parameter is one of:
   * - a Map object
   * - an array of tuples, [ [key1, reducer1], [key2, reducer2], ... ]
   *  Ie,  cascadeReducers([ ["a", reduceA], ["b", reduceB] ])
   *
   * Each reducer will be called with the signature:
   * (prevState, action, sharedNextState, sharedPrevState) => newState
   * cascadeReducers will build a composite newState object, much
   * like combinedReducers.  Additional semantics:
   * - reducers guaranteed to be called in order
   * - each reducer will receive shared objects
   */
  const reducers =
    arg instanceof Map ? arg : (new Map(arg) as CascadedReducersMap);
  const reducerKeys = [...reducers.keys()] as (keyof RootState)[];

  return (prevState: RootState, action: AnyAction): RootState => {
    const nextState = {} as RootState;
    let stateChange = false;
    for (let i = 0, l = reducerKeys.length; i < l; i += 1) {
      const key = reducerKeys[i];
      const reducer = reducers.get(key);
      if (reducer) {
        const prevStateForKey = prevState ? prevState[key] : undefined;
        const nextStateForKey = reducer(
          prevStateForKey,
          action,
          nextState,
          prevState
        );
        // @ts-expect-error -- can't seem to convince TS that nextStateForKey is the correct type
        nextState[key] = nextStateForKey;
        stateChange = stateChange || nextStateForKey !== prevStateForKey;
      }
    }
    return stateChange ? nextState : prevState;
  };
}
