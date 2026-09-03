import { describe, expect, it } from 'vitest';
import { buildShareUrl, type LinearMapShareState } from '../../src/sharing';
import {
  createLinearMapInitialization,
  createLinearMapShareState,
} from '../../src/labs/linear-map/linearMapInitialization';

const shared: LinearMapShareState = {
  v: 1,
  lab: 'linear-map',
  sourceDimension: 3,
  targetDimension: 2,
  matrix: [[1, 0, 1], [0, 1, -1]],
  inputVector: [3, 2, 1],
  secondaryInputVector: [-1, 4, 2],
  scalar: -0.5,
  visualization: {
    showTransformedGrid: false,
    domainCamera: {
      direction: [0.70710678, -0.70710678, 0],
      target: [1, 2, 3],
      up: [0, 0, 1],
      zoom: 1.25,
    },
    codomainCamera: null,
  },
};

describe('線形写像Labの共有InitialState', () => {
  it('共有URLから対象次元組、数学状態、カメラを復元する', () => {
    const initialization = createLinearMapInitialization(
      buildShareUrl('https://example.jp/lab/', shared),
    );

    expect(initialization.activeShapeId).toBe('3-to-2');
    expect(initialization.source).toBe('shared');
    expect(createLinearMapShareState(initialization.initialStates['3-to-2'])).toEqual(shared);
    expect(initialization.initialStates['2-to-2'].scene.matrix).toEqual([[1, 1], [0, 1]]);
  });

  it('stateなしと他Labのstateは既定状態を使う', () => {
    expect(createLinearMapInitialization('https://example.jp/lab/').source).toBe('default');
    const vectorSpaceUrl = buildShareUrl('https://example.jp/lab/', {
      v: 3,
      lab: 'vector-space',
      dim: 2,
      vectors: [],
      spanSelection: [],
      visualization: { showSpan: true, camera: null },
      linearCombination: { visible: false, target: null },
    });
    expect(createLinearMapInitialization(vectorSpaceUrl).source).toBe('default');
  });

  it('壊れた共有URLは既定例へ安全に戻す', () => {
    const initialization = createLinearMapInitialization(
      'https://example.jp/lab/?state=broken',
    );
    expect(initialization.source).toBe('fallback');
    expect(initialization.errorMessage).toContain('共有URLを復元できませんでした');
  });
});
