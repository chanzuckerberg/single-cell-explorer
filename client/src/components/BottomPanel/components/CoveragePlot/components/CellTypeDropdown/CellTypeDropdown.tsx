import React, { useMemo, useState, useRef } from "react";
import { useCellTypesQuery } from "common/queries/cellType";
import {
  DefaultAutocompleteOption,
  DropdownMenu,
  MenuItem,
} from "@czi-sds/components";
import { AutocompleteValue } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducers";
import { CellTypeInputDropdown } from "./style";

export function CellTypeDropdown({ cellType }: { cellType: string }) {
  const { selectedCellTypes } = useSelector((state: RootState) => ({
    selectedCellTypes: state.controls.chromatinSelectedCellTypes,
  }));

  const cellTypesQuery = useCellTypesQuery();
  const cellTypes = useMemo(
    () => cellTypesQuery.data ?? [],
    [cellTypesQuery.data]
  );

  const [open, setOpen] = useState(false);
  const anchorElRef = useRef<HTMLElement | null>(null);

  type Option = DefaultAutocompleteOption;
  type Multiple = false;
  type DisableClearable = false;
  type FreeSolo = false;
  const otherSelectedCellTypes = useMemo(
    () => new Set(selectedCellTypes.filter((type) => type !== cellType)),
    [cellType, selectedCellTypes]
  );

  const cellTypeOptions = useMemo(
    () =>
      cellTypes.map(
        (name): Option => ({
          name,
          component: (
            <MenuItem
              selected={cellType === name}
              disabled={otherSelectedCellTypes.has(name)}
            >
              {name}
            </MenuItem>
          ),
        })
      ),
    [cellType, cellTypes, otherSelectedCellTypes]
  );

  const activeOption = useMemo(
    () => ({ name: cellType } as Option),
    [cellType]
  );

  const dispatch = useDispatch();

  return (
    <>
      <CellTypeInputDropdown
        label={cellType}
        onClick={(event) => {
          if (open) {
            setOpen(false);
            anchorElRef.current?.focus();
            anchorElRef.current = null;
          } else {
            anchorElRef.current = event.currentTarget;
            setOpen(true);
          }
        }}
        sdsStage="default"
        sdsStyle="minimal"
        sdsType="value"
        value={cellType}
      />

      <DropdownMenu<Option, Multiple, DisableClearable, FreeSolo>
        anchorEl={anchorElRef.current}
        onClickAway={() => setOpen(false)}
        open={open}
        onClose={() => setOpen(false)}
        options={cellTypeOptions}
        search
        width={244}
        onChange={(
          _: unknown,
          value: AutocompleteValue<Option, Multiple, DisableClearable, FreeSolo>
        ) => {
          setOpen(false);
          anchorElRef.current = null;

          if (
            !value ||
            value.name === cellType ||
            otherSelectedCellTypes.has(value.name)
          ) {
            return;
          }

          if (value) {
            dispatch({
              type: "toggle chromatin cell types",
              cellType: value.name,
              removeCellType: cellType,
            });
          }
        }}
        value={activeOption}
      />
    </>
  );
}
