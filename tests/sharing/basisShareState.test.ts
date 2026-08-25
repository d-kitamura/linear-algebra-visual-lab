import { describe, expect, it } from 'vitest';
import {
  BASIS_DIMENSION_SHARE_STATE_VERSION,
  DEFAULT_3D_CAMERA_STATE,
  decodeShareState,
  encodeShareState,
  validateBasisDimensionShareState,
  type BasisDimensionShareState,
} from '../../src/sharing';

const example: BasisDimensionShareState = {
  v: 1,
  lab: 'basis-dimension',
  dim: 3,
  vectors: [
    { id: 'a1', name: 'a1', coordinates: [1, 0, 0] },
    { id: 'a2', name: 'a2', coordinates: [0, 1, 0] },
    { id: 'a3', name: 'a3', coordinates: [0, 0, 1] },
    { id: 'a4', name: 'a4', coordinates: [1, 1, 1] },
  ],
  candidateVectorIds: ['a2', 'a1', 'a3'],
  representation: 'polynomial',
  linearCombination: { visible: true, target: [2, 3, 4] },
  comparisonBasisIds: ['a1', 'a2', 'a3'],
  camera: DEFAULT_3D_CAMERA_STATE,
};

describe('基底・次元Lab共有状態v1', () => {
  it('Lab固有状態を決定的に往復する', () => {
    expect(BASIS_DIMENSION_SHARE_STATE_VERSION).toBe(1);
    const encoded = encodeShareState(example);
    expect(decodeShareState(encoded)).toEqual({ ok: true, state: example });
    expect(encodeShareState(example)).toBe(encoded);
  });

  it('2Dではカメラを持たず、候補と比較用基底は既知IDだけを許す', () => {
    const twoDimensional: BasisDimensionShareState = {
      ...example,
      dim: 2,
      vectors: example.vectors.map((vector) => ({
        ...vector,
        coordinates: vector.coordinates.slice(0, 2),
      })),
      candidateVectorIds: ['a1', 'a2'],
      linearCombination: { visible: false, target: null },
      comparisonBasisIds: null,
      camera: null,
    };
    expect(validateBasisDimensionShareState(twoDimensional)).toEqual(twoDimensional);
    expect(() => validateBasisDimensionShareState({
      ...twoDimensional,
      camera: DEFAULT_3D_CAMERA_STATE,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateBasisDimensionShareState({
      ...twoDimensional,
      candidateVectorIds: ['missing'],
    })).toThrowError(expect.objectContaining({ code: 'UNKNOWN_SPAN_VECTOR' }));
  });

  it('未知フィールド、表現方式、版を拒否する', () => {
    expect(() => validateBasisDimensionShareState({ ...example, temporaryTab: 'basis' }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateBasisDimensionShareState({ ...example, representation: 'graph' }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateBasisDimensionShareState({ ...example, v: 2 }))
      .toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_VERSION' }));
  });
});
