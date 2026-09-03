import { describe, expect, it } from 'vitest';
import {
  LINEAR_MAP_PRESETS,
  LINEAR_MAP_SHAPES,
  createDefaultLinearMapScene,
  createDefaultLinearMapScenes,
  createLinearMapDefinition,
  createLinearMapSceneFromPreset,
  findMatchingLinearMapPreset,
  setTransformedGridVisibility,
  updateLinearMapInputFromDrag,
  updateLinearMapInputVector,
  updateLinearMapMatrixEntry,
  updateLinearMapScalar,
  updateLinearMapSecondaryInputVector,
} from '../../src/labs/linear-map/linearMapState';

describe('linear-map 2D scene state', () => {
  it('creates an independently cloned default shear scene', () => {
    const first = createDefaultLinearMapScene();
    const second = createDefaultLinearMapScene();

    expect(first).toEqual({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 1], [0, 1]],
      inputVector: [2, 1],
      secondaryInputVector: [1, -1],
      scalar: 2,
      showTransformedGrid: false,
    });
    expect(first).not.toBe(second);
    expect(first.matrix).not.toBe(second.matrix);
    expect(first.inputVector).not.toBe(second.inputVector);
  });

  it('provides the eight 9.6 representative 2D transformations', () => {
    expect(LINEAR_MAP_PRESETS.filter((preset) =>
      preset.sourceDimension === 2 && preset.targetDimension === 2,
    ).map((preset) => preset.id)).toEqual([
      'identity',
      'rotation',
      'reflection',
      'shear',
      'scaling',
      'projection-x',
      'rank-one',
      'zero-2',
    ]);
  });

  it('keeps the input and grid preference while applying a preset', () => {
    const scene = createLinearMapSceneFromPreset('rotation', [-3, 4], false, [5, -2], -1.5);

    expect(scene).toEqual({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[0, -1], [1, 0]],
      inputVector: [-3, 4],
      secondaryInputVector: [5, -2],
      scalar: -1.5,
      showTransformedGrid: false,
    });
    expect(findMatchingLinearMapPreset(scene)).toBe('rotation');
  });

  it('updates one matrix entry without mutating the previous scene', () => {
    const source = createDefaultLinearMapScene();
    const result = updateLinearMapMatrixEntry(source, 1, 0, -2.5);

    expect(result.matrix).toEqual([[1, 1], [-2.5, 1]]);
    expect(source.matrix).toEqual([[1, 1], [0, 1]]);
    expect(findMatchingLinearMapPreset(result)).toBeNull();
  });

  it('updates a valid input vector and rejects invalid dimensions or values', () => {
    const source = createDefaultLinearMapScene();

    expect(updateLinearMapInputVector(source, [-1, 3]).inputVector).toEqual([-1, 3]);
    expect(() => updateLinearMapInputVector(source, [1])).toThrow(RangeError);
    expect(() => updateLinearMapInputVector(source, [Number.NaN, 0])).toThrow(RangeError);
  });

  it('clamps drag coordinates to the shared editable range', () => {
    const source = createDefaultLinearMapScene();
    const result = updateLinearMapInputFromDrag(source, [2_000_000, -2_000_000]);

    expect(result.inputVector).toEqual([1_000_000, -1_000_000]);
  });

  it('updates the second input and scalar without mutating the previous scene', () => {
    const source = createDefaultLinearMapScene();
    const withSecondInput = updateLinearMapSecondaryInputVector(source, [-2, 4]);
    const withScalar = updateLinearMapScalar(withSecondInput, -0.5);

    expect(withScalar.secondaryInputVector).toEqual([-2, 4]);
    expect(withScalar.scalar).toBe(-0.5);
    expect(source.secondaryInputVector).toEqual([1, -1]);
    expect(source.scalar).toBe(2);
    expect(() => updateLinearMapSecondaryInputVector(source, [1])).toThrow(RangeError);
    expect(() => updateLinearMapScalar(source, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('toggles the transformed grid without changing the mathematical inputs', () => {
    const source = createDefaultLinearMapScene();
    const result = setTransformedGridVisibility(source, false);

    expect(result).toMatchObject({
      matrix: source.matrix,
      inputVector: source.inputVector,
      showTransformedGrid: false,
    });
  });

  it('creates a 2D-to-2D domain definition for the shared analyzer', () => {
    expect(createLinearMapDefinition(createDefaultLinearMapScene())).toEqual({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 1], [0, 1]],
    });
  });

  it('provides independent defaults for all four 2D and 3D dimension pairs', () => {
    const scenes = createDefaultLinearMapScenes();

    expect(LINEAR_MAP_SHAPES.map((shape) => shape.id)).toEqual([
      '2-to-2', '2-to-3', '3-to-2', '3-to-3',
    ]);
    expect(scenes['2-to-3']).toMatchObject({
      sourceDimension: 2,
      targetDimension: 3,
      matrix: [[1, 0], [0, 1], [0, 0]],
    });
    expect(scenes['3-to-2']).toMatchObject({
      sourceDimension: 3,
      targetDimension: 2,
      matrix: [[1, 0, 0], [0, 1, 0]],
      secondaryInputVector: [1, -1, 2],
      scalar: 2,
    });
    expect(scenes['3-to-3']).toMatchObject({
      sourceDimension: 3,
      targetDimension: 3,
      matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 0]],
    });
    expect(scenes['2-to-2']).not.toBe(scenes['2-to-3']);
  });

  it('updates rectangular and 3D matrices without mutating the previous scene', () => {
    const source = createDefaultLinearMapScene(3, 3);
    const result = updateLinearMapMatrixEntry(source, 2, 2, 4);

    expect(result.matrix[2][2]).toBe(4);
    expect(source.matrix[2][2]).toBe(0);
    expect(updateLinearMapInputVector(source, [1, 2, 3]).inputVector).toEqual([1, 2, 3]);
    expect(() => updateLinearMapInputVector(source, [1, 2])).toThrow(RangeError);
  });
});
