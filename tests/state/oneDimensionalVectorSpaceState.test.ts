import { describe, expect, it } from 'vitest';
import {
  addOneDimensionalVector,
  createInitialOneDimensionalVectorSpaceState,
  removeOneDimensionalVector,
} from '../../src/labs/vector-space/oneDimensionalState';

describe('oneDimensionalVectorSpaceState', () => {
  it('starts from one selected nonzero vector and no target', () => {
    expect(createInitialOneDimensionalVectorSpaceState()).toEqual({
      vectors: [{ id: 'a1', name: 'a1', coordinates: [2] }],
      spanSelection: ['a1'],
      showSpan: true,
      linearCombinationVisible: false,
      target: null,
    });
  });

  it('adds a selected 1D vector and reuses the first available name', () => {
    const initial = createInitialOneDimensionalVectorSpaceState();
    const withSecond = addOneDimensionalVector(initial).state;
    const withoutFirst = removeOneDimensionalVector(withSecond, 'a1');
    const result = addOneDimensionalVector(withoutFirst);

    expect(result.addedVector).toEqual({ id: 'a1', name: 'a1', coordinates: [1] });
    expect(result.state.spanSelection).toEqual(['a2', 'a1']);
  });

  it('removes a vector from both the collection and span selection', () => {
    const state = addOneDimensionalVector(
      createInitialOneDimensionalVectorSpaceState(),
    ).state;

    expect(removeOneDimensionalVector(state, 'a1')).toMatchObject({
      vectors: [{ id: 'a2' }],
      spanSelection: ['a2'],
    });
  });
});
