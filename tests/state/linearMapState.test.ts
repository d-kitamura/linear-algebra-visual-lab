import { describe, expect, it } from 'vitest';
import {
  LINEAR_MAP_PRESETS,
  createDefaultLinearMapScene,
  createLinearMapDefinition,
  createLinearMapSceneFromPreset,
  findMatchingLinearMapPreset,
  setTransformedGridVisibility,
  updateLinearMapInputFromDrag,
  updateLinearMapInputVector,
  updateLinearMapMatrixEntry,
} from '../../src/labs/linear-map/linearMapState';

describe('linear-map 2D scene state', () => {
  it('creates an independently cloned default shear scene', () => {
    const first = createDefaultLinearMapScene();
    const second = createDefaultLinearMapScene();

    expect(first).toEqual({
      matrix: [[1, 1], [0, 1]],
      inputVector: [2, 1],
      showTransformedGrid: true,
    });
    expect(first).not.toBe(second);
    expect(first.matrix).not.toBe(second.matrix);
    expect(first.inputVector).not.toBe(second.inputVector);
  });

  it('provides the six 9.3 representative transformations', () => {
    expect(LINEAR_MAP_PRESETS.map((preset) => preset.id)).toEqual([
      'identity',
      'rotation',
      'reflection',
      'shear',
      'scaling',
      'rank-one',
    ]);
  });

  it('keeps the input and grid preference while applying a preset', () => {
    const scene = createLinearMapSceneFromPreset('rotation', [-3, 4], false);

    expect(scene).toEqual({
      matrix: [[0, -1], [1, 0]],
      inputVector: [-3, 4],
      showTransformedGrid: false,
    });
    expect(findMatchingLinearMapPreset(scene.matrix)).toBe('rotation');
  });

  it('updates one matrix entry without mutating the previous scene', () => {
    const source = createDefaultLinearMapScene();
    const result = updateLinearMapMatrixEntry(source, 1, 0, -2.5);

    expect(result.matrix).toEqual([[1, 1], [-2.5, 1]]);
    expect(source.matrix).toEqual([[1, 1], [0, 1]]);
    expect(findMatchingLinearMapPreset(result.matrix)).toBeNull();
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
});
