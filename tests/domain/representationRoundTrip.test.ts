import { describe, expect, it } from 'vitest';
import { analyzeBasisChangeRoundTrip, type VectorSet } from '../../src/domain';
import { createBasisChangeScene } from '../../src/labs/representation-matrix/representationWorkspace';
import { setRepresentationVector } from '../../src/labs/representation-matrix/representationMatrixState';

describe('11.5 座標変換の向きと往復の検算', () => {
  for (const n of [1, 2, 3] as const) for (const example of ['standard', 'order', 'oblique'] as const) {
    it(n + 'D ' + example + ' の両行列積と両往復を検証する', () => {
      const s = createBasisChangeScene(n, example);
      const result = analyzeBasisChangeRoundTrip(n, s.source, s.target, s.input);
      expect(result.status).toBe('ready');
      const identity = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0));
      expect(result.roundTrip!.productOnB).toEqual(identity);
      expect(result.roundTrip!.productOnC).toEqual(identity);
      expect(result.roundTrip!.returnedToB).toEqual(result.forward.representation!.inputCoordinates);
      expect(result.roundTrip!.returnedToC).toEqual(result.reverse.representation!.inputCoordinates);
    });
  }
  it('D-092のB→CとC→Bの値を区別し、同じwを再構成する', () => {
    const s = createBasisChangeScene(2);
    const r = analyzeBasisChangeRoundTrip(2, s.source, s.target, s.input);
    expect(r.forward.representation!.matrix).toEqual([[1, 1], [-1, 0]]);
    expect(r.reverse.representation!.matrix).toEqual([[0, -1], [1, 1]]);
    expect(r.forward.representation!.inputCoordinates).toEqual([1, 2]);
    expect(r.reverse.representation!.inputCoordinates).toEqual([3, -1]);
    expect(r.reverse.representation!.imageViaCoordinates).toEqual(s.input);
  });
  it('零基底・従属基底は往復の値を返さない', () => {
    const s = setRepresentationVector(createBasisChangeScene(2), 'source', 'u1', [0, 0]);
    const r = analyzeBasisChangeRoundTrip(2, s.source, s.target, s.input);
    expect(r.status).toBe('invalid-basis');
    expect(r.roundTrip).toBeNull();
  });
  it('微小入力の再構成失敗を基底不成立と区別する', () => {
    const s = createBasisChangeScene(1, 'standard');
    const r = analyzeBasisChangeRoundTrip(1, s.source, s.target, [1e-16]);
    expect(r.status).toBe('numerical-failure');
    expect(r.roundTrip).toBeNull();
  });
  it('0Dの空の恒等写像も矛盾なく扱う', () => {
    const empty: VectorSet = { dimension: 0, vectors: [] };
    expect(analyzeBasisChangeRoundTrip(0, empty, empty, []).roundTrip).toEqual({ productOnB: [], productOnC: [], returnedToB: [], returnedToC: [] });
  });
});
