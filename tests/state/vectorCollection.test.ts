import { describe, expect, it } from 'vitest';
import { analyzeVectorSet } from '../../src/domain';
import {
  MAX_SHARE_VECTORS,
  decodeShareState,
  encodeShareState,
  type ShareState,
} from '../../src/sharing';
import { addDefaultVector, removeVector } from '../../src/state';

const initialState: ShareState = {
  v: 2,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'v1', name: 'v₁', coordinates: [2, 1] },
    { id: 'v2', name: 'v₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['v1', 'v2'],
  visualization: { showSpan: true },
  linearCombination: { visible: true, target: [3, -2] },
};

describe('vector collection editing', () => {
  it('adds a selected default vector with a stable ID, name, and coordinates', () => {
    const result = addDefaultVector(initialState);

    expect(result.addedVector).toEqual({ id: 'v3', name: 'v₃', coordinates: [1, 0] });
    expect(result.state.vectors).toHaveLength(3);
    expect(result.state.spanSelection).toEqual(['v1', 'v2', 'v3']);
  });

  it('skips suffixes already used by either an ID or a display name', () => {
    const state: ShareState = {
      ...initialState,
      vectors: [
        { id: 'custom', name: 'v₁', coordinates: [1, 0] },
        { id: 'v2', name: 'a', coordinates: [0, 1] },
      ],
      spanSelection: [],
    };

    expect(addDefaultVector(state).addedVector)
      .toEqual({ id: 'v3', name: 'v₃', coordinates: [1, 0] });
  });

  it('creates the correct coordinate count for a future 3D state', () => {
    const state3d: ShareState = {
      ...initialState,
      dim: 3,
      vectors: [],
      spanSelection: [],
      linearCombination: { visible: false, target: null },
    };

    expect(addDefaultVector(state3d).addedVector?.coordinates).toEqual([1, 0, 0]);
  });

  it('does not add more than the shared-state safety limit', () => {
    const state: ShareState = {
      ...initialState,
      vectors: Array.from({ length: MAX_SHARE_VECTORS }, (_, index) => ({
        id: `v${index + 1}`,
        name: `vector-${index + 1}`,
        coordinates: [index + 1, 0],
      })),
      spanSelection: [],
    };
    const result = addDefaultVector(state);

    expect(result.addedVector).toBeNull();
    expect(result.state).toBe(state);
  });

  it('removes the vector and its span selection while preserving the others', () => {
    const result = removeVector(initialState, 'v1');

    expect(result.vectors.map((vector) => vector.id)).toEqual(['v2']);
    expect(result.spanSelection).toEqual(['v2']);
    expect(result.linearCombination).toEqual(initialState.linearCombination);
    expect(removeVector(result, 'missing')).toBe(result);
  });

  it('allows an empty collection and keeps it mathematically independent', () => {
    const emptyState = removeVector(removeVector(initialState, 'v1'), 'v2');
    const analysis = analyzeVectorSet({ dimension: 2, vectors: emptyState.vectors });

    expect(emptyState.vectors).toEqual([]);
    expect(emptyState.spanSelection).toEqual([]);
    expect(analysis).toMatchObject({ rank: 0, isLinearlyIndependent: true });
  });

  it('round-trips an edited collection and target through share state v2', () => {
    const edited = removeVector(addDefaultVector(initialState).state, 'v1');

    expect(decodeShareState(encodeShareState(edited))).toEqual({
      ok: true,
      state: edited,
    });
  });
});
