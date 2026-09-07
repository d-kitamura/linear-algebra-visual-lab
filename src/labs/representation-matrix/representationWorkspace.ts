import type { SharedCameraState } from '../../sharing';
import type { PlaneViewport } from '../../visualization/planeGeometry';
import type { LineViewport } from '../../visualization/lineGeometry';
import { createRepresentationScene, REPRESENTATION_DIMENSIONS, type BasisSide, type RepresentationDimension, type RepresentationScene } from './representationMatrixState';

export type RepresentationShapeId = `${RepresentationDimension}-to-${RepresentationDimension}`;
export interface RepresentationViewState {
  readonly plane: Readonly<Record<BasisSide, PlaneViewport | null>>;
  readonly line: Readonly<Record<BasisSide, LineViewport | null>>;
  readonly cameras: Readonly<Record<BasisSide, SharedCameraState | null>>;
}
export interface RepresentationWorkspace {
  readonly activeShapeId: RepresentationShapeId;
  readonly scenes: Readonly<Record<RepresentationShapeId, RepresentationScene>>;
  readonly views: Readonly<Record<RepresentationShapeId, RepresentationViewState>>;
}
export const representationShapeId = (n: RepresentationDimension, m: RepresentationDimension): RepresentationShapeId => `${n}-to-${m}`;
export function createRepresentationViewState(): RepresentationViewState {
  return { plane: { source: null, target: null }, line: { source: null, target: null }, cameras: { source: null, target: null } };
}
export function createRepresentationWorkspace(): RepresentationWorkspace {
  const entries = REPRESENTATION_DIMENSIONS.flatMap((n) => REPRESENTATION_DIMENSIONS.map((m) => [representationShapeId(n, m), createRepresentationScene(n, m)] as const));
  return {
    activeShapeId: '2-to-2',
    scenes: Object.fromEntries(entries) as Record<RepresentationShapeId, RepresentationScene>,
    views: Object.fromEntries(entries.map(([id]) => [id, createRepresentationViewState()])) as Record<RepresentationShapeId, RepresentationViewState>,
  };
}
/** Resetは現在の場面だけ。共有導入時はこの初期値取得をInitialStateへ接続する。 */
export function resetRepresentationWorkspace(workspace: RepresentationWorkspace): RepresentationWorkspace {
  const id = workspace.activeShapeId;
  const definition = workspace.scenes[id].definition;
  return { ...workspace,
    scenes: { ...workspace.scenes, [id]: createRepresentationScene(definition.sourceDimension as RepresentationDimension, definition.targetDimension as RepresentationDimension) },
    views: { ...workspace.views, [id]: createRepresentationViewState() },
  };
}
