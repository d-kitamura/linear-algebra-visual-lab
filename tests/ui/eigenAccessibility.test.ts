import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EigenspaceLab } from '../../src/labs/eigenspace/EigenspaceLab';
import { ShareExportDialog } from '../../src/app/ShareExportDialog';
import { EIGEN_TEACHING_SCENARIOS as examples } from '../../src/teaching/eigenScenarios';
import { currentEigenSlot } from '../../src/labs/eigenspace/eigenWorkspace';
import { restoreEigenWorkspace } from '../../src/labs/eigenspace/eigenSharing';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
describe('12.8 固有値Labの読み上げと操作導線（実機は確認ゲート）', () => {
  it('全7場面で成分名と解析タブの参照先を維持する', () => {
    const seen = new Set<string>();
    for (const example of examples) {
      const state = example.state, key = state.dim === 0 ? 'coordinate-0' : `${state.kind}-${state.dim}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const html = renderToStaticMarkup(createElement(EigenspaceLab, { active: false, initialScene: currentEigenSlot(restoreEigenWorkspace(state)).scene }));
      expect(html.match(/inputMode="decimal"/g) ?? []).toHaveLength(state.dim * state.dim + state.dim);
      for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) expect(html).toContain(`id="${match[1]}"`);
      expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
      expect(html.match(/role="tab"[^>]*tabindex="0"/g)).toHaveLength(1);
      expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(3);
      if (state.dim > 0) {
        expect(html).toContain('行列Aの第1行第1列');
        expect(html).toContain(state.kind === 'coordinate' ? '入力uの第1成分' : '入力多項式の係数b0');
      } else expect(html).toContain('成分はなく、空間の次元は0');
    }
  });
  it('固有値Lab用の共有説明を受け取り、第四Labの既定説明は維持する', () => {
    const html = renderToStaticMarkup(createElement(ShareExportDialog, { url: 'https://example.test/', onClose: () => {}, labName: '固有値・固有空間Lab', description: '行列・入力・固有空間の表示設定を復元します。' }));
    expect(html).toContain('行列・入力・固有空間の表示設定');
    expect(html).not.toContain('両基底');
    const fourth = renderToStaticMarkup(createElement(ShareExportDialog, { url: 'https://example.test/', onClose: () => {} }));
    expect(fourth).toContain('両基底');
    const dialog = read('src/app/ShareExportDialog.tsx');
    expect(dialog).toContain('alt={`現在の${labName}共有URLを表すQRコード`}');
    const lab = read('src/labs/eigenspace/EigenspaceLab.tsx');
    expect(lab).toContain('labName="固有値・固有空間Lab"');
    expect(lab).toContain('零ベクトルだけからなる0次元の場面を復元');
    expect(dialog).toContain('field.current?.focus()');
  });
  it('キーボード・狭幅・WebGL代替を接続し、図の見え方を自動検証済みとは扱わない', () => {
    const source = read('src/labs/eigenspace/EigenspaceLab.tsx');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']) expect(source).toContain(key);
    expect(source).toContain('aria-invalid={invalid}');
    expect(source).toContain('aria-describedby={invalid ? errorId : undefined}');
    expect(source).toContain('行列・入力の数値編集と解析タブ、Resetはそのまま利用できます');
    expect(read('src/labs/eigenspace/eigenspace.css')).toContain('@media (max-width: 640px)');
    expect(read('src/app/App.css')).toMatch(/\.representation-formula\s*\{[^}]*flex-wrap:\s*wrap;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s);
    expect(source).toContain("...(same ? { hideArrow: true, label: null }");
  });
});
