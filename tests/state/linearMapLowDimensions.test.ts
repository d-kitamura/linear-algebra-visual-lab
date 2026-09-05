import { describe, expect, it } from 'vitest';
import { analyzeLinearMap, analyzeLinearMapLinearity } from '../../src/domain';
import {
  LINEAR_MAP_SHAPES, createDefaultLinearMapScene, createDefaultLinearMapScenes,
  createLinearMapDefinition, createLinearMapSceneFromPreset, updateLinearMapInputFromDrag,
  updateLinearMapMatrixEntry, updateLinearMapInputVector,
} from '../../src/labs/linear-map/linearMapState';
import { createLinearMapInitialization, createLinearMapShareState } from '../../src/labs/linear-map/linearMapInitialization';

describe('10.6 線形写像の0〜3次元教材状態', () => {
  for (const shape of LINEAR_MAP_SHAPES) {
    it(`${shape.id}の初期状態と数学の次元が一致する`, () => {
      const scene = createDefaultLinearMapScene(shape.sourceDimension, shape.targetDimension);
      const definition = createLinearMapDefinition(scene);
      const analysis = analyzeLinearMap(definition, scene.inputVector);
      expect(scene.matrix).toHaveLength(shape.targetDimension);
      for (const row of scene.matrix) expect(row).toHaveLength(shape.sourceDimension);
      expect(scene.inputVector).toHaveLength(shape.sourceDimension);
      expect(scene.secondaryInputVector).toHaveLength(shape.sourceDimension);
      expect(analysis.imageVector).toHaveLength(shape.targetDimension);
      expect(analysis.rank + analysis.nullity).toBe(shape.sourceDimension);
      expect(analyzeLinearMapLinearity(definition, scene.inputVector, scene.secondaryInputVector, scene.scalar)).toMatchObject({
        preservesAddition: true, preservesScalarMultiplication: true,
      });
      if (shape.sourceDimension === 0 || shape.targetDimension === 0) {
        expect(analysis).toMatchObject({
          rank: 0, isInjective: shape.sourceDimension === 0,
          isSurjective: shape.targetDimension === 0,
          isBijective: shape.sourceDimension === 0 && shape.targetDimension === 0,
        });
        expect(() => updateLinearMapMatrixEntry(scene, 0, 0, 1)).toThrow(RangeError);
      }
      const initial = createLinearMapInitialization('https://example.jp/');
      if (shape.sourceDimension <= 1 || shape.targetDimension <= 1) {
        expect(() => createLinearMapShareState(initial.initialStates[shape.id])).toThrow('10.7');
      } else {
        expect(createLinearMapShareState(initial.initialStates[shape.id]).v).toBe(1);
      }
    });
  }

  it('16組を独立保持し、現在の状態編集で他の組とReset用初期状態を変えない', () => {
    const scenes = createDefaultLinearMapScenes();
    const initial = createLinearMapInitialization('https://example.jp/');
    expect(Object.keys(scenes)).toHaveLength(16);
    const changed = updateLinearMapMatrixEntry(scenes['1-to-1'], 0, 0, -3);
    const next = { ...scenes, '1-to-1': updateLinearMapInputVector(changed, [4]) };
    expect(analyzeLinearMap(createLinearMapDefinition(next['1-to-1']), [4]).imageVector).toEqual([-12]);
    expect(scenes['1-to-1'].matrix).toEqual([[2]]);
    expect(initial.initialStates['1-to-1'].scene.matrix).toEqual([[2]]);
    expect(next['1-to-2']).toEqual(scenes['1-to-2']);
  });

  it('1Dの拡大縮小・零写像・埋め込み・線形汎関数を編集できる', () => {
    expect(createLinearMapSceneFromPreset('zero-1').matrix).toEqual([[0]]);
    expect(createLinearMapSceneFromPreset('embedding-1-to-3').matrix).toEqual([[1], [1], [1]]);
    const scene = createLinearMapSceneFromPreset('functional-3-to-1');
    expect(analyzeLinearMap(createLinearMapDefinition(scene), [2, 3, -5]).imageVector).toEqual([0]);
    expect(updateLinearMapInputFromDrag(createDefaultLinearMapScene(1, 2), [2_000_000]).inputVector).toEqual([1_000_000]);
  });
});
