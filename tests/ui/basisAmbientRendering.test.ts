import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BasisDimensionLab } from '../../src/labs/basis-dimension/BasisDimensionLab';
import { buildShareUrl, DEFAULT_3D_CAMERA_STATE, type BasisDimensionShareState } from '../../src/sharing';

afterEach(() => vi.unstubAllGlobals());

// 数学API単体では見逃す「表示対象と呼出しオプションの不一致」を、
// 実際の共有URL → 初期状態 → Labの解析 → マークアップの経路で検出する。
function render(state: BasisDimensionShareState): string {
  vi.stubGlobal('window', { location: { href: buildShareUrl('https://example.jp/lab/', state) } });
  return renderToStaticMarkup(createElement(BasisDimensionLab, { active: false }));
}

describe('D-087 基底・次元Labの対象空間と表示の統合回帰', () => {
  for (const dim of [2, 3] as const) {
    for (const representation of ['coordinate', 'polynomial'] as const) {
      for (const count of [1, 2, 3]) {
        it(`${dim}D ${representation}で一直線の${count}候補を空間全体の基底と表示しない`, () => {
          const markup = render({
            v: 1, lab: 'basis-dimension', dim, representation,
            vectors: [1, 2, 3].map((value, index) => ({
              id: `a${index + 1}`, name: `a${index + 1}`, coordinates: Array(dim).fill(value),
            })),
            candidateVectorIds: ['a1', 'a2', 'a3'].slice(0, count),
            linearCombination: { visible: true, target: Array(dim).fill(2) },
            comparisonBasisIds: ['a1'], camera: dim === 3 ? DEFAULT_3D_CAMERA_STATE : null,
          });
          expect(markup).toContain('この候補は基底ではありません');
          expect(markup).toContain(`候補のrank 1 と対象空間の次元 ${dim}を比較します。`);
          expect(markup).toContain('基底を選ぶことはできません');
          expect(markup).not.toContain('この例以外にも基底の取り方');
          expect(markup).not.toContain('座標ベクトルが唯一に定まります');
          expect(markup).toContain('比較用の座標を定義できません');
          expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>現在の基底を比較用に記録/);
          if (count === 1) expect(markup).toContain('このターゲットには一意な係数がありますが、座標とは呼べません');
        });
      }
    }
  }
});
