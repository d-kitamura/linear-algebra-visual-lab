import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DiagonalizationLab } from '../../src/labs/diagonalization/DiagonalizationLab';
import { DIAGONALIZATION_TEACHING_SCENARIOS as examples } from '../../src/teaching/diagonalizationScenarios';
import { diagonalizationCurrentSlot } from '../../src/labs/diagonalization/diagonalizationWorkspace';
import { restoreDiagonalizationWorkspace } from '../../src/labs/diagonalization/diagonalizationSharing';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
describe('13.7 対角化Labの操作導線（実機の見え方・読み上げは確認ゲート）', () => {
  it('全7場面の入力名・タブの参照先・0D代替説明を維持する', () => {
    const seen = new Set<string>();
    for (const { state } of examples) {
      const key = state.dim === 0 ? 'coordinate-0' : `${state.kind}-${state.dim}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const scene = diagonalizationCurrentSlot(restoreDiagonalizationWorkspace(state)).scene;
      const html = renderToStaticMarkup(createElement(DiagonalizationLab, { active: false, initialScene: scene }));
      expect(html.match(/inputMode="decimal"/g) ?? []).toHaveLength(state.dim ** 2 + state.dim);
      for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) expect(html).toContain(`id="${match[1]}"`);
      expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
      expect(html.match(/role="tab"[^>]*tabindex="0"/g)).toHaveLength(1);
      expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(2);
      if (state.dim > 0) {
        for (let r = 1; r <= state.dim; r++) {
          for (let c = 1; c <= state.dim; c++) expect(html).toContain(`行列Aの第${r}行第${c}列`);
          expect(html).toContain(state.kind === 'coordinate' ? `入力uの第${r}成分` : `入力多項式の係数b${r - 1}`);
        }
      } else {
        expect(html).toContain('空の基底'); expect(html).toContain('成分の入力欄はありません');
      }
      expect(html).not.toContain('授業用の代表例と観察課題');
      expect(html).not.toContain('現在の状態の読み上げ要約');
    }
    expect(seen.size).toBe(7);
  });
  it('既存のキー操作・入力エラー・左右のWebGL代替を接続する', () => {
    const source = read('src/labs/diagonalization/DiagonalizationLab.tsx');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']) expect(source).toContain(key);
    expect(source).toContain('aria-invalid={invalid}');
    expect(source).toContain('aria-describedby={invalid ? id : undefined}');
    expect(source).toContain('labName="対角化Lab"');
    const space = read('src/labs/diagonalization/DiagonalizationSpace.tsx');
    expect(space).toContain('関数グラフではありません');
    expect(space).toContain('同じ入力と像の固有基底座標cとDc');
    expect(space).toContain('3Dを利用できなくても、下の行列・入力編集、解析タブ、Resetは利用できます');
    const panels = read('src/labs/diagonalization/DiagonalizationPanels.tsx');
    expect(panels).toContain('基底の{i + 1}番目と{i + 2}番目を交換');
    expect(panels).toContain('固有空間の次元：');
  });
  it('狭幅と長い数式の既存CSS契約を保ち、資料をアプリへ追加しない', () => {
    const css = read('src/labs/diagonalization/diagonalization.css');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toMatch(/\.diagonalization-workspace \{ grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toContain('position: static; top: auto;');
    expect(css).toContain('.diagonalization-order-controls { display: flex; flex-wrap: wrap;');
    expect(read('src/app/App.css')).toMatch(/\.representation-formula\s*\{[^}]*flex-wrap:\s*wrap;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s);
    expect(read('src/teaching/index.ts')).not.toContain('diagonalizationScenarios');
    expect(read('src/labs/diagonalization/DiagonalizationLab.tsx')).not.toContain('diagonalizationScenarios');
  });
});
