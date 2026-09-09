import { describe, expect, it } from 'vitest';
import { analyzeEigenMap, analyzeEigenInput, InvalidEigenInputError, type EigenMapDefinition } from '../../src/domain';
import { eigenResidual } from '../../src/domain/eigenVectors';

const analyze = (matrix: number[][]) => analyzeEigenMap({ dimension: matrix.length, matrix } as EigenMapDefinition);
const examples = [
  { name: '0D', matrix: [], values: [], multiplicities: [], dimensions: [], coefficients: [1] },
  { name: '1D negative', matrix: [[-2]], values: [-2], multiplicities: [1], dimensions: [1], coefficients: [-2, -1] },
  { name: 'zero 1D', matrix: [[0]], values: [0], multiplicities: [1], dimensions: [1], coefficients: [0, -1] },
  { name: 'oblique 2D', matrix: [[2, 1], [1, 2]], values: [1, 3], multiplicities: [1, 1], dimensions: [1, 1], coefficients: [3, -4, 1] },
  { name: 'rotation', matrix: [[0, -1], [1, 0]], values: [], multiplicities: [], dimensions: [], coefficients: [1, 0, 1] },
  { name: 'projection', matrix: [[1, 0], [0, 0]], values: [0, 1], multiplicities: [1, 1], dimensions: [1, 1], coefficients: [0, -1, 1] },
  { name: 'scalar', matrix: [[2, 0], [0, 2]], values: [2], multiplicities: [2], dimensions: [2], coefficients: [4, -4, 1] },
  { name: 'Jordan 2D', matrix: [[2, 1], [0, 2]], values: [2], multiplicities: [2], dimensions: [1], coefficients: [4, -4, 1] },
  { name: 'conjugated Jordan', matrix: [[1, 1], [-1, 3]], values: [2], multiplicities: [2], dimensions: [1], coefficients: [4, -4, 1] },
  { name: 'plane and line', matrix: [[2, 0, 0], [0, 2, 0], [0, 0, -1]], values: [-1, 2], multiplicities: [1, 2], dimensions: [1, 2], coefficients: [-4, 0, 3, -1] },
  { name: 'oblique plane and line', matrix: [[1, -1, -1], [-1, 1, -1], [-1, -1, 1]], values: [-1, 2], multiplicities: [1, 2], dimensions: [1, 2], coefficients: [-4, 0, 3, -1] },
  { name: 'one real 3D', matrix: [[0, -1, 0], [1, 0, 0], [0, 0, 2]], values: [2], multiplicities: [1], dimensions: [1], coefficients: [2, -1, 2, -1] },
  { name: 'zero 3D', matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], values: [0], multiplicities: [3], dimensions: [3], coefficients: [0, 0, 0, -1] },
  { name: 'derivative', matrix: [[0, 1, 0], [0, 0, 2], [0, 0, 0]], values: [0], multiplicities: [3], dimensions: [1], coefficients: [0, 0, 0, -1] },
  { name: 'degree', matrix: [[0, 0, 0], [0, 1, 0], [0, 0, 2]], values: [0, 1, 2], multiplicities: [1, 1, 1], dimensions: [1, 1, 1], coefficients: [0, -2, 3, -1] },
  { name: 'translation', matrix: [[1, 1, 1], [0, 1, 2], [0, 0, 1]], values: [1], multiplicities: [3], dimensions: [1], coefficients: [1, -3, 3, -1] },
  { name: 'conjugated triple root', matrix: [[1, 1, 0], [-1, 3, 1], [0, 0, 2]], values: [2], multiplicities: [3], dimensions: [1], coefficients: [8, -12, 6, -1] },
];

describe('12.2 固有値・固有空間API', () => {
  for (const e of examples) it(e.name, () => {
    const r = analyze(e.matrix);
    expect(r.status).toBe(e.values.length ? 'ready' : 'no-real-eigenvalues');
    expect(r.spectrumComplete).toBe(true);
    expect(r.characteristicCoefficients).toEqual(e.coefficients);
    expect(r.realEigenvalues.map((v) => v.algebraicMultiplicity)).toEqual(e.multiplicities);
    expect(r.realEigenvalues.map((v) => v.eigenspace?.dimension)).toEqual(e.dimensions);
    expect(r.nonRealRootCount).toBe(e.matrix.length - e.multiplicities.reduce((a, b) => a + b, 0));
    r.realEigenvalues.forEach((root, i) => {
      expect(root.value).toBeCloseTo(e.values[i], 12);
      const basis = root.eigenspace!.basis;
      expect(basis).toHaveLength(e.dimensions[i]);
      basis.forEach((q, j) => {
        expect(q).toHaveLength(e.matrix.length);
        expect(Math.hypot(...q)).toBeCloseTo(1, 12);
        expect(eigenResidual(e.matrix, root.value, q)).toBeLessThanOrEqual(1e-12);
        basis.slice(0, j).forEach((p) => expect(q.reduce((s, v, k) => s + v * p[k], 0)).toBeCloseTo(0, 12));
        expect(analyzeEigenInput(r, q, i).eigenvectorStatus).toBe('eigenvector');
      });
    });
  });

  for (const e of [
    { matrix: [[0, 2], [1, 0]], roots: [-Math.SQRT2, Math.SQRT2] },
    { matrix: [[0, 0, 2], [1, 0, 0], [0, 1, 0]], roots: [Math.cbrt(2)] },
    { matrix: [[0, 1, 0], [1, 0, 1], [0, 1, 0]], roots: [-Math.SQRT2, 0, Math.SQRT2] },
  ]) it('非有理単根 ' + JSON.stringify(e.matrix), () => {
    const r = analyze(e.matrix);
    expect(r.status).toBe('ready');
    expect(r.realEigenvalues).toHaveLength(e.roots.length);
    r.realEigenvalues.forEach((v, i) => {
      expect(v.value).toBeCloseTo(e.roots[i], 12);
      expect(v.algebraicMultiplicity).toBe(1);
      expect(v.eigenspace?.dimension).toBe(1);
      expect(v.eigenspace!.maxRelativeResidual).toBeLessThanOrEqual(1e-12);
    });
  });

  it('小さい虚部を零にせず、重根の微小摂動を重根へ丸めない', () => {
    for (const epsilon of [1e-4, 1e-12, 1e-24]) {
      expect(analyze([[1, 1], [-epsilon, 1]]).status).toBe('no-real-eigenvalues');
      const real = analyze([[1, 1], [epsilon, 1]]);
      expect(real.status).not.toBe('no-real-eigenvalues');
      expect(real.realEigenvalues.every((r) => r.algebraicMultiplicity === 1)).toBe(true);
      if (real.status === 'ready') expect(real.realEigenvalues).toHaveLength(2);
    }
  });

  it('三角行列の小さい根と微小入力を無条件に零扱いしない', () => {
    for (const tiny of [1e-15, 1e-100, 1e-300, Number.MIN_VALUE]) {
      const r = analyze([[tiny]]);
      expect(r.status).toBe('ready');
      expect(r.realEigenvalues[0].value).toBe(tiny);
      const v = analyzeEigenInput(analyze([[2]]), [tiny], 0);
      expect(v.zeroStatus).toBe('nonzero');
      expect(v.eigenvectorStatus).toBe('eigenvector');
      expect(v.imageVector).toEqual([tiny * 2]);
    }
    expect(analyze([[1e-300, 0], [0, 1]]).realEigenvalues[0].value).toBe(1e-300);
  });

  it('小さい全体スケールでも符号と空間を維持する', () => {
    for (const scale of [1e-60, 1, 1e5]) {
      const r = analyze([[2 * scale, scale], [scale, 2 * scale]]);
      expect(r.status).toBe('ready');
      expect(r.realEigenvalues.map((v) => v.value / scale)).toEqual(expect.arrayContaining([expect.closeTo(1, 10), expect.closeTo(3, 10)]));
    }
  });

  it('互いにほぼ重なる固有直線は数学的な別根でも表示・吸着を保留する', () => {
    const r = analyze([[1, 1], [1e-24, 1]]);
    expect(r.status).toBe('inconclusive');
    expect(r.spectrumComplete).toBe(true);
    expect(r.realEigenvalues).toHaveLength(2);
    expect(r.realEigenvalues.every((v) => v.eigenspace === null)).toBe(true);
    expect(analyzeEigenInput(r, [1, 0], 0).eigenvectorStatus).toBe('inconclusive');
    // 根の差だけで統合しない。対角行列なら方向は十分区別できる。
    const diagonal = analyze([[1, 0], [0, 1 + 1e-12]]);
    expect(diagonal.status).toBe('ready');
    expect(diagonal.realEigenvalues).toHaveLength(2);
  });

  it('極端な根の精細化は有界で停止し、完全な一覧だと偽らない', () => {
    const r = analyze([[0, 0, 1e-300], [1, 0, 1], [0, 1, 0]]);
    expect(r.status).toBe('inconclusive');
    expect(r.issues).toContain('iteration-limit');
    expect(r.spectrumComplete).toBe(false);
    expect(r.nonRealRootCount).toBe(0);
    expect(r.realEigenvalues.some((root) => root.value === 0)).toBe(false);
  });

  it('整数の基底変換で作った非対称3D行列の根・重複度を保つ', () => {
    const identity = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const product = (a: number[][], b: number[][]) => a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
    for (let seed = 0; seed < 6; seed++) {
      let s = identity(), inverse = identity();
      for (let step = 0; step < 3; step++) {
        const e = identity(), undo = identity(), i = (seed + step) % 3, j = (i + 1) % 3;
        e[i][j] = (seed % 2 ? -1 : 1); undo[i][j] = -e[i][j];
        s = product(e, s); inverse = product(inverse, undo);
      }
      for (const source of [examples[9], examples[14], examples[16]]) {
        const r = analyze(product(product(s, source.matrix), inverse));
        expect(r.status).toBe('ready');
        expect(r.realEigenvalues.map((v) => v.algebraicMultiplicity)).toEqual(source.multiplicities);
        expect(r.realEigenvalues.map((v) => v.eigenspace?.dimension)).toEqual(source.dimensions);
        r.realEigenvalues.forEach((v, i) => expect(v.value).toBeCloseTo(source.values[i], 11));
      }
    }
  });

  it('係数・像のunderflowは偽の零多項式や零への写像にしない', () => {
    const r = analyze([[1e-200, 0], [0, 2e-200]]);
    expect(r.status).toBe('inconclusive');
    expect(r.characteristicCoefficients).toBeNull();
    expect(r.realEigenvalues).toHaveLength(2);
    const u = analyzeEigenInput(analyze([[1e-200]]), [1e-200], 0);
    expect(u.status).toBe('numerical-failure');
    expect(u.imageVector).toBeNull();
  });

  it('零入力・選択外の固有空間・非固有ベクトルを区別する', () => {
    const r = analyze([[1, 0], [0, 2]]);
    const other = analyzeEigenInput(r, [0, 1], 0);
    expect(other.selectionRelation).toBe('not-member');
    expect(other.eigenvectorStatus).toBe('eigenvector');
    expect(other.matchingEigenvalueIndices).toEqual([1]);
    expect(analyzeEigenInput(r, [1, 1], 0).eigenvectorStatus).toBe('not-eigenvector');
    const zero = analyzeEigenInput(r, [0, -0], 0);
    expect(zero.selectionRelation).toBe('member');
    expect(zero.eigenvectorStatus).toBe('zero-input');
    expect(analyzeEigenInput(analyze([]), []).eigenvectorStatus).toBe('zero-input');
    expect(analyzeEigenInput(analyze([[0, -1], [1, 0]]), [1, 0]).eigenvectorStatus).toBe('not-eigenvector');
  });

  it('所属の中間帯は保留し、存在しない選択を配列から推測しない', () => {
    const r = analyze([[1, 0], [0, 2]]);
    expect(analyzeEigenInput(r, [1, 1e-9], 0).selectionRelation).toBe('inconclusive');
    expect(analyzeEigenInput(r, [1, 0], 2).selectionRelation).toBe('no-selection');
    const pending = { ...r, spectrumComplete: false, realEigenvalues: [] };
    expect(analyzeEigenInput(pending, [1, 1]).eigenvectorStatus).toBe('inconclusive');
  });

  it('入力を変更せず、解析を不変のスナップショットにする', () => {
    const matrix = [[2, 1], [1, 2]], r = analyze(matrix);
    matrix[0][0] = 99;
    expect(r.definition.matrix[0][0]).toBe(2);
    expect(Object.isFrozen(r.realEigenvalues[0].eigenspace!.basis[0])).toBe(true);
    expect(analyze([[2, 1], [1, 2]])).toEqual(r);
  });

  it('形状・非有限・上限・選択の構造不正は例外', () => {
    for (const matrix of [[[1, 2]], [[NaN]], [[Infinity]], [[1000001]]]) expect(() => analyze(matrix)).toThrow(InvalidEigenInputError);
    expect(() => analyzeEigenMap({ dimension: 4, matrix: [] } as unknown as EigenMapDefinition)).toThrow(InvalidEigenInputError);
    const r = analyze([[1]]);
    for (const input of [[], [NaN], [1000001]]) expect(() => analyzeEigenInput(r, input)).toThrow(InvalidEigenInputError);
    for (const index of [-1, 0.5, 3, NaN]) expect(() => analyzeEigenInput(r, [1], index)).toThrow(InvalidEigenInputError);
  });
});
