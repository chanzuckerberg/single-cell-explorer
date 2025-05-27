import React, { useMemo, useState, useRef } from "react";
import { useCellTypesQuery } from "common/queries/cellType";
import { DefaultAutocompleteOption, DropdownMenu } from "@czi-sds/components";
import { AutocompleteValue } from "@mui/material";
import { useDispatch } from "react-redux";
import { CellTypeInputDropdown } from "./style";

export function CellTypeDropdown({ cellType }: { cellType: string }) {
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

  const cellTypeOptions = useMemo(
    () => cellTypes.map<Option>((name) => ({ name })),
    [cellTypes]
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

          if (value) {
            dispatch({
              type: "toggle chromatin histogram",
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
