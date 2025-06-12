import { H4, Icon, MenuItem } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import fuzzysort from "fuzzysort";
import { ItemRenderer, Suggest } from "@blueprintjs/select";
import { useSelector, useDispatch } from "react-redux";

import { noop } from "lodash";

import { postUserErrorToast } from "components/framework/toasters";
import actions from "actions";
import { Dataframe, DataframeValue } from "util/dataframe";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import Gene from "../Gene/Gene";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function QuickGene() {
  const dispatch = useDispatch();

  const [isExpanded, setIsExpanded] = useState(true);
  const [geneNames, setGeneNames] = useState([] as string[]);
  const [geneIds, setGeneIds] = useState([] as DataframeValue[]);
  const [, setStatus] = useState("pending");
  const EMPTY_GENE_ITEM = { name: "No genes", id: "" };

  const { annoMatrix, userDefinedGenes, userDefinedGenesLoading } = useSelector(
    (state) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      annoMatrix: (state as any).annoMatrix,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      userDefinedGenes: (state as any).quickGenes.userDefinedGenes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      userDefinedGenesLoading: (state as any).quickGenes
        .userDefinedGenesLoading,
    })
  );

  const prevProps = usePrevious({ annoMatrix });

  useEffect(() => {
    if (!annoMatrix) return;

    (async function fetch() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on commit
      if (annoMatrix !== (prevProps as any)?.annoMatrix) {
        const { schema } = annoMatrix;
        const varIndex = schema.annotations.var.index;
        const varLabel = "feature_name";

        setStatus("pending");
        try {
          const dfIds: Dataframe = await annoMatrix.fetch("var", varIndex);
          const varColumns = annoMatrix.getMatrixColumns("var");

          // This is a fallback in case the varLabel is not available.
          const labelToUse = varColumns.includes(varLabel)
            ? varLabel
            : varIndex;
          const dfNames: Dataframe = await annoMatrix.fetch("var", labelToUse);

          const geneIdArray = dfIds.col(varIndex).asArray() as string[];
          const geneNameArray = dfNames.col(labelToUse).asArray() as string[];

          const isFilteredCol = "feature_is_filtered";
          const isFiltered =
            annoMatrix.getMatrixColumns("var").includes(isFilteredCol) &&
            (await annoMatrix.fetch("var", isFilteredCol));

          if (isFiltered) {
            const isFilteredArray = isFiltered.col(isFilteredCol).asArray();

            const filteredGeneNames = geneNameArray.filter(
              (_, index) => !isFilteredArray[index] && _
            );
            const filteredGeneIds = geneIdArray.filter(
              (_, index) => !isFilteredArray[index] && _
            );

            setGeneNames(filteredGeneNames);
            setGeneIds(filteredGeneIds);
          } else {
            setGeneNames(geneNameArray);
            setGeneIds(geneIdArray);
          }
          setStatus("success");
        } catch (error) {
          setStatus("error");
          throw error;
        }
      }
    })();
  }, [annoMatrix, prevProps]);

  useEffect(() => {
    dispatch({ type: "request gene list success", geneNames });
  }, [dispatch, geneNames]);

  const handleExpand = () => setIsExpanded(!isExpanded);
  const renderGene: ItemRenderer<{ name: string; id: string }> = (
    item,
    { modifiers }
  ) => {
    if (!modifiers.matchesPredicate) return null;

    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        data-testid={`suggest-menu-item-${item.name}`}
        key={item.id}
        onClick={() => handleClick(item)}
        text={item.name}
      />
    );
  };

  const itemListPredicate = useCallback((query: string, items: Item[]) => {
    if (!query.trim()) return items;

    const matches = filterGenes(
      query,
      items.map((i) => i.name)
    );
    const matchedNames = new Set(matches.map((m) => m.target));
    return items.filter((item) => matchedNames.has(item.name));
  }, []);

  const geneItems = useMemo(() => {
    if (!geneNames?.length || !geneIds?.length) {
      return [EMPTY_GENE_ITEM];
    }

    return geneNames.map((name, i) => ({
      name,
      id: String(geneIds[i] ?? ""),
    }));
  }, [geneNames, geneIds, EMPTY_GENE_ITEM]);

  type Item = { name: string; id: string };

  const handleClick = (item: Item) => {
    const { id: gene, name: geneName } = item;

    if (userDefinedGenes.indexOf(gene) !== -1) {
      postUserErrorToast("That gene already exists");
    } else if (geneNames.indexOf(geneName) === -1) {
      postUserErrorToast("That doesn't appear to be a valid gene name.");
    } else {
      track(EVENTS.EXPLORER_ADD_GENE);
      dispatch({ type: "single user defined gene start" });
      dispatch(actions.requestUserDefinedGene(gene));
      dispatch({ type: "single user defined gene complete" });
    }
  };

  const filterGenes = (query: string, genes: string[]) =>
    /* fires on load, once, and then for each character typed into the input */
    fuzzysort.go(query, genes, {
      limit: 5,
      threshold: -10000,
    });

  const QuickGenes = useMemo((): JSX.Element => {
    const removeGene = (geneId: string) => () => {
      dispatch({ type: "clear user defined gene", gene: geneId });
    };
    return userDefinedGenes.map((geneId: string) => {
      const geneIndex = geneIds.indexOf(geneId);
      const geneName = geneNames[geneIndex] ?? geneId;

      return (
        <Gene
          key={`quick=${geneId}`}
          gene={{ name: geneName, id: geneId }}
          removeGene={() => removeGene(geneId)}
          quickGene
          geneId={geneId}
          isGeneExpressionComplete
          onGeneExpressionComplete={noop}
        />
      );
    });
  }, [userDefinedGenes, geneNames, geneIds, dispatch]);

  return (
    <div style={{ width: "100%", marginBottom: "16px" }}>
      <H4
        role="menuitem"
        tabIndex={0}
        data-testid="quickgene-heading-expand"
        onKeyPress={handleExpand}
        style={{
          cursor: "pointer",
        }}
        onClick={handleExpand}
      >
        Genes{" "}
        {isExpanded ? (
          <Icon icon={IconNames.CHEVRON_DOWN} />
        ) : (
          <Icon icon={IconNames.CHEVRON_RIGHT} />
        )}
      </H4>
      {isExpanded && (
        <>
          <div style={{ marginBottom: "8px" }} data-testid="gene-search">
            <Suggest<Item>
              resetOnSelect
              closeOnSelect
              resetOnClose
              disabled={userDefinedGenesLoading}
              noResults={
                <MenuItem
                  disabled
                  text={
                    userDefinedGenesLoading
                      ? "Loading genes..."
                      : "No matching genes."
                  }
                />
              }
              onItemSelect={(g) => {
                handleClick(g);
              }}
              initialContent={<MenuItem disabled text="Enter a gene…" />}
              inputProps={{
                placeholder: "Quick Gene Search",
                leftIcon: IconNames.SEARCH,
              }}
              inputValueRenderer={(item) => item.name}
              itemListPredicate={itemListPredicate}
              itemRenderer={renderGene}
              items={geneItems}
              popoverProps={{ minimal: true }}
              fill
            />
          </div>
          {QuickGenes}
        </>
      )}
    </div>
  );
}
