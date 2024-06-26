/*
The annoMatrix view stack has a set of conventions which are assumed elsewhere in the
application. These helper functions make it simple for action creators to manage
the stack.

The annoMatrix module does not care about this order, but we maintain it as
a convention to make it simpler to manipulate the views.

Terminology:
- clip view: AnnoMatrixClipView
- subset view: AnnoMatrixRowSubsetView
- user subset view: create by the user explicitly subsetting by selection
- embedding subset view: implicitly created by switching the current embedding
- loader, or base annoMatrix:  the root, which loads data

Rules:
1. there will be zero or one clip view
2. there will be zero or more subset views
3. there will be zero or one embedding view
4. there will be one loader/base, which is always the bottom view
5. the view ordering MUST be (top to bottom):

	[clip] -> [user subset] -> [embedding subset] -> loader

There is code elsewhere in the app (eg, menubar/clip.js) which assumes this order.

Views can be interrogated for their type with the following:

* is a view:  annoMatrix.isView
* is the loader:  !anonMatrix.isView (or annoMatrix === annoMatrix.base())
* is a clip view:  annoMatrix.isClipped (or annoMatrix.clipRange)
* is a subset view:  (annoMatrix.isView && !annoMatrix.isClipped)
* is a user subset view:  annoMatrix.userFlags?.isUserSubsetView
* is an embedding subset view:  annomatrix.userFlags?.isEmbSubsetView

*/

import { clip, isubsetMask, isubset } from "../../annoMatrix";
import { memoize } from "../dataframe/util";
import { Dataframe, LabelIndex } from "../dataframe";
import {
  AnnoMatrixClipView,
  AnnoMatrixRowSubsetView,
} from "../../annoMatrix/views";
import AnnoMatrix from "../../annoMatrix/annoMatrix";

/**
 * clip the annoMatrix.
 */
export function _clipAnnoMatrix(
  annoMatrix: AnnoMatrix | AnnoMatrixClipView | AnnoMatrixRowSubsetView,
  min: number,
  max: number
): AnnoMatrixClipView {
  if ("isClipped" in annoMatrix) {
    return clip(annoMatrix.viewOf, min, max);
  }

  return clip(annoMatrix, min, max);
}

/**
 * user-requested row subset of annoMatrix, to be added on top of any
 * other previous row subsets.
 */
export function _userSubsetAnnoMatrix(
  annoMatrix: AnnoMatrix | AnnoMatrixClipView | AnnoMatrixRowSubsetView,
  mask: Uint8Array
): AnnoMatrix {
  const { clipRange } = annoMatrix as AnnoMatrixClipView;

  if (clipRange) {
    annoMatrix = annoMatrix.viewOf;
  }

  annoMatrix = isubsetMask(annoMatrix, mask);
  annoMatrix.userFlags.isUserSubsetView = true;

  if (clipRange) {
    annoMatrix = clip(annoMatrix, ...clipRange);
  }

  return annoMatrix;
}

/**
 * Reset/remove all user-requested subsets.  Do not remove clip or embedding subset.
 */
export function _userResetSubsetAnnoMatrix(
  annoMatrix: AnnoMatrix | AnnoMatrixClipView | AnnoMatrixRowSubsetView
): AnnoMatrix {
  /* stash clipping info, if any */
  const { clipRange } = annoMatrix as AnnoMatrixClipView;

  if (clipRange) {
    annoMatrix = annoMatrix.viewOf;
  }

  /* pop all views except embedding subset and loader */
  while (annoMatrix.isView && annoMatrix.userFlags.isUserSubsetView) {
    annoMatrix = annoMatrix.viewOf;
  }

  /* re-apply the clip, if any */
  if (clipRange) {
    annoMatrix = clip(annoMatrix, ...clipRange);
  }

  return annoMatrix;
}

/**
 * Set the embedding subset view. Only create a subset view for the embedding
 * when it is needed, ie, there are NaN values in the embeddings.
 */
export function _setEmbeddingSubset(
  annoMatrix: AnnoMatrix | AnnoMatrixClipView | AnnoMatrixRowSubsetView,
  embeddingDf: Dataframe
): AnnoMatrix {
  const embRowOffsets = _getEmbeddingRowOffsets(
    annoMatrix.rowIndex,
    embeddingDf
  );

  const curEmbSubsetView = getEmbSubsetView(annoMatrix);

  /* if no current embedding subset, and no new embedding subset, just noop */
  if (!embRowOffsets && !curEmbSubsetView) {
    return annoMatrix;
  }

  // ... otherwise, do the work

  /* stash clipping info, if any */
  const clipRange = (annoMatrix as AnnoMatrixClipView).isClipped
    ? (annoMatrix as AnnoMatrixClipView).clipRange
    : null;

  /* pop all subsets, user or embedding */
  while (annoMatrix.isView) {
    annoMatrix = annoMatrix.viewOf;
  }

  /* apply new embedding row index, if needed */
  if (embRowOffsets) {
    annoMatrix = isubset(annoMatrix, embRowOffsets);
    annoMatrix.userFlags.isEmbSubsetView = true;
  }

  /* re-apply clip, if needed */
  if (clipRange) {
    annoMatrix = clip(annoMatrix, ...clipRange);
  }

  return annoMatrix;
}

/**
 * Given a dataframe containing an embedding:
 * - if the embedding contains no NaN coordinates, return null
 * - if the embedding contains NaN coordinates, return a rowIndex
 *   that contains only the rows with discrete valued coordinates.
 *
 * Currently assumes that there will be onl two dimensions in the embedding.
 */
function _getEmbeddingRowOffsets(
  _baseRowIndex: LabelIndex,
  embeddingDf: Dataframe
): Int32Array | null {
  const X = embeddingDf.icol(0).asArray();
  const Y = embeddingDf.icol(1).asArray();
  const offsets = new Int32Array(X.length);
  let numOffsets = 0;

  for (let i = 0, l = X.length; i < l; i += 1) {
    if (!Number.isNaN(X[i]) && !Number.isNaN(Y[i])) {
      offsets[numOffsets] = i;
      numOffsets += 1;
    }
  }

  if (numOffsets === X.length) return null;

  return offsets.subarray(0, numOffsets);
}

export function _getDiscreteCellEmbeddingRowIndex(
  embeddingDf: Dataframe
): LabelIndex {
  const idx = _getEmbeddingRowOffsets(embeddingDf.rowIndex, embeddingDf);
  if (idx === null) return embeddingDf.rowIndex;
  return embeddingDf.rowIndex.isubset(idx);
}

export const getDiscreteCellEmbeddingRowIndex = memoize(
  _getDiscreteCellEmbeddingRowIndex,
  (df: Dataframe) => df.__id
);

/**
 * If there is an embedding subset in the view stack, return it. Falsish if not.
 */
export function getEmbSubsetView(
  annoMatrix: AnnoMatrix | AnnoMatrixClipView | AnnoMatrixRowSubsetView
): AnnoMatrix | undefined {
  while (annoMatrix?.isView) {
    if (annoMatrix.userFlags.isEmbSubsetView) return annoMatrix;
    annoMatrix = annoMatrix.viewOf;
  }

  return undefined;
}
