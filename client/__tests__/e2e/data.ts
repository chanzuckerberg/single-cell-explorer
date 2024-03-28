const truncate: { [key: string]: string } = {};
const truncateLabels = [];
for (let i = 0; i < 999; i += 1) {
  truncateLabels.push(`CellType${i}`);
}
truncateLabels.push(`CellType1100`);
truncateLabels.sort();
truncateLabels.push("truncate: all other labels");
for (let i = 0; i < truncateLabels.length; i += 1) {
  truncate[truncateLabels[i]] = "1";
}
truncate.CellType1100 = "400";
truncate["truncate: all other labels"] = "101";

export const datasets = {
  "pbmc3k.cxg": {
    title: "pbmc3k.cxg",
    dataframe: {
      nObs: "2638",
      nVar: "1838",
      type: "float32",
    },
    categorical: {
      louvain: {
        "B cells": "342",
        "CD14+ Monocytes": "480",
        "CD4 T cells": "1144",
        "CD8 T cells": "316",
        "Dendritic cells": "37",
        "FCGR3A+ Monocytes": "150",
        Megakaryocytes: "15",
        "NK cells": "154",
      },
    },
    continuous: {
      n_genes: "int32",
      percent_mito: "float32",
      n_counts: "float32",
    },
    cellsets: {
      lasso: [
        {
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.75 },
          count: "930",
        },
      ],
      categorical: [
        {
          metadata: "louvain",
          values: ["B cells", "Megakaryocytes"],
          count: "357",
        },
      ],
      continuous: [
        {
          metadata: "n_genes",
          "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
          count: "1537",
        },
      ],
    },

    diffexp: {
      category: "louvain",
      cellset1: {
        cellType: "B cells",
      },
      cellset2: {
        cellType: "NK cells",
      },
      pop2Gene: "NKG7",
    },

    genes: {
      bulkadd: ["S100A8", "FCGR3A", "LGALS2", "GSTP1"],
      search: "ACD",
    },
    subset: {
      cellset1: [
        {
          kind: "categorical",
          metadata: "louvain",
          values: ["B cells", "Megakaryocytes"],
        },
      ],
      count: "332",
      categorical: {
        louvain: {
          "B cells": "342",
          "CD14+ Monocytes": "0",
          "CD4 T cells": "0",
          "CD8 T cells": "0",
          "Dendritic cells": "0",
          "FCGR3A+ Monocytes": "0",
          Megakaryocytes: "15",
          "NK cells": "0",
        },
      },
      lasso: {
        "coordinates-as-percent": { x1: 0.25, y1: 0.1, x2: 0.75, y2: 0.65 },
        count: "357",
      },
    },
    scatter: {
      genes: { x: "S100A8", y: "FCGR3A" },
    },
    pan: {
      "coordinates-as-percent": { x1: 0.75, y1: 0.75, x2: 0.25, y2: 0.25 },
    },
    features: {
      panzoom: {
        lasso: {
          "coordinates-as-percent": { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
          count: "37",
        },
      },
    },
    categoryLabel: {
      lasso: {
        "coordinates-as-percent": { x1: 0.05, y1: 0.3, x2: 0.5, y2: 0.5 },
      },
      newCount: {
        bySubsetConfig: {
          false: "668",
          true: "659",
        },
      },
    },
    annotationsFromFile: {
      count: {
        bySubsetConfig: {
          false: "1161",
          true: "852",
        },
      },
    },
    clip: {
      min: "30",
      max: "70",
      metadata: "n_genes",
      gene: "S100A8",
      "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
      count: "386",
      "gene-cell-count": "416",
    },
    brushOnGenesetMean: {
      default: "131",
      withSubset: "111",
    },
    expandGeneAndBrush: {
      default: "109",
      withSubset: "94",
    },
  },
  "super-cool-spatial.cxg": {
    title: "super-cool-spatial.cxg",
    dataframe: {
      nObs: "2881",
      nVar: "1838",
      type: "float32",
    },
    categorical: {
      cell_type: {
        "B cell": "1",
        "CD14-low, CD16-positive monocyte": "2",
        "CD14-positive monocyte": "1",
        "CD8-positive, alpha-beta cytotoxic T cell": "8",
        "activated CD4-positive, alpha-beta T cell": "1",
        "cardiac pacemaker cell of sinoatrial node": "100",
        "dendritic cell, human": "7",
        "endocardial cell": "31",
        "endothelial cell": "15",
        "endothelial cell of artery": "14",
        "endothelial cell of lymphatic vessel": "2",
        "fat cell": "76",
        "fibroblast of cardiac tissue": "842",
        "glial cell": "43",
        macrophage: "72",
        "mast cell": "19",
        monocyte: "9",
        "mucosal invariant T cell": "5",
        "naive thymus-derived CD4-positive, alpha-beta T cell": "24",
        neutrophil: "8",
        pericyte: "6",
        "plasma cell": "1",
        "regular atrial cardiac myocyte": "1499",
        "smooth muscle cell": "33",
        "smooth muscle cell of the pulmonary artery": "12",
        "vein endothelial cell": "50",
      },
    },
    continuous: {
      n_genes_by_counts: "int32",
      log1p_n_genes_by_counts: "int32",
      total_counts: "int32",
    },
    cellsets: {
      lasso: [
        {
          "coordinates-as-percent": { x1: 0.1, y1: 0.25, x2: 0.7, y2: 0.75 },
          count: "2156",
        },
      ],
      categorical: [
        {
          metadata: "cell_type",
          values: ["B cell", "fat cell"],
          count: "77", // B cell 1 + fat cell 76
        },
      ],
      continuous: [
        {
          metadata: "n_genes_by_counts",
          "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
          count: "1081",
        },
      ],
    },

    diffexp: {
      category: "cell_type",
      cellset1: {
        cellType: "fat cell",
      },
      cellset2: {
        cellType: "mast cell",
      },
      pop2Gene: "TPSB2",
    },

    genes: {
      bulkadd: ["S100A8", "FCGR3A", "LGALS2", "GSTP1"],
      search: "ACD",
    },
    subset: {
      cellset1: [
        {
          kind: "categorical",
          metadata: "cell_type",
          values: ["fat cell", "mast cell"],
        },
      ],
      count: "332",
      categorical: {
        cell_type: {
          "B cell": "0",
          "CD14-low, CD16-positive monocyte": "0",
          "CD14-positive monocyte": "0",
          "CD8-positive, alpha-beta cytotoxic T cell": "0",
          "activated CD4-positive, alpha-beta T cell": "0",
          "cardiac pacemaker cell of sinoatrial node": "0",
          "dendritic cell, human": "0",
          "endocardial cell": "0",
          "endothelial cell": "0",
          "endothelial cell of artery": "0",
          "endothelial cell of lymphatic vessel": "0",
          "fat cell": "76",
          "fibroblast of cardiac tissue": "0",
          "glial cell": "0",
          macrophage: "0",
          "mast cell": "19",
          monocyte: "0",
          "mucosal invariant T cell": "0",
          "naive thymus-derived CD4-positive, alpha-beta T cell": "0",
          neutrophil: "0",
          pericyte: "0",
          "plasma cell": "0",
          "regular atrial cardiac myocyte": "0",
          "smooth muscle cell": "0",
          "smooth muscle cell of the pulmonary artery": "0",
          "vein endothelial cell": "0",
        },
      },
      lasso: {
        "coordinates-as-percent": { x1: 0.25, y1: 0.1, x2: 0.75, y2: 0.65 },
        count: "95",
      },
    },
    scatter: {
      genes: { x: "S100A8", y: "FCGR3A" },
    },
    pan: {
      "coordinates-as-percent": { x1: 0.75, y1: 0.75, x2: 0.25, y2: 0.25 },
    },
    features: {
      panzoom: {
        lasso: {
          "coordinates-as-percent": { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
          count: "237",
        },
      },
    },
    categoryLabel: {
      lasso: {
        "coordinates-as-percent": { x1: 0.05, y1: 0.3, x2: 0.5, y2: 0.5 },
      },
      newCount: {
        bySubsetConfig: {
          false: "668",
          true: "659",
        },
      },
    },
    annotationsFromFile: {
      count: {
        bySubsetConfig: {
          false: "1161",
          true: "852",
        },
      },
    },
    clip: {
      min: "30",
      max: "70",
      metadata: "n_genes_by_counts",
      gene: "S100A8",
      "coordinates-as-percent": { x1: 0.25, y1: 0.5, x2: 0.55, y2: 0.5 },
      count: "338",
      "gene-cell-count": "416",
    },
    brushOnGenesetMean: {
      default: "74",
      withSubset: "69",
    },
    expandGeneAndBrush: {
      default: "52",
      withSubset: "49",
    },
  },
};
