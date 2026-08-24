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
  v: 3,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'a1', name: 'a₁', coordinates: [2, 1] },
    { id: 'a2', name: 'a₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['a1', 'a2'],
  visualization: { showSpan: true, camera: null },
  linearCombination: { visible: true, target: [3, -2] },
};

describe('vector collection editing', () => {
  it('adds a selected default vector with a stable ID, name, and coordinates', () => {
    const result = addDefaultVector(initialState);

    expect(result.addedVector).toEqual({ id: 'a3', name: 'a₃', coordinates: [1, 0] });
    expect(result.state.vectors).toHaveLength(3);
    expect(result.state.spanSelection).toEqual(['a1', 'a2', 'a3']);
  });

  it('skips suffixes already used by either an ID or a display name', () => {
    const state: ShareState = {
      ...initialState,
      vectors: [
        { id: 'custom', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'v', coordinates: [0, 1] },
      ],
      spanSelection: [],
    };

    expect(addDefaultVector(state).addedVector)
      .toEqual({ id: 'a3', name: 'a₃', coordinates: [1, 0] });
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
    const result = removeVector(initialState, 'a1');

    expect(result.vectors.map((vector) => vector.id)).toEqual(['a2']);
    expect(result.spanSelection).toEqual(['a2']);
    expect(result.linearCombination).toEqual(initialState.linearCombination);
    expect(removeVector(result, 'missing')).toBe(result);
  });

  it('allows an empty collection and keeps it mathematically independent', () => {
    const emptyState = removeVector(removeVector(initialState, 'a1'), 'a2');
    const analysis = analyzeVectorSet({ dimension: 2, vectors: emptyState.vectors });

    expect(emptyState.vectors).toEqual([]);
    expect(emptyState.spanSelection).toEqual([]);
    expect(analysis).toMatchObject({ rank: 0, isLinearlyIndependent: true });
  });

  it('round-trips an edited collection and target through share state v3', () => {
    const edited = removeVector(addDefaultVector(initialState).state, 'a1');

    expect(decodeShareState(encodeShareState(edited))).toEqual({
      ok: true,
      state: edited,
    });
  });
});
