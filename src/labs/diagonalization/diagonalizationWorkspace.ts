import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createDiagonalizationScene, type DiagonalizationScene } from './diagonalizationScene';

export type DiagonalizationDimension = DiagonalizationScene['definition']['dimension'];
export interface DiagonalizationView {
  readonly plane: PlaneViewport | null;
  readonly line: LineViewport | null;
  readonly camera: SharedCameraState | null;
}
export interface DiagonalizationSlot {
  readonly scene: DiagonalizationScene;
  readonly views: { readonly reference: DiagonalizationView; readonly eigenbasis: DiagonalizationView };
}
export interface DiagonalizationWorkspace {
  readonly dimension: DiagonalizationDimension;
  readonly slots: Readonly<Record<DiagonalizationDimension, DiagonalizationSlot>>;
}
const emptyView = (): DiagonalizationView => ({ plane: null, line: null, camera: null });
const slot = (scene: DiagonalizationScene): DiagonalizationSlot => ({ scene, views: { reference: emptyView(), eigenbasis: emptyView() } });
/** 数ベクトル4場面のみ。多項式は13.5、共有による起動は13.6で接続する。 */
export function createDiagonalizationWorkspace(initialScene = createDiagonalizationScene()): DiagonalizationWorkspace {
  return { dimension: initialScene.definition.dimension, slots: {
    0: slot(createDiagonalizationScene(0)), 1: slot(createDiagonalizationScene(1)),
    2: slot(createDiagonalizationScene(2)), 3: slot(createDiagonalizationScene(3)),
    [initialScene.definition.dimension]: slot(initialScene),
  } };
}
export function updateDiagonalizationSlot(workspace: DiagonalizationWorkspace, dimension: DiagonalizationDimension,
  change: (slot: DiagonalizationSlot) => DiagonalizationSlot): DiagonalizationWorkspace {
  return { ...workspace, slots: { ...workspace.slots, [dimension]: change(workspace.slots[dimension]) } };
}
export function resetDiagonalizationWorkspace(workspace: DiagonalizationWorkspace, initial: DiagonalizationWorkspace): DiagonalizationWorkspace {
  return updateDiagonalizationSlot(workspace, workspace.dimension, () => initial.slots[workspace.dimension]);
}
