import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyLinearMap } from '../../src/domain';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const plan = read('docs/EIGENSPACE_LAB_DESIGN.md');

describe('フェーズ12の承認済み計画と12.1契約', () => {
  it('12.6までの承認と12.7の確認待ち・12.8以降の未着手を区別する', () => {
    const roadmap = read('ROADMAP.md');
    expect(roadmap).toContain('完了（11.1〜11.9・利用者確認・統合棚卸し済み、D-101）');
    const phase12 = roadmap.split('## 13. フェーズ12')[1].split('## 14. 文書更新')[0];
    expect(phase12).toContain('全体方針D-102利用者承認済み');
    const contract = phase12.split('### 12.1 ')[1].split('### 12.2 ')[0];
    expect(contract).toContain('完了・利用者確認済み（D-103）');
    expect(contract.match(/- \[x\]/g)).toHaveLength(5);
    expect(contract).toContain('- [x] **確認ゲート:**');
    const numerics = phase12.split('### 12.2 ')[1].split('### 12.3 ')[0];
    expect(numerics).toContain('利用者確認済み（D-104）');
    expect(numerics.match(/- \[x\]/g)).toHaveLength(5);
    const screen = phase12.split('### 12.3 ')[1].split('### 12.4 ')[0];
    expect(screen).toContain('利用者確認済み（D-105・D-106）');
    expect(screen.match(/- \[x\]/g)).toHaveLength(5);
    expect(screen).toContain('- [x] **確認ゲート:**');
    const dimensions = phase12.split('### 12.4 ')[1].split('### 12.5 ')[0];
    expect(dimensions).toContain('利用者確認済み（D-107）');
    expect(dimensions.match(/- \[x\]/g)).toHaveLength(5);
    expect(dimensions).toContain('- [x] **確認ゲート:**');
    const polynomial = phase12.split('### 12.5 ')[1].split('### 12.6 ')[0];
    expect(polynomial).toContain('利用者確認済み（D-108／D-109）');
    expect(polynomial.match(/- \[x\]/g)).toHaveLength(4);
    expect(polynomial).toContain('- [x] **確認ゲート:**');
    const explanation = phase12.split('### 12.6 ')[1].split('### 12.7 ')[0];
    expect(explanation).toContain('利用者確認済み（D-110／D-111）');
    expect(explanation.match(/- \[x\]/g)).toHaveLength(4);
    expect(explanation).toContain('- [x] **確認ゲート:**');
    const sharing = phase12.split('### 12.7 ')[1].split('### 12.8 ')[0];
    expect(sharing).toContain('利用者確認待ち（D-112）');
    expect(sharing.match(/- \[x\]/g)).toHaveLength(4);
    expect(sharing).toContain('- [ ] **確認ゲート:**');
    expect(phase12.split('### 12.8 ')[1]).not.toContain('- [x]');
    for (let i = 1; i <= 9; i += 1) expect(phase12).toContain(`### 12.${i} `);
    expect(phase12.match(/\*\*確認ゲート:\*\*/g)).toHaveLength(9);
    expect(read('docs/DECISIONS.md')).toContain('### D-102');
  });

  it('数学・数値・共有と簡素な画面の境界を明記する', () => {
    for (const phrase of ['同じ空間、同じ順序付き基底', 'g(λ)=1', '判定保留',
      '既存D-009', '近似固有値', '一般の非対称行列', '残差が小さいだけ',
      'D-100', '2048文字', 'eigenspace,1', '任意基底', '対角化', 'Cayley–Hamilton']) {
      expect(plan).toContain(phrase);
    }
    expect(plan).toContain('12.2では追加依存なし');
    expect(plan).toContain('次の12.8');
  });

  it('多項式の代表候補が同じ3次元空間への変換であることを検算する', () => {
    // 固有値ソルバーの先行実装ではない。提案の既知の作用を既存APIで検算する。
    const derivative = [[0, 1, 0], [0, 0, 2], [0, 0, 0]];
    const degree = [[0, 0, 0], [0, 1, 0], [0, 0, 2]];
    const translation = [[1, 1, 1], [0, 1, 2], [0, 0, 1]];
    const apply = (matrix: number[][], u: number[]) => applyLinearMap({
      sourceDimension: 3, targetDimension: 3, matrix,
    }, u);
    expect(apply(derivative, [1, 2, 3])).toEqual([2, 6, 0]);
    expect(apply(derivative, [1, 0, 0])).toEqual([0, 0, 0]);
    for (let i = 0; i < 3; i += 1) {
      const u = [0, 0, 0];
      u[i] = 1;
      expect(apply(degree, u)).toEqual(u.map((v) => i * v));
    }
    expect(apply(translation, [1, 2, 3])).toEqual([6, 8, 3]);
    expect(apply(translation, [1, 0, 0])).toEqual([1, 0, 0]);
    expect(plan).toContain('同じ高々2次空間');
  });
});
