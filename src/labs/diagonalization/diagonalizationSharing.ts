import { analyzeDiagonalization } from '../../domain';
import { DEFAULT_3D_CAMERA_STATE, InvalidShareStateError, readShareStateFromUrl, validateDiagonalizationShareState, type DiagonalizationShareState } from '../../sharing';
import { createDiagonalizationScene, resolvedDiagonalizationOrder } from './diagonalizationScene';
import { createDiagonalizationWorkspace, updateDiagonalizationSlot, type DiagonalizationSlot, type DiagonalizationWorkspace } from './diagonalizationWorkspace';

/** 確定sceneだけを共有。解析・preview・下書き・手動1D/2D範囲は含めない。 */
export function createDiagonalizationShareState({ scene, views }: DiagonalizationSlot): DiagonalizationShareState {
  if (scene.definition.dimension === 0) return validateDiagonalizationShareState({ v: 1, lab: 'diagonalization', dim: 0 });
  const analysis = analyzeDiagonalization(scene.definition);
  return validateDiagonalizationShareState({ v: 1, lab: 'diagonalization', kind: scene.kind, dim: scene.definition.dimension,
    matrix: scene.definition.matrix, input: scene.input, order: resolvedDiagonalizationOrder(scene, analysis), showEigenspace: scene.showEigenspace,
    cameras: { reference: scene.definition.dimension === 3 ? views.reference.camera ?? DEFAULT_3D_CAMERA_STATE : null,
      eigenbasis: scene.definition.dimension === 3 ? views.eigenbasis.camera ?? DEFAULT_3D_CAMERA_STATE : null } });
}

export function restoreDiagonalizationWorkspace(input: DiagonalizationShareState): DiagonalizationWorkspace {
  const s = validateDiagonalizationShareState(input);
  if (s.dim === 0) return createDiagonalizationWorkspace(createDiagonalizationScene(0));
  const definition = { dimension: s.dim, matrix: s.matrix };
  const analysis = analyzeDiagonalization(definition);
  // nullを自動順に「修復」すると、共有した列の意味が変わる。不整合は明示して拒否。
  if ((analysis.basis !== null) !== (s.order !== null)) throw new InvalidShareStateError('INVALID_STATE',
    '共有された基底の列順と、行列から再計算した基底の有無が一致しません。', '$.order');
  const workspace = createDiagonalizationWorkspace({ kind: s.kind, definition, input: s.input, order: s.order, showEigenspace: s.showEigenspace });
  return updateDiagonalizationSlot(workspace, s.dim, (slot) => ({ ...slot, views: {
    reference: { ...slot.views.reference, camera: s.cameras.reference }, eigenbasis: { ...slot.views.eigenbasis, camera: s.cameras.eigenbasis },
  } }));
}

/** 起動時snapshotだけをReset基準にする。他LabのURLでは数学解析を行わない。 */
export function createDiagonalizationInitialization(href: string): { readonly initialWorkspace: DiagonalizationWorkspace; readonly errorMessage: string | null } {
  const result = readShareStateFromUrl(href);
  if (result.status === 'success' && result.state.lab === 'diagonalization') {
    try { return { initialWorkspace: restoreDiagonalizationWorkspace(result.state), errorMessage: null }; }
    catch (error) { return { initialWorkspace: createDiagonalizationWorkspace(), errorMessage: error instanceof Error ? error.message : '共有状態を復元できませんでした。' }; }
  }
  return { initialWorkspace: createDiagonalizationWorkspace(), errorMessage: result.status === 'error' ? result.error.message : null };
}
