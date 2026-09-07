import type { SharedCameraState } from '../../sharing';
import type { PlaneViewport } from '../../visualization/planeGeometry';
import type { LineViewport } from '../../visualization/lineGeometry';
import { createRepresentationScene, REPRESENTATION_DIMENSIONS, type BasisSide, type RepresentationDimension, type RepresentationScene } from './representationMatrixState';

export type RepresentationShapeId = `${RepresentationDimension}-to-${RepresentationDimension}`;
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
  readonly changeScenes: Readonly<Record<RepresentationDimension, RepresentationScene>>;
  readonly changeViews: Readonly<Record<RepresentationDimension, RepresentationViewState>>;
  readonly changeDirections: Readonly<Record<RepresentationDimension, BasisChangeDirection>>;
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
    mode: 'map', changeDimension: 2,
    changeScenes: Object.fromEntries(REPRESENTATION_DIMENSIONS.map((n) => [n, createBasisChangeScene(n)])) as Record<RepresentationDimension, RepresentationScene>,
    changeViews: Object.fromEntries(REPRESENTATION_DIMENSIONS.map((n) => [n, createRepresentationViewState()])) as Record<RepresentationDimension, RepresentationViewState>,
    changeDirections: { 1: 'B-to-C', 2: 'B-to-C', 3: 'B-to-C' },
    activeShapeId: '2-to-2',
    scenes: Object.fromEntries(entries) as Record<RepresentationShapeId, RepresentationScene>,
    views: Object.fromEntries(entries.map(([id]) => [id, createRepresentationViewState()])) as Record<RepresentationShapeId, RepresentationViewState>,
  };
}
/** Resetは現在の場面だけ。共有導入時はこの初期値取得をInitialStateへ接続する。 */
export function resetRepresentationWorkspace(workspace: RepresentationWorkspace): RepresentationWorkspace {
  if (workspace.mode === 'basis-change') {
    const n = workspace.changeDimension;
    return { ...workspace, changeScenes: { ...workspace.changeScenes, [n]: createBasisChangeScene(n) },
      changeViews: { ...workspace.changeViews, [n]: createRepresentationViewState() },
      changeDirections: { ...workspace.changeDirections, [n]: 'B-to-C' } };
  }
  const id = workspace.activeShapeId;
  const definition = workspace.scenes[id].definition;
  return { ...workspace,
    scenes: { ...workspace.scenes, [id]: createRepresentationScene(definition.sourceDimension as RepresentationDimension, definition.targetDimension as RepresentationDimension) },
    views: { ...workspace.views, [id]: createRepresentationViewState() },
  };
}

/** 同じ空間の恒等写像。通常の写像状態をコピー・上書きしない。 */
export function createBasisChangeScene(n: RepresentationDimension, example: BasisChangeExample = 'oblique'): RepresentationScene {
  const initial = createRepresentationScene(n, n);
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
  return w.mode === 'map' ? w.scenes[w.activeShapeId] : w.changeScenes[w.changeDimension];
}
export function activeRepresentationViews(w: RepresentationWorkspace): RepresentationViewState {
  return w.mode === 'map' ? w.views[w.activeShapeId] : w.changeViews[w.changeDimension];
}
export function updateActiveRepresentationScene(w: RepresentationWorkspace, update: (scene: RepresentationScene) => RepresentationScene): RepresentationWorkspace {
  if (w.mode === 'map') return { ...w, scenes: { ...w.scenes, [w.activeShapeId]: update(w.scenes[w.activeShapeId]) } };
  const current = w.changeScenes[w.changeDimension];
  const next = update(current);
  // UIを経由しない更新でも恒等写像と同じ空間の次元を維持する。
  if (next.source.dimension !== w.changeDimension || next.target.dimension !== w.changeDimension || next.input.length !== w.changeDimension) return w;
  return { ...w, changeScenes: { ...w.changeScenes, [w.changeDimension]: { ...next, definition: current.definition } } };
}
export function updateActiveRepresentationViews(w: RepresentationWorkspace, update: (views: RepresentationViewState) => RepresentationViewState): RepresentationWorkspace {
  return w.mode === 'map' ? { ...w, views: { ...w.views, [w.activeShapeId]: update(w.views[w.activeShapeId]) } }
    : { ...w, changeViews: { ...w.changeViews, [w.changeDimension]: update(w.changeViews[w.changeDimension]) } };
}
export function selectRepresentationDimension(w: RepresentationWorkspace, side: BasisSide, n: RepresentationDimension): RepresentationWorkspace {
  if (!REPRESENTATION_DIMENSIONS.includes(n)) return w;
  if (w.mode === 'basis-change') return { ...w, changeDimension: n };
  const scene = activeRepresentationScene(w);
  return { ...w, activeShapeId: representationShapeId(side === 'source' ? n : scene.source.dimension as RepresentationDimension,
    side === 'target' ? n : scene.target.dimension as RepresentationDimension) };
}
