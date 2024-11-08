import actions from "actions";
import { DifferentialState } from "reducers/differential";
import { CellSetButtonProps } from "./types";

export function useConnect({
  dispatch,
  differential,
  eitherCellSetOneOrTwo,
}: CellSetButtonProps) {
  function set() {
    dispatch(actions.setCellSetFromSelection(eitherCellSetOneOrTwo));
  }

  const cellListName: keyof DifferentialState = `celllist${eitherCellSetOneOrTwo}`;

  const cellsSelected = differential[cellListName]?.length ?? 0;

  return {
    set,
    cellsSelected,
  };
}
