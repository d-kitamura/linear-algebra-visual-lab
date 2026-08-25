import { describe, expect, it } from 'vitest';
import { buildShareUrl, type BasisDimensionShareState } from '../../src/sharing';
import {
  createBasisDimensionInitialization,
  createBasisDimensionShareState,
} from '../../src/labs/basis-dimension/basisDimensionInitialization';

const shared: BasisDimensionShareState = {
  v: 1,
  lab: 'basis-dimension',
  dim: 2,
  vectors: [
    { id: 'a1', name: 'a1', coordinates: [2, 1] },
    { id: 'a2', name: 'a2', coordinates: [1, 2] },
    { id: 'a3', name: 'a3', coordinates: [3, 3] },
  ],
  candidateVectorIds: ['a2', 'a1'],
  representation: 'polynomial',
  linearCombination: { visible: true, target: [4, 5] },
  comparisonBasisIds: ['a1', 'a2'],
  camera: null,
};

describe('基底・次元Labの共有InitialState', () => {
  it('共有URLから対象次元と教材状態を復元する', () => {
    const initialization = createBasisDimensionInitialization(
      buildShareUrl('https://example.jp/lab/', shared),
    );
    expect(initialization.activeDimension).toBe(2);
    expect(initialization.source).toBe('shared');
    expect(createBasisDimensionShareState(initialization.initialStates[2])).toEqual(shared);
    expect(initialization.initialStates[3].representation).toBe('coordinate');
  });

  it('stateなしと他Labのstateは既定状態を使う', () => {
    expect(createBasisDimensionInitialization('https://example.jp/lab/').source).toBe('default');
    const vectorSpaceUrl = buildShareUrl('https://example.jp/lab/', {
      v: 3,
      lab: 'vector-space',
      dim: 2,
      vectors: [],
      spanSelection: [],
      visualization: { showSpan: true, camera: null },
      linearCombination: { visible: false, target: null },
    });
    expect(createBasisDimensionInitialization(vectorSpaceUrl).source).toBe('default');
  });

  it('壊れた共有URLは既定例へ安全に戻す', () => {
    const initialization = createBasisDimensionInitialization(
      'https://example.jp/lab/?state=broken',
    );
    expect(initialization.source).toBe('fallback');
    expect(initialization.errorMessage).toContain('共有URLを復元できませんでした');
  });
});
