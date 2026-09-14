import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const plan = read('docs/DIAGONALIZATION_LAB_DESIGN.md');
const roadmap = read('ROADMAP.md');

describe('フェーズ13の未承認設計と利用者指定の範囲', () => {
  it('フェーズ12完了と13.1〜13.8未着手を区別する', () => {
    expect(roadmap).toContain('完了（12.1〜12.9・利用者確認・統合棚卸し済み、D-114）');
    const phase13 = roadmap.split('## 14. フェーズ13')[1].split('## 15. 文書更新')[0];
    expect(phase13).toContain('詳細設計D-115は利用者確認待ち');
    expect(phase13).not.toContain('- [x]');
    for (let unit = 1; unit <= 8; unit++) expect(phase13).toContain(`### 13.${unit} `);
    expect(phase13.match(/\*\*確認ゲート:\*\*/g)).toHaveLength(8);
    expect(read('docs/DECISIONS.md')).toContain('### D-115');
  });

  it('次数落としを除外し、対角化だけの契約を提案する', () => {
    expect(plan).toContain('D-115利用者確認待ち');
    expect(plan).toContain('ケイリー・ハミルトンの定理・次数落とし・そのモードや関連API／テストは本Labからすべて除外');
    expect(plan).not.toMatch(/^## .*次数落とし/m);
    for (const phrase of ['7場面', '左入力だけ', '空の順序付き基底', '数値的に判定を保留',
      '別々の固有空間', '既存70例', '2048文字', 'diagonalization,1', '13.1〜13.8']) {
      // 左だけ編集する契約はD-115でも照合する。名称の些細な差には依存しない。
      expect(phrase === '左入力だけ' ? read('docs/DECISIONS.md') : plan).toContain(phrase);
    }
  });
});
