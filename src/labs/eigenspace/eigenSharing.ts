import { DEFAULT_3D_CAMERA_STATE, readShareStateFromUrl, validateEigenspaceShareState, type EigenspaceShareState } from '../../sharing';
import { createEigenWorkspace, updateEigenSlot, type EigenSlot, type EigenWorkspace } from './eigenWorkspace';
import { createEigenScene } from './eigenScene';

/** 確定した現在場面だけを共有する。手動範囲・解析・タブ・他場面は保存しない。 */
export function createEigenShareState({ scene, view }: EigenSlot): EigenspaceShareState {
  if (scene.definition.dimension === 0) return validateEigenspaceShareState({ v: 1, lab: 'eigenspace', dim: 0 });
  return validateEigenspaceShareState({ v: 1, lab: 'eigenspace', kind: scene.kind, dim: scene.definition.dimension,
    matrix: scene.definition.matrix, input: scene.input, showEigenspace: scene.showEigenspace,
    camera: scene.definition.dimension === 3 ? view.camera ?? DEFAULT_3D_CAMERA_STATE : null });
}

export function restoreEigenWorkspace(input: EigenspaceShareState): EigenWorkspace {
  const s = validateEigenspaceShareState(input);
  if (s.dim === 0) return createEigenWorkspace(createEigenScene([]));
  const scene = { kind: s.kind, definition: { dimension: s.dim, matrix: s.matrix }, input: s.input, showEigenspace: s.showEigenspace };
  const workspace = createEigenWorkspace(scene);
  return updateEigenSlot(workspace, s.dim, (slot) => ({ ...slot, view: { ...slot.view, camera: s.camera } }));
}

/** 起動時に一度だけ呼ぶ。再エクスポートしても共有時Resetの基準は更新しない。 */
export function createEigenInitialization(href: string): { readonly initialWorkspace: EigenWorkspace; readonly errorMessage: string | null } {
  const result = readShareStateFromUrl(href);
  if (result.status === 'success' && result.state.lab === 'eigenspace') return { initialWorkspace: restoreEigenWorkspace(result.state), errorMessage: null };
  return { initialWorkspace: createEigenWorkspace(), errorMessage: result.status === 'error' ? result.error.message : null };
}
