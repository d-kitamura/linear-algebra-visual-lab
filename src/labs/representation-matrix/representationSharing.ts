import { DEFAULT_3D_CAMERA_STATE, REPRESENTATION_MATRIX_SHARE_STATE_VERSION, readShareStateFromUrl, validateRepresentationMatrixShareState, type RepresentationMatrixShareState } from '../../sharing';
import { createRepresentationScene, type BasisSide, type RepresentationScene } from './representationMatrixState';
import { createRepresentationWorkspace, createRepresentationViewState, representationSceneId, representationChangeId, type RepresentationWorkspace, type RepresentationViewState, type RepresentationMode, type BasisChangeDirection } from './representationWorkspace';

/** commit済みの教材状態だけを保存する。数値は丸めず、派生値と手動表示範囲は除く。 */
export function createRepresentationShareState(scene: RepresentationScene, views: RepresentationViewState, mode: RepresentationMode = 'map', direction: BasisChangeDirection = 'B-to-C'): RepresentationMatrixShareState {
  const basis = (side: BasisSide) => scene[side].vectors.map((v) => {
    const prefix = side === 'source' ? 'u' : 'v';
    // 固定名の仕様違反を黙って修復せず、エクスポートを止める。
    if (v.name !== v.id || !new RegExp(`^${prefix}[1-3]$`).test(v.id)) throw new Error('基底候補の名前が正しくありません。');
    return { index: Number(v.id.slice(1)), coordinates: [...v.coordinates] };
  });
  return validateRepresentationMatrixShareState({
    v: REPRESENTATION_MATRIX_SHARE_STATE_VERSION, lab: 'representation-matrix', mode,
    sourceDimension: scene.source.dimension, targetDimension: scene.target.dimension,
    sourceKind: scene.sourceKind, targetKind: scene.targetKind,
    matrix: scene.definition.matrix, sourceBasis: basis('source'), targetBasis: basis('target'), input: scene.input,
    direction: mode === 'basis-change' ? direction : null,
    cameras: { source: scene.source.dimension === 3 ? views.cameras.source ?? DEFAULT_3D_CAMERA_STATE : null,
      target: scene.target.dimension === 3 ? views.cameras.target ?? DEFAULT_3D_CAMERA_STATE : null },
  });
}

export function restoreRepresentationWorkspace(input: RepresentationMatrixShareState): RepresentationWorkspace {
  const s = validateRepresentationMatrixShareState(input);
  const initial = createRepresentationScene(s.sourceDimension, s.targetDimension, s.sourceKind, s.targetKind);
  const basis = (side: BasisSide) => ({ ...initial[side], vectors: (side === 'source' ? s.sourceBasis : s.targetBasis).map((v) => {
    const name = (side === 'source' ? 'u' : 'v') + v.index;
    return { id: name, name, coordinates: [...v.coordinates] };
  }) });
  const scene: RepresentationScene = { ...initial, definition: { ...initial.definition, matrix: s.matrix }, source: basis('source'), target: basis('target'), input: s.input };
  const views = { ...createRepresentationViewState(), cameras: s.cameras };
  const w = createRepresentationWorkspace();
  if (s.mode === 'map') {
    const id = representationSceneId(s.sourceDimension, s.targetDimension, s.sourceKind, s.targetKind);
    return { ...w, activeShapeId: id, scenes: { ...w.scenes, [id]: scene }, views: { ...w.views, [id]: views } };
  }
  const id = representationChangeId({ changeDimension: s.sourceDimension, changeKind: s.sourceKind });
  return { ...w, mode: 'basis-change', changeDimension: s.sourceDimension, changeKind: s.sourceKind,
    changeScenes: { ...w.changeScenes, [id]: scene }, changeViews: { ...w.changeViews, [id]: views },
    changeDirections: { ...w.changeDirections, [id]: s.direction! } };
}

/** 起動時に一度だけ読み取り、以後のエクスポートではReset基準を変更しない。 */
export function createRepresentationInitialization(href: string): { readonly initialWorkspace: RepresentationWorkspace; readonly errorMessage: string | null } {
  const result = readShareStateFromUrl(href);
  if (result.status === 'success' && result.state.lab === 'representation-matrix') return { initialWorkspace: restoreRepresentationWorkspace(result.state), errorMessage: null };
  return { initialWorkspace: createRepresentationWorkspace(), errorMessage: result.status === 'error' ? result.error.message : null };
}
