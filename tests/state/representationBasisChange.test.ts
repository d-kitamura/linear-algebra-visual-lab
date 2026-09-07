import { describe, expect, it } from 'vitest';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { editRepresentationValue, REPRESENTATION_DIMENSIONS } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationWorkspace, createBasisChangeScene, activeRepresentationScene, activeRepresentationViews,
  updateActiveRepresentationScene, updateActiveRepresentationViews, resetRepresentationWorkspace, selectRepresentationDimension } from '../../src/labs/representation-matrix/representationWorkspace';

describe('11.5 恒等写像モードの状態境界', () => {
  it('通常の写像・基底・入力・カメラを維持してモードを往復する', () => {
    let w = createRepresentationWorkspace();
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'matrix', 0, 1, 7));
    w = updateActiveRepresentationViews(w, (v) => ({ ...v, cameras: { ...v.cameras, source: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 } } }));
    const normal = activeRepresentationScene(w);
    const views = activeRepresentationViews(w);
    w = { ...w, mode: 'basis-change' };
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'input', 0, 0, 9));
    w = updateActiveRepresentationViews(w, (v) => ({ ...v, cameras: { ...v.cameras, source: { ...DEFAULT_3D_CAMERA_STATE, zoom: 3 } } }));
    const change = activeRepresentationScene(w);
    w = { ...w, mode: 'map' };
    expect(activeRepresentationScene(w)).toBe(normal);
    expect(activeRepresentationViews(w)).toBe(views);
    expect(activeRepresentationScene({ ...w, mode: 'basis-change' })).toBe(change);
    expect(activeRepresentationViews({ ...w, mode: 'basis-change' }).cameras.source?.zoom).toBe(3);
  });
  it('恒等写像の行列をUI外から更新しようとしても固定する', () => {
    let w = { ...createRepresentationWorkspace(), mode: 'basis-change' as const };
    const matrix = activeRepresentationScene(w).definition;
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'matrix', 0, 1, 9)) as typeof w;
    expect(activeRepresentationScene(w).definition).toBe(matrix);
    expect(matrix.matrix).toEqual([[1, 0], [0, 1]]);
    expect(updateActiveRepresentationScene(w, () => createBasisChangeScene(3))).toBe(w);
  });
  it('各次元と逆方向の選択を保持しResetは現在のモード・次元のみ', () => {
    let w = { ...createRepresentationWorkspace(), mode: 'basis-change' as const };
    const otherScene = w.changeScenes[2];
    w = selectRepresentationDimension(w, 'target', 3) as typeof w;
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'input', 2, 0, 9)) as typeof w;
    w = { ...w, changeDirections: { ...w.changeDirections, 3: 'C-to-B' } };
    const edited = activeRepresentationScene(w);
    w = selectRepresentationDimension(w, 'source', 1) as typeof w;
    w = selectRepresentationDimension(w, 'source', 3) as typeof w;
    expect(activeRepresentationScene(w)).toBe(edited);
    expect(w.changeDirections[3]).toBe('C-to-B');
    const reset = resetRepresentationWorkspace(w);
    expect(reset.changeDirections[3]).toBe('B-to-C');
    expect(reset.changeScenes[3].input).toEqual([3, 2, 1]);
    expect(reset.changeScenes[2]).toBe(otherScene);
    expect(reset.scenes).toBe(w.scenes);
    const normalReset = resetRepresentationWorkspace({ ...w, mode: 'map' });
    expect(normalReset.changeScenes).toBe(w.changeScenes);
  });
  for (const n of REPRESENTATION_DIMENSIONS) it(n + 'Dの例は恒等写像と名前・添え字を保持する', () => {
    for (const example of ['standard', 'order', 'oblique'] as const) {
      const scene = createBasisChangeScene(n, example);
      expect(scene.source.dimension).toBe(n);
      expect(scene.target.dimension).toBe(n);
      expect(scene.definition.matrix).toEqual(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0)));
      expect(scene.source.vectors.map((v) => v.id)).toEqual(Array.from({ length: n }, (_, i) => 'u' + (i + 1)));
    }
  });
});
