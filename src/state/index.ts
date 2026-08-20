export { DEFAULT_2D_SHARE_STATE, DEFAULT_3D_SHARE_STATE } from './defaultState';
export { createAppInitialization } from './appInitialization';
export { parseCoordinateInput } from './vectorEditing';
export { addDefaultVector, removeVector } from './vectorCollection';
export { selectSpanVectors, updateSpanSelection } from './spanSelection';
export {
  DEFAULT_PARALLEL_SNAP_DISTANCE,
  REFERENCE_PARALLEL_SNAP_VIEW_WIDTH,
  parallelSnapDistanceForViewWidth,
  snapDraggedVectorToParallel,
} from './vectorSnapping';
export type { CoordinateInputErrorCode, CoordinateInputResult } from './vectorEditing';
export type { AddDefaultVectorResult } from './vectorCollection';
export type { ParallelSnapResult } from './vectorSnapping';
export { snapTargetToSelectedSpan } from './targetSnapping';
export type { TargetSnapKind, TargetSnapResult } from './targetSnapping';
export type { AppInitialization } from './appInitialization';
export type { AppDimension, InitialStatesByDimension } from './appInitialization';
