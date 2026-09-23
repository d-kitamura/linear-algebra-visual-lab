import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const contract = read('docs/INNER_PRODUCT_API_CONTRACT.md');
const dot = (u: readonly number[], v: readonly number[]) => u.reduce((s, x, i) => s + x * v[i], 0);
const closeVector = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 13));
};

describe('14.1 内積・GSの具体契約', () => {
  // 固定した手計算例を検算する。将来のGSソルバーを先行実装するテストではない。
  it('数2Dの射影、再構成、直交単位性の独立期待値を検算する', () => {
    const u = [1, 1], v = [1, 0], p = [0.5, 0.5], r = [0.5, -0.5];
    expect(dot(u, v)).toBe(1);
    expect(dot(u, r)).toBe(0);
    closeVector(p.map((x, i) => x + r[i]), v);
    expect(Math.acos(dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v))) * 180 / Math.PI).toBeCloseTo(45);
    const q = [[1 / Math.sqrt(2), 1 / Math.sqrt(2)], [1 / Math.sqrt(2), -1 / Math.sqrt(2)]];
    q.forEach((a, i) => q.forEach((b, j) => expect(dot(a, b)).toBeCloseTo(Number(i === j), 14)));
  });

  it('数3Dの固定したwと一次結合係数が元入力を再構成する', () => {
    const a = [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
    const w = [[1, 1, 0], [0.5, -0.5, 1], [-2 / 3, 2 / 3, 2 / 3]];
    const coefficients = [[1, 0, 0], [0.5, 1, 0], [0.5, 1 / 3, 1]];
    coefficients.forEach((c, i) => closeVector([0, 1, 2].map(k => c.reduce((s, x, j) => s + x * w[j][k], 0)), a[i]));
    w.forEach((u, i) => w.forEach((v, j) => {
      if (i !== j) expect(dot(u, v)).toBeCloseTo(0, 14);
    }));
    [2, 1.5, 4 / 3].forEach((normSquared, i) => expect(dot(w[i], w[i])).toBeCloseTo(normSquared, 14));
  });

  it('1〜3Dの積分表示座標を手計算の逆変換で元係数へ戻せる', () => {
    for (const b of [[2], [2, -3], [2, -3, 4]]) {
      const z = [Math.sqrt(2) * (b[0] + (b[2] ?? 0) / 3),
        Math.sqrt(2 / 3) * (b[1] ?? 0), Math.sqrt(8 / 45) * (b[2] ?? 0)].slice(0, b.length);
      const b2 = (z[2] ?? 0) / Math.sqrt(8 / 45);
      closeVector([z[0] / Math.sqrt(2) - b2 / 3, (z[1] ?? 0) / Math.sqrt(2 / 3), b2].slice(0, b.length), b);
    }
    // 元の入力上限と表示座標の上限は異なる。
    expect(Math.sqrt(2) * (1e6 + 1e6 / 3)).toBeGreaterThan(1e6);
  });

  it('小さいノルム二乗のunderflowと零・正規化を混同しない契約を残す', () => {
    const tiny = 1e-200;
    expect(tiny * tiny).toBe(0);
    expect(Math.hypot(0, tiny)).toBe(tiny);
    expect(tiny / Math.hypot(0, tiny)).toBe(1);
    expect(Number.MIN_VALUE * Number.MIN_VALUE).toBe(0);
    expect(Number.MIN_VALUE / Number.MIN_VALUE).toBe(1);
    for (const phrase of ['ノルム二乗の表示不能だけでGSを止めず', '非零成分が消えればinconclusive',
      '32768', '65536', '20000', '200000', '1e-12', '32×Number.EPSILON',
      '分母に一律の1を足さず', '固有値・対角化の回帰を必須', '図だけ保留']) expect(contract).toContain(phrase);
  });

  it('共有JSONは入力の順序・段階を持ち、0Dでもモードを保持する', () => {
    const examples = [...contract.matchAll(/```json\r?\n([^`]+)```/g)].map(m => JSON.parse(m[1]));
    expect(examples).toHaveLength(2);
    expect(examples[0]).toEqual({ v: 1, lab: 'inner-product', kind: 'coordinate', dim: 2,
      metric: 'euclidean', inputs: [{ id: 1, components: [1, 1] }, { id: 2, components: [1, 0] }],
      mode: 'gram-schmidt', pair: [1, 2], stage: { inputId: 2, phase: 'projection', count: 1 },
      showGeometry: true, camera: null });
    expect(examples[1]).toEqual({ v: 1, lab: 'inner-product', dim: 0, mode: 'pair' });
    for (const phrase of ['局所編集時の段階退避', '外部URL復元時の厳密な照合', 'availableStagesとの完全一致',
      '起動時snapshot', '2048文字']) {
      expect(contract).toContain(phrase);
    }
  });

  it('D-131承認とD-132確認待ち、共有の構造・意味検証境界を揃える', () => {
    expect(contract).toContain('D-125・D-126・D-127は利用者承認済み');
    expect(contract).toContain('D-132確認待ち');
    expect(contract).toContain('## 16. 14.8授業資料');
    expect(contract).toContain('## 14. 14.6多項式と内積対応座標');
    expect(contract).toContain('## 13. 14.5数0D・1D・3D接続');
    expect(contract).toContain('## 12. 14.4数2Dグラム・シュミット接続');
    expect(contract).toContain('共有デコーダーと対象Labの意味検証を接続済み');
    expect(contract).toContain('basisOfAmbient');
    expect(contract).toContain('skipped-dependent');
    expect(contract).toContain('零ベクトルは任意のベクトルと内積0だが、角度90度とはしない');
    expect(read('math-writing-rules.txt')).toContain('内積・正規直交基底Labの採用記号（D-125承認');
    expect(read('docs/DECISIONS.md')).toContain('### D-126');
    expect(read('src/app/App.tsx')).toContain('InnerProductLab');
    expect(read('src/sharing/shareState.ts')).toContain("lab: 'inner-product'");
  });
});
