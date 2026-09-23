import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const design = read('docs/INNER_PRODUCT_LAB_DESIGN.md');
const roadmap = read('ROADMAP.md');
describe('フェーズ14詳細設計（D-132・D-133承認・14.9棚卸し）', () => {
  it('14.1〜14.9の承認とフェーズ14完了を記録する', () => {
    const phase = roadmap.split('## 15. フェーズ14')[1].split('## 16. 文書更新')[0];
    expect(phase).toContain('14.1〜14.9・D-125〜D-134承認済み');
    expect(phase).toContain('D-134承認済み');
    for (let i = 1; i <= 9; i++) expect(phase).toContain(`### 14.${i} `);
    expect(phase.match(/\*\*確認ゲート:\*\*/g)).toHaveLength(9);
    const contractUnit = phase.split('### 14.1 ')[1].split('### 14.2 ')[0];
    expect(contractUnit.match(/- \[x\]/g)).toHaveLength(4);
    expect(contractUnit).toContain('- [x] **確認ゲート:** D-126');
    const apiUnit = phase.split('### 14.2 ')[1].split('### 14.3 ')[0];
    expect(apiUnit.match(/- \[x\]/g)).toHaveLength(4);
    expect(apiUnit).toContain('- [x] **確認ゲート:** D-127');
    const uiUnit = phase.split('### 14.3 ')[1].split('### 14.4 ')[0];
    expect(uiUnit.match(/- \[x\]/g)).toHaveLength(3);
    expect(uiUnit).toContain('- [x] **確認ゲート:** D-128');
    const gsUnit = phase.split('### 14.4 ')[1].split('### 14.5 ')[0];
    expect(gsUnit.match(/- \[x\]/g)).toHaveLength(3);
    expect(gsUnit).toContain('- [x] **確認ゲート:** D-129');
    const dimensionsUnit = phase.split('### 14.5 ')[1].split('### 14.6 ')[0];
    expect(dimensionsUnit.match(/- \[x\]/g)).toHaveLength(3);
    expect(dimensionsUnit).toContain('- [x] **確認ゲート:** D-130');
    const polynomialUnit = phase.split('### 14.6 ')[1].split('### 14.7 ')[0];
    expect(polynomialUnit.match(/- \[x\]/g)).toHaveLength(3);
    expect(polynomialUnit).toContain('- [x] **確認ゲート:** D-131');
    const shareUnit = phase.split('### 14.7 ')[1].split('### 14.8 ')[0];
    expect(shareUnit.match(/- \[x\]/g)).toHaveLength(4);
    expect(shareUnit).toContain('- [x] **確認ゲート:** D-132');
    const teachingUnit = phase.split('### 14.8 ')[1].split('### 14.9 ')[0];
    expect(teachingUnit.match(/- \[x\]/g)).toHaveLength(3);
    expect(teachingUnit).toContain('- [x] **確認ゲート:** D-133');
    const inventory = phase.split('### 14.9 ')[1];
    expect(inventory.match(/- \[x\]/g)).toHaveLength(3);
    expect(inventory).toContain('- [x] **確認ゲート:** D-134');
    expect(design).toContain('フェーズ13は完了');
    expect(design).toContain('D-134承認済み');
    expect(read('docs/DECISIONS.md')).toContain('### D-125');
    expect(read('src/app/App.tsx')).toContain('InnerProductLab');
  });

  it('内積と幾何・対象空間・零と保留・段階共有の境界を記す', () => {
    for (const phrase of ['積分内積を既定', '内積を反映した座標', 'Cの逆変換',
      '周囲の空間Vの正規直交基底と言えるのはr=nの場合だけ',
      '零ベクトルとの角度を90度とは表示しない', '小さい非零',
      '正規化前の直交化を有理数', '原点への吸着のみ',
      '表示段階は教材状態として保存', '2048文字', '既存88例', '14.3']) {
      expect(design).toContain(phrase);
    }
    expect(design).toContain('ケイリー・ハミルトン・次数落としは再導入しない');
    expect(design).toContain('課題一覧・独立読み上げ要約カードは追加しない');
  });

  it('設計上の固定Cは積分内積Gを再現し、x²の残差の長さも独立に確かめる', () => {
    // 設計段階の手計算。将来のソルバー出力を期待値に使わない。
    const g = [[2, 0, 2 / 3], [0, 2 / 3, 0], [2 / 3, 0, 2 / 5]];
    const c = [[Math.sqrt(2), 0, Math.sqrt(2) / 3], [0, Math.sqrt(2 / 3), 0], [0, 0, Math.sqrt(8 / 45)]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(c.reduce((sum, row) => sum + row[i] * row[j], 0)).toBeCloseTo(g[i][j], 14);
    }
    const r = [-1 / 3, 0, 1];
    const normSquared = r.reduce((sum, value, i) => sum + value * g[i].reduce((dot, a, j) => dot + a * r[j], 0), 0);
    expect(normSquared).toBeCloseTo(8 / 45, 14);
    expect(g[0][2]).toBe(2 / 3); // 係数内積の0と一致しない。
  });
});
