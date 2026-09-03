import { describe, expect, it } from 'vitest';
import {
  DEFAULT_3D_CAMERA_STATE,
  LINEAR_MAP_SHARE_STATE_VERSION,
  decodeShareState,
  encodeShareState,
  validateLinearMapShareState,
  type LinearMapShareState,
} from '../../src/sharing';

const example: LinearMapShareState = {
  v: 1,
  lab: 'linear-map',
  sourceDimension: 3,
  targetDimension: 3,
  matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 0]],
  inputVector: [2, 1, 3],
  secondaryInputVector: [-1, 2, 0.5],
  scalar: -2,
  visualization: {
    showTransformedGrid: false,
    domainCamera: DEFAULT_3D_CAMERA_STATE,
    codomainCamera: {
      ...DEFAULT_3D_CAMERA_STATE,
      target: [1, -2, 0],
      zoom: 1.5,
    },
  },
};

describe('線形写像Lab共有状態v1', () => {
  it('行列、入力、線形性入力、2つのカメラを決定的に往復する', () => {
    expect(LINEAR_MAP_SHARE_STATE_VERSION).toBe(1);
    const encoded = encodeShareState(example);

    expect(decodeShareState(encoded)).toEqual({ ok: true, state: example });
    expect(encodeShareState(example)).toBe(encoded);
  });

  it('2D表示ではカメラを持たず、2→2だけ格子の像を許す', () => {
    const twoDimensional: LinearMapShareState = {
      ...example,
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 1], [0, 1]],
      inputVector: [2, 1],
      secondaryInputVector: [1, -1],
      visualization: {
        showTransformedGrid: true,
        domainCamera: null,
        codomainCamera: null,
      },
    };
    expect(validateLinearMapShareState(twoDimensional)).toEqual(twoDimensional);
    expect(() => validateLinearMapShareState({
      ...twoDimensional,
      visualization: { ...twoDimensional.visualization, domainCamera: DEFAULT_3D_CAMERA_STATE },
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateLinearMapShareState({
      ...example,
      sourceDimension: 2,
      targetDimension: 3,
      matrix: [[1, 0], [0, 1], [0, 0]],
      inputVector: [2, 1],
      secondaryInputVector: [1, -1],
      visualization: {
        showTransformedGrid: true,
        domainCamera: null,
        codomainCamera: DEFAULT_3D_CAMERA_STATE,
      },
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('3D表示にカメラを必須とする', () => {
    expect(() => validateLinearMapShareState({
      ...example,
      visualization: { ...example.visualization, domainCamera: null },
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('行列形状、座標範囲、未知フィールド、版を拒否する', () => {
    expect(() => validateLinearMapShareState({ ...example, matrix: [[1, 0], [0, 1]] }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateLinearMapShareState({ ...example, scalar: 1_000_001 }))
      .toThrowError(expect.objectContaining({ code: 'COORDINATE_LIMIT_EXCEEDED' }));
    expect(() => validateLinearMapShareState({ ...example, activeTab: 'linearity' }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }));
    expect(() => validateLinearMapShareState({ ...example, v: 2 }))
      .toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_VERSION' }));
  });
});
