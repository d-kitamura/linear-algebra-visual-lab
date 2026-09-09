import type { EigenMapDefinition } from '../../domain';
import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createEigenScene, createEigenSceneForDimension, type EigenScene } from './eigenScene';

export type EigenDimension = EigenMapDefinition['dimension'];
export interface EigenView {
  readonly plane: PlaneViewport | null;
  readonly line: LineViewport | null;
  readonly camera: SharedCameraState | null;
}
export interface EigenSlot { readonly scene: EigenScene; readonly view: EigenView }
export interface EigenWorkspace {
  readonly dimension: EigenDimension;
  readonly slots: Readonly<Record<EigenDimension, EigenSlot>>;
}
const emptyView = (): EigenView => ({ plane: null, line: null, camera: null });
export function createEigenWorkspace(initialScene: EigenScene = createEigenScene()): EigenWorkspace {
  const slot = (n: EigenDimension): EigenSlot => ({ scene: createEigenSceneForDimension(n), view: emptyView() });
  return { dimension: initialScene.definition.dimension, slots: {
    0: slot(0), 1: slot(1), 2: slot(2), 3: slot(3),
    [initialScene.definition.dimension]: { scene: initialScene, view: emptyView() },
  } };
}
export function updateEigenSlot(workspace: EigenWorkspace, dimension: EigenDimension, change: (slot: EigenSlot) => EigenSlot): EigenWorkspace {
  return { ...workspace, slots: { ...workspace.slots, [dimension]: change(workspace.slots[dimension]) } };
}
/** Resetは現在の次元だけ。ほかの次元の教材・手動範囲・カメラは変更しない。 */
export function resetEigenWorkspace(workspace: EigenWorkspace, initial: EigenWorkspace): EigenWorkspace {
  return updateEigenSlot(workspace, workspace.dimension, () => initial.slots[workspace.dimension]);
}
