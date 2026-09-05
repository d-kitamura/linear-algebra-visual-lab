import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinearMapLab } from '../../src/labs/linear-map/LinearMapLab';
import * as initialization from '../../src/labs/linear-map/linearMapInitialization';
import { LINEAR_MAP_SHAPES } from '../../src/labs/linear-map/linearMapState';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('10.6 全16次元組の画面統合回帰', () => {
  for (const shape of LINEAR_MAP_SHAPES) {
    it(`${shape.id}を空の入力欄や不正な座標へ押し込まず描画する`, () => {
      const initial = initialization.createLinearMapInitialization('https://example.jp/');
      vi.spyOn(initialization, 'createLinearMapInitialization').mockReturnValue({ ...initial, activeShapeId: shape.id });
      vi.stubGlobal('window', { location: { href: 'https://example.jp/' } });
      const markup = renderToStaticMarkup(createElement(LinearMapLab, { active: false }));
      expect(markup).toContain('定義域の次元');
      expect(markup).toContain('終域の次元');
      expect(markup).not.toMatch(/NaN|Infinity/);
      const fixed = shape.sourceDimension === 0 || shape.targetDimension === 0;
      if (fixed) {
        expect(markup).toContain('この次元組の線形写像は一つだけです');
        expect(markup).not.toContain('aria-label="行列Aの第');
        expect(markup).toContain(`${shape.targetDimension}行${shape.sourceDimension}列の空行列`);
      }
      if (shape.sourceDimension === 0) {
        expect(markup).not.toContain('aria-label="入力ベクトルuの成分"');
        expect(markup).not.toContain('aria-label="入力ベクトルwの成分"');
        expect(markup).toContain('定義域は零ベクトル空間です');
      }
      if (shape.sourceDimension === 1) expect(markup).toContain('linear-map-domain-line-title');
      if (shape.targetDimension === 1) expect(markup).toContain('linear-map-codomain-line-title');
      if (shape.sourceDimension <= 1 || shape.targetDimension <= 1) {
        expect(markup).toContain('10.7で有効になります');
        expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>共有URLをエクスポート/);
      } else expect(markup).not.toContain('10.7で有効になります');
    });
  }
});
