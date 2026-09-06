import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeVectorSet, analyzeLinearMap, analyzeBasisCandidate, analyzeLinearCombination } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl, encodeShareState, validateSharedState, createShareQrCodeDataUrl } from '../../src/sharing';
import { createAppInitialization } from '../../src/state';
import { createBasisDimensionInitialization, createBasisDimensionShareState } from '../../src/labs/basis-dimension/basisDimensionInitialization';
import { createLinearMapInitialization, createLinearMapShareState } from '../../src/labs/linear-map/linearMapInitialization';
import { oneDimensionalStateFromShare, oneDimensionalStateToShare } from '../../src/labs/vector-space/oneDimensionalState';
import { LOW_DIMENSIONAL_TEACHING_SCENARIOS } from '../../src/teaching';
import { VectorSpaceLab } from '../../src/labs/vector-space/VectorSpaceLab';
import { BasisDimensionLab } from '../../src/labs/basis-dimension/BasisDimensionLab';
import { LinearMapLab } from '../../src/labs/linear-map/LinearMapLab';
import fixtures from '../fixtures/share-url-low-dimensions.json';
import { readFileSync } from 'node:fs';

const baseUrl = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
afterEach(() => vi.unstubAllGlobals());

describe('10.7 低次元の共有・教材例・画面復元', () => {
  it('新3形式と0D圧縮URLの固定fixtureを決定的に維持する', () => {
    for (const fixture of fixtures) {
      const state = validateSharedState(fixture.expectedState);
      expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state });
      expect(buildShareUrl(baseUrl, state)).toBe(fixture.url);
    }
  });

  it('13教材例と公開URLが文書・実装で一致する', () => {
    const guide = readFileSync(new URL('../../docs/LOW_DIMENSIONAL_SCENARIOS.md', import.meta.url), 'utf8');
    const links = [...guide.matchAll(/\[教材を開く\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
    expect(links).toHaveLength(13);
    LOW_DIMENSIONAL_TEACHING_SCENARIOS.forEach((example, index) => {
      expect(links[index]).toBe(buildShareUrl(baseUrl, example.state));
    });
  });
  for (const example of LOW_DIMENSIONAL_TEACHING_SCENARIOS) {
    it(example.id + 'の数学、URL、共有InitialStateと画面が一致する', async () => {
      const state = example.state;
      const url = buildShareUrl(baseUrl, state);
      expect(url.length).toBeLessThanOrEqual(2048);
      expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state });
      expect(buildShareUrl(url, state)).toBe(url);
      const vectorInit = createAppInitialization(url);
      const basisInit = createBasisDimensionInitialization(url);
      const mapInit = createLinearMapInitialization(url);
      expect([vectorInit.source, basisInit.source, mapInit.source].filter((s) => s === 'shared')).toHaveLength(1);
      if (state.lab === 'linear-map') {
        expect(createLinearMapShareState(mapInit.initialStates[mapInit.activeShapeId])).toEqual(state);
        expect(analyzeLinearMap(state, state.inputVector).rank).toBe(example.expectedRank);
      } else if (state.lab === 'basis-dimension') {
        expect(createBasisDimensionShareState(basisInit.initialStates[state.dim])).toEqual(state);
        const analysis = analyzeBasisCandidate({ dimension: state.dim, vectors: state.vectors }, state.candidateVectorIds, { targetSpace: 'ambient' });
        expect(analysis.candidateRank).toBe(example.expectedRank);
        expect(analysis.isBasis).toBe(true);
      } else {
        expect(vectorInit.initialStates[state.dim]).toEqual(state);
        expect(analyzeVectorSet({ dimension: state.dim, vectors: state.vectors }).rank).toBe(example.expectedRank);
        if (state.dim === 1) {
          expect(oneDimensionalStateToShare(oneDimensionalStateFromShare(state))).toEqual(state);
          const expected = { 'line-unique': 'unique', 'line-infinite': 'infinite', 'line-no-solution': 'none' }[example.id];
          const result = analyzeLinearCombination({ dimension: 1, vectors: state.vectors }, state.linearCombination.target!);
          expect(result.status).toBe(expected);
        }
      }
      vi.stubGlobal('window', { location: { href: url } });
      const Component = state.lab === 'vector-space' ? VectorSpaceLab : state.lab === 'basis-dimension' ? BasisDimensionLab : LinearMapLab;
      const markup = renderToStaticMarkup(createElement(Component, { active: false }));
      expect(markup).not.toMatch(/NaN|Infinity|10.7で有効になります/);
      expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>共有URLをエクスポート/);
      if (example.id === 'constant-polynomial-basis') {
        expect(markup).toContain('多項式と係数ベクトル');
        expect(markup).toContain('value="6"');
      }
      if (example.id === 'line-unique') expect(markup).toContain('value="3"');
      expect(await createShareQrCodeDataUrl(url)).toMatch(/^data:image\/png;base64,/);
    });
  }

  it('詳細タブや図に依存しない読み上げ要約が低次元の数学結果を示す', () => {
    for (const example of LOW_DIMENSIONAL_TEACHING_SCENARIOS) {
      const state = example.state;
      vi.stubGlobal('window', { location: { href: buildShareUrl(baseUrl, state) } });
      const Component = state.lab === 'vector-space' ? VectorSpaceLab : state.lab === 'basis-dimension' ? BasisDimensionLab : LinearMapLab;
      const markup = renderToStaticMarkup(createElement(Component, { active: false }));
      const summaryId = state.lab === 'linear-map' ? 'linear-map-summary' : state.lab === 'basis-dimension' ? 'basis-summary' : 'line-space-summary';
      if (state.lab === 'vector-space' && state.dim === 0) {
        expect(markup).toContain('成分はなく、空間の次元は0です。');
        expect(markup).toContain('空の組は一次独立で、この空間全体を生成し、rankは0です。');
        continue;
      }
      const summary = markup.match(new RegExp(`data-testid="${summaryId}"[^>]*>([\\s\\S]*?)</p>`))?.[1].replace(/<[^>]*>/g, '');
      expect(summary).toBeDefined();
      if (state.lab === 'linear-map') {
        const result = analyzeLinearMap(state, state.inputVector);
        expect(summary).toContain(`rankは${result.rank}`);
        expect(summary).toContain(`核の次元は${result.kernelDimension}`);
        expect(summary).toContain(`像の次元は${result.imageDimension}`);
        expect(summary).toContain(result.isInjective ? '単射です。' : '単射ではありません。');
        expect(summary).toContain(result.isSurjective ? '全射です。' : '全射ではありません。');
      } else if (state.lab === 'basis-dimension') {
        expect(summary).toContain(`対象空間の次元は${state.dim}`);
        expect(summary).toContain('条件1、一次独立です。');
        expect(summary).toContain('条件2、対象空間全体を生成します。');
        expect(summary).toContain(state.dim === 0 ? '空の組' : '昇べきの順の多項式係数');
      } else {
        expect(summary).toContain(`全ベクトルのrankは${example.expectedRank}`);
        expect(summary).toContain(example.id === 'line-no-solution' ? '一次結合では表現できません' : example.id === 'line-infinite' ? '一次結合係数は無数' : '一次結合係数が一意');
      }
    }
  });

  it('全16写像の空行列・入力・カメラを共有とResetの初期状態へ往復する', () => {
    const initial = createLinearMapInitialization(baseUrl);
    for (const [id, value] of Object.entries(initial.initialStates)) {
      const state = createLinearMapShareState(value);
      const restored = createLinearMapInitialization(buildShareUrl(baseUrl, state));
      expect(restored.activeShapeId).toBe(id);
      expect(createLinearMapShareState(restored.initialStates[restored.activeShapeId])).toEqual(state);
    }
  });

  it('0Dの固定集合や空行列はURLへ重複保存しない', () => {
    for (const example of LOW_DIMENSIONAL_TEACHING_SCENARIOS) {
      const state = example.state;
      const encoded = encodeShareState(state);
      const wire = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (state.lab !== 'linear-map' && state.dim === 0) {
        expect(wire).toEqual({ v: state.v, lab: state.lab, dim: 0 });
      } else if (state.lab === 'linear-map' && (state.sourceDimension === 0 || state.targetDimension === 0)) {
        expect(wire).not.toHaveProperty('matrix');
        if (state.sourceDimension === 0) expect(wire).not.toHaveProperty('inputVector');
      }
    }
  });

  it('未知フィールド・矛盾する0D固定値・旧版への低次元偽装を拒否する', () => {
    const zero = validateSharedState({ v: 4, lab: 'vector-space', dim: 0 });
    const invalid = [
      { v: 4, lab: 'vector-space', dim: 0, extra: true },
      { ...zero, vectors: [{ id: 'a1', name: 'a1', coordinates: [] }] },
      { ...zero, linearCombination: { visible: true, target: [] } },
      { ...zero, dim: 0.5 }, { ...zero, v: 3 },
      { v: 2, lab: 'basis-dimension', dim: 0, representation: 'polynomial' },
      { ...LOW_DIMENSIONAL_TEACHING_SCENARIOS[0].state, v: 3 },
    ];
    for (const state of invalid) expect(() => validateSharedState(state)).toThrow();
    const emptyMap = createLinearMapShareState(createLinearMapInitialization(baseUrl).initialStates['0-to-2']);
    for (const state of [
      { ...emptyMap, matrix: [[0], [0]] }, { ...emptyMap, inputVector: [0] },
      { ...emptyMap, visualization: { ...emptyMap.visualization, showTransformedGrid: true } },
      { ...emptyMap, v: 1 },
    ]) expect(() => validateSharedState(state)).toThrow();
  });
});
