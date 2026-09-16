import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const plan = read('docs/DIAGONALIZATION_LAB_DESIGN.md');
const roadmap = read('ROADMAP.md');

describe('フェーズ13の実装・承認状況と利用者指定の範囲', () => {
  it('13.8までの承認とフェーズ13完了を記録する', () => {
    expect(roadmap).toContain('完了（12.1〜12.9・利用者確認・統合棚卸し済み、D-114）');
    const phase13 = roadmap.split('## 14. フェーズ13')[1].split('## 15. フェーズ14')[0];
    expect(phase13).toContain('詳細設計D-115は利用者承認済み');
    const contract = phase13.split('### 13.1 ')[1].split('### 13.2 ')[0];
    expect(contract).toContain('利用者確認済み（D-116）');
    expect(contract.match(/- \[x\]/g)).toHaveLength(4);
    expect(contract).toContain('- [x] **確認ゲート:**');
    const implementation = phase13.split('### 13.2 ')[1].split('### 13.3 ')[0];
    expect(implementation).toContain('利用者確認済み（D-117');
    expect(implementation.match(/- \[x\]/g)).toHaveLength(3);
    expect(implementation).toContain('- [x] **確認ゲート:**');
    const ui = phase13.split('### 13.3 ')[1].split('### 13.4 ')[0];
    expect(ui).toContain('利用者確認済み（D-118）');
    expect(ui.match(/- \[x\]/g)).toHaveLength(3);
    expect(ui).toContain('- [x] **確認ゲート:**');
    const dimensions = phase13.split('### 13.4 ')[1].split('### 13.5 ')[0];
    expect(dimensions).toContain('利用者確認済み（D-119');
    expect(dimensions.match(/- \[x\]/g)).toHaveLength(3);
    expect(dimensions).toContain('- [x] **確認ゲート:**');
    const polynomial = phase13.split('### 13.5 ')[1].split('### 13.6 ')[0];
    expect(polynomial).toContain('利用者確認済み（D-120）');
    expect(polynomial.match(/- \[x\]/g)).toHaveLength(3);
    expect(polynomial).toContain('- [x] **確認ゲート:**');
    const sharing = phase13.split('### 13.6 ')[1].split('### 13.7 ')[0];
    expect(sharing).toContain('利用者確認済み（D-122）');
    expect(sharing.match(/- \[x\]/g)).toHaveLength(4);
    expect(sharing).toContain('- [x] **確認ゲート:**');
    const teaching = phase13.split('### 13.7 ')[1].split('### 13.8 ')[0];
    expect(teaching).toContain('利用者確認済み（D-123）');
    expect(teaching.match(/- \[x\]/g)).toHaveLength(3);
    expect(teaching).toContain('- [x] **確認ゲート:**');
    const inventory = phase13.split('### 13.8 ')[1];
    expect(inventory).toContain('利用者確認済み（D-124）');
    expect(inventory.match(/- \[x\]/g)).toHaveLength(3);
    expect(inventory).toContain('- [x] **確認ゲート:**');
    for (let unit = 1; unit <= 8; unit++) expect(phase13).toContain(`### 13.${unit} `);
    expect(phase13.match(/\*\*確認ゲート:\*\*/g)).toHaveLength(8);
    expect(read('docs/DECISIONS.md')).toContain('### D-115');
    expect(read('docs/DECISIONS.md')).toContain('### D-124');
    expect(read('docs/INVENTORY_PHASE13.md')).toContain('109ファイル・1070テスト');
    expect(read('README.md')).not.toContain('共有未接続');
    expect(read('README.md')).toContain('INVENTORY_PHASE13.md');
    expect(roadmap).not.toContain('D-090を優先し、Codexはローカル変更と文書更新まで');
  });

  it('次数落としを除外し、対角化だけの契約を提案する', () => {
    expect(plan).toContain('D-115利用者承認済み');
    expect(plan).toContain('ケイリー・ハミルトンの定理・次数落とし・そのモードや関連API／テストは本Labからすべて除外');
    expect(plan).not.toMatch(/^## .*次数落とし/m);
    for (const phrase of ['7場面', '左入力だけ', '空の順序付き基底', '数値的に判定を保留',
      '別々の固有空間', '既存70例', '2048文字', 'diagonalization,1', '13.1〜13.8']) {
      // 左だけ編集する契約はD-115でも照合する。名称の些細な差には依存しない。
      expect(phrase === '左入力だけ' ? read('docs/DECISIONS.md') : plan).toContain(phrase);
    }
  });
});
