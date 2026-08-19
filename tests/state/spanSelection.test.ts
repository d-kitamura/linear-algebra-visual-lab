import { describe, expect, it } from 'vitest';
import { analyzeVectorSet, type VectorValue } from '../../src/domain';
import { selectSpanVectors, updateSpanSelection } from '../../src/state';

const vectors: readonly VectorValue[] = [
  { id: 'v1', name: 'v₁', coordinates: [2, 1] },
  { id: 'v2', name: 'v₂', coordinates: [-3, 2] },
];

describe('span selection', () => {
  it('selects vectors in display order rather than selection-array order', () => {
    expect(selectSpanVectors(vectors, ['v2', 'v1']).map((vector) => vector.id))
      .toEqual(['v1', 'v2']);
  });

  it('adds and removes a vector while preserving valid display order', () => {
    expect(updateSpanSelection(vectors, ['v2'], 'v1', true)).toEqual(['v1', 'v2']);
    expect(updateSpanSelection(vectors, ['v1', 'v2'], 'v1', false)).toEqual(['v2']);
  });

  it('produces rank 0, 1, and 2 for the empty, singleton, and full selections', () => {
    const ranks = [[], ['v1'], ['v1', 'v2']].map((selection) =>
      analyzeVectorSet({
        dimension: 2,
        vectors: selectSpanVectors(vectors, selection),
      }).rank,
    );

    expect(ranks).toEqual([0, 1, 2]);
  });
});
