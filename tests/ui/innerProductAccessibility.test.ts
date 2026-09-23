import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import { GramSchmidtControls } from '../../src/labs/inner-product/GramSchmidtPanels';
import { INNER_PRODUCT_TEACHING_SCENARIOS as examples } from '../../src/teaching/innerProductScenarios';
import { activeInnerSlot } from '../../src/labs/inner-product/innerProductWorkspace';
import { restoreInnerProductWorkspace } from '../../src/labs/inner-product/innerProductSharing';
import { analyzeGramSchmidt } from '../../src/domain';
import { innerProductMetric } from '../../src/labs/inner-product/innerProductScene';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
describe('14.8 内積Labの操作導線（実機の発音・見え方とは別）', () => {
  it('全場面の成分名・順序操作・タブ参照・零／未選択の説明を確認', () => {
    for (const { state } of examples) {
      const scene = activeInnerSlot(restoreInnerProductWorkspace(state)).scene;
      const html = renderToStaticMarkup(createElement(InnerProductLab, { active: false, initialScene: scene }));
      expect(html.match(/inputMode="decimal"/g) ?? []).toHaveLength(scene.inputs.length * scene.dimension);
      for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) expect(html).toContain(`id="${match[1]}"`);
      expect(html.match(/role="tab"[^>]*tabindex="0"/g)).toHaveLength(1);
      expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(2);
      for (const input of scene.inputs) {
        input.components.forEach((_, j) => expect(html).toContain(scene.kind === 'polynomial' ? `f${input.id}の係数b${j}` : `a${input.id}の第${j + 1}成分`));
        expect(html).toContain(`a${input.id}を前へ`); expect(html).toContain(`a${input.id}を削除`);
      }
      if (scene.kind === 'polynomial') expect(html).toContain('内積Labの多項式の標準単項式係数');
      if (scene.dimension === 0) { expect(html).toContain('空の組'); expect(html).toContain('角度は定義されません'); }
      if (scene.dimension > 0 && scene.pair === null) expect(html).toContain('未選択の内積を0とは表示しません');
      expect(html).not.toContain('授業用の代表例と観察課題'); expect(html).not.toContain('現在の状態の読み上げ要約');
    }
  });
  it('段階名と前後の端点・入力なしを明示する', () => {
    const analysis = analyzeGramSchmidt(innerProductMetric(2), [{ id: 2, components: [1, 0] }, { id: 1, components: [0, 1] }]);
    const controls = (stage: typeof analysis.availableStages[number] | null) => renderToStaticMarkup(createElement(GramSchmidtControls, { analysis, stage, disabled: false, onStage: () => {} }));
    const first = controls(analysis.availableStages[0]), last = controls(analysis.availableStages.at(-1)!);
    expect(first).toMatch(/aria-label="直交化の前の段階へ" disabled=""/);
    expect(last).toMatch(/aria-label="直交化の次の段階へ" disabled=""/);
    expect(first).toContain('入力a2、元の入力'); expect(last).toContain('直交化する入力');
    expect(controls(null)).toContain('直交化の段階はありません');
  });
  it('キー操作・エラー・共有・WebGL代替を維持する', () => {
    const source = read('src/labs/inner-product/InnerProductLab.tsx');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']) expect(source).toContain(key);
    expect(source).toContain('aria-invalid={!parsed.ok}'); expect(source).toContain('aria-describedby={!parsed.ok ? id : undefined}');
    expect(source).toContain('labName="内積・正規直交基底Lab"');
    const space = read('src/labs/inner-product/InnerProductSpace.tsx');
    expect(space).toContain('多項式の関数グラフではなく'); expect(space).toContain('成分入力、解析タブ、Resetはそのまま利用できます');
    const panels = read('src/labs/inner-product/GramSchmidtPanels.tsx');
    expect(panels).not.toContain('aria-live'); // ドラッグごとの計算結果をliveで連続通知しない。
  });
  it('狭幅・長い式・フォーカスのCSS契約、資料の非同梱を維持する', () => {
    const css = read('src/labs/inner-product/innerProduct.css');
    for (const rule of ['@media (max-width: 480px)', 'min-height: 44px', 'min-width: 44px', ':focus-visible', 'outline-offset: 3px', 'position: static']) expect(css).toContain(rule);
    expect(css).toMatch(/\.inner-stage-controls label \{[^}]*flex-wrap: wrap;[^}]*max-width: 100%/);
    expect(read('src/app/App.css')).toMatch(/\.representation-formula\s*\{[^}]*flex-wrap:\s*wrap;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s);
    expect(read('src/teaching/index.ts')).not.toContain('innerProductScenarios');
    expect(read('src/labs/inner-product/InnerProductLab.tsx')).not.toContain('innerProductScenarios');
  });
});
