// Annotation metadata interface is reserved for future metadata tracking
// (e.g., tracking which categories are read-only, validation state, etc.)
export type AnnotationMetadata = Record<string, never>;

const initialState: AnnotationMetadata = {};

const annotationMetadataReducer = (
  state: AnnotationMetadata = initialState
): AnnotationMetadata => 
  // This reducer is reserved for future annotation metadata tracking
  // Currently, rename undo is handled via column comparison heuristics
  // in saveObsAnnotationsAction rather than explicit metadata tracking.

   state
;

export default annotationMetadataReducer;
