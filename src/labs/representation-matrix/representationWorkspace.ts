import type { SharedCameraState } from '../../sharing';
import type { PlaneViewport } from '../../visualization/planeGeometry';
import type { LineViewport } from '../../visualization/lineGeometry';
import { createRepresentationScene, REPRESENTATION_DIMENSIONS, REPRESENTATION_SPACE_KINDS, type RepresentationSpaceKind, type BasisSide, type RepresentationDimension, type RepresentationScene } from './representationMatrixState';

export type RepresentationShapeId = `${RepresentationDimension}-to-${RepresentationDimension}`;
export type RepresentationSceneId = RepresentationShapeId | `polynomial-${RepresentationShapeId}-${RepresentationSpaceKind}` | `coordinate-${RepresentationShapeId}-polynomial`;
export type RepresentationChangeId = RepresentationDimension | `polynomial-${RepresentationDimension}`;
export type RepresentationMode = 'map' | 'basis-change';
export type BasisChangeDirection = 'B-to-C' | 'C-to-B';
export type BasisChangeExample = 'standard' | 'order' | 'oblique';
export interface RepresentationViewState {
  readonly plane: Readonly<Record<BasisSide, PlaneViewport | null>>;
  readonly line: Readonly<Record<BasisSide, LineViewport | null>>;
  readonly cameras: Readonly<Record<BasisSide, SharedCameraState | null>>;
}
export interface RepresentationWorkspace {
  readonly mode: RepresentationMode;
  readonly changeDimension: RepresentationDimension;
  readonly changeKind: RepresentationSpaceKind;
  readonly changeScenes: Readonly<Record<RepresentationChangeId, RepresentationScene>>;
  readonly changeViews: Readonly<Record<RepresentationChangeId, RepresentationViewState>>;
  readonly changeDirections: Readonly<Record<RepresentationChangeId, BasisChangeDirection>>;
  readonly activeShapeId: RepresentationSceneId;
  readonly scenes: Readonly<Record<RepresentationSceneId, RepresentationScene>>;
  readonly views: Readonly<Record<RepresentationSceneId, RepresentationViewState>>;
}
export const representationShapeId = (n: RepresentationDimension, m: RepresentationDimension): RepresentationShapeId => `${n}-to-${m}`;
export const representationSceneId = (n: RepresentationDimension, m: RepresentationDimension, source: RepresentationSpaceKind, target: RepresentationSpaceKind): RepresentationSceneId =>
  source === 'polynomial' ? `polynomial-${representationShapeId(n, m)}-${target}` : target === 'polynomial' ? `coordinate-${representationShapeId(n, m)}-polynomial` : representationShapeId(n, m);
export const representationChangeId = (w: Pick<RepresentationWorkspace, 'changeKind' | 'changeDimension'>): RepresentationChangeId => w.changeKind === 'coordinate' ? w.changeDimension : `polynomial-${w.changeDimension}`;
export function createRepresentationViewState(): RepresentationViewState {
  return { plane: { source: null, target: null }, line: { source: null, target: null }, cameras: { source: null, target: null } };
}
export function createRepresentationWorkspace(): RepresentationWorkspace {
  const entries = REPRESENTATION_SPACE_KINDS.flatMap((source) => REPRESENTATION_SPACE_KINDS.flatMap((target) => REPRESENTATION_DIMENSIONS.flatMap((n) => REPRESENTATION_DIMENSIONS.map((m) =>
    [representationSceneId(n, m, source, target), createRepresentationScene(n, m, source, target)] as const))));
  const changes = REPRESENTATION_SPACE_KINDS.flatMap((kind) => REPRESENTATION_DIMENSIONS.map((n) =>
    [representationChangeId({ changeKind: kind, changeDimension: n }), createBasisChangeScene(n, 'oblique', kind)] as const));
  return {
    mode: 'map', changeDimension: 2, changeKind: 'coordinate',
    changeScenes: Object.fromEntries(changes) as Record<RepresentationChangeId, RepresentationScene>,
    changeViews: Object.fromEntries(changes.map(([id]) => [id, createRepresentationViewState()])) as Record<RepresentationChangeId, RepresentationViewState>,
    changeDirections: Object.fromEntries(changes.map(([id]) => [id, 'B-to-C'])) as Record<RepresentationChangeId, BasisChangeDirection>,
    activeShapeId: '2-to-2',
    scenes: Object.fromEntries(entries) as Record<RepresentationSceneId, RepresentationScene>,
    views: Object.fromEntries(entries.map(([id]) => [id, createRepresentationViewState()])) as Record<RepresentationSceneId, RepresentationViewState>,
  };
}
/** Resetは現在の場面だけ。共有導入時はこの初期値取得をInitialStateへ接続する。 */
export function resetRepresentationWorkspace(workspace: RepresentationWorkspace): RepresentationWorkspace {
  if (workspace.mode === 'basis-change') {
    const id = representationChangeId(workspace);
    return { ...workspace, changeScenes: { ...workspace.changeScenes, [id]: createBasisChangeScene(workspace.changeDimension, 'oblique', workspace.changeKind) },
      changeViews: { ...workspace.changeViews, [id]: createRepresentationViewState() },
      changeDirections: { ...workspace.changeDirections, [id]: 'B-to-C' } };
  }
  const id = workspace.activeShapeId;
  const scene = activeRepresentationScene(workspace);
  const definition = scene.definition;
  return { ...workspace,
    scenes: { ...workspace.scenes, [id]: createRepresentationScene(definition.sourceDimension as RepresentationDimension, definition.targetDimension as RepresentationDimension, scene.sourceKind, scene.targetKind) },
    views: { ...workspace.views, [id]: createRepresentationViewState() },
  };
}

/** 同じ空間の恒等写像。通常の写像状態をコピー・上書きしない。 */
export function createBasisChangeScene(n: RepresentationDimension, example: BasisChangeExample = 'oblique', kind: RepresentationSpaceKind = 'coordinate'): RepresentationScene {
  const initial = createRepresentationScene(n, n, kind, kind);
  const identity = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, column) => row === column ? 1 : 0));
  const standard = (side: BasisSide) => ({ ...initial[side], vectors: initial[side].vectors.map((v, i) => ({ ...v, coordinates: [...identity[i]] })) });
  const scene = { ...initial, definition: { ...initial.definition, matrix: identity } };
  if (example === 'standard') return { ...scene, source: standard('source'), target: standard('target') };
  if (example === 'order') return { ...scene, source: standard('source'), target: { ...standard('target'), vectors: [...standard('target').vectors].reverse() } };
  // 1Dでは斜交は起こらないため、基底の長さ・向きの変更を例にする。
  return n === 1 ? { ...scene, source: { ...scene.source, vectors: [{ ...scene.source.vectors[0], coordinates: [2] }] },
    target: { ...scene.target, vectors: [{ ...scene.target.vectors[0], coordinates: [-1] }] } } : scene;
}

export function activeRepresentationScene(w: RepresentationWorkspace): RepresentationScene {
  return w.mode === 'map' ? w.scenes[w.activeShapeId] : w.changeScenes[representationChangeId(w)];
}
export function activeRepresentationViews(w: RepresentationWorkspace): RepresentationViewState {
  return w.mode === 'map' ? w.views[w.activeShapeId] : w.changeViews[representationChangeId(w)];
}
export function updateActiveRepresentationScene(w: RepresentationWorkspace, update: (scene: RepresentationScene) => RepresentationScene): RepresentationWorkspace {
  const current = activeRepresentationScene(w);
  const next = update(current);
  if (next.source.dimension !== current.source.dimension || next.target.dimension !== current.target.dimension || next.sourceKind !== current.sourceKind || next.targetKind !== current.targetKind) return w;
  if (w.mode === 'map') return { ...w, scenes: { ...w.scenes, [w.activeShapeId]: next } };
  // UIを経由しない更新でも恒等写像と同じ空間の次元を維持する。
  if (next.source.dimension !== w.changeDimension || next.target.dimension !== w.changeDimension || next.input.length !== w.changeDimension) return w;
  return { ...w, changeScenes: { ...w.changeScenes, [representationChangeId(w)]: { ...next, definition: current.definition } } };
}
export function updateActiveRepresentationViews(w: RepresentationWorkspace, update: (views: RepresentationViewState) => RepresentationViewState): RepresentationWorkspace {
  return w.mode === 'map' ? { ...w, views: { ...w.views, [w.activeShapeId]: update(activeRepresentationViews(w)) } }
    : { ...w, changeViews: { ...w.changeViews, [representationChangeId(w)]: update(activeRepresentationViews(w)) } };
}
export function selectRepresentationDimension(w: RepresentationWorkspace, side: BasisSide, n: RepresentationDimension): RepresentationWorkspace {
  if (!REPRESENTATION_DIMENSIONS.includes(n)) return w;
  if (w.mode === 'basis-change') return { ...w, changeDimension: n };
  const scene = activeRepresentationScene(w);
  return { ...w, activeShapeId: representationSceneId(side === 'source' ? n : scene.source.dimension as RepresentationDimension,
    side === 'target' ? n : scene.target.dimension as RepresentationDimension, scene.sourceKind, scene.targetKind) };
}

export function selectRepresentationKind(w: RepresentationWorkspace, side: BasisSide, kind: RepresentationSpaceKind): RepresentationWorkspace {
  if (!REPRESENTATION_SPACE_KINDS.includes(kind)) return w;
  if (w.mode === 'basis-change') return { ...w, changeKind: kind };
  const s = activeRepresentationScene(w);
  return { ...w, activeShapeId: representationSceneId(s.source.dimension as RepresentationDimension, s.target.dimension as RepresentationDimension,
    side === 'source' ? kind : s.sourceKind, side === 'target' ? kind : s.targetKind) };
}
