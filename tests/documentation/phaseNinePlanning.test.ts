import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const roadmap = readProjectFile('ROADMAP.md');
const decisions = readProjectFile('docs/DECISIONS.md');
const projectStatus = readProjectFile('docs/PROJECT_STATUS.md');
const specification = readProjectFile('SPEC.md');

describe('フェーズ9.1 線形写像Labの設計境界', () => {
  it('D-074と9.1を利用者確認済みとして記録する', () => {
    expect(decisions).toContain('### D-074 線形写像Labの教育範囲、連動画面、状態境界');
    expect(decisions).toContain('状態: **利用者確認済み**（2026-08-31、作業単位9.1）');
    expect(roadmap).toContain('進行中（9.1利用者確認済み）');
    expect(roadmap).toContain('次は9.2で描画非依存の数学ロジックを実装する');
    expect(projectStatus).toContain('次の確認ゲート: 9.2で行列積、rank、零空間基底、列空間基底、rank-nullity');
  });

  it('対象次元、画面配置、像の導出境界を固定する', () => {
    expect(specification).toContain('#### FR-LMAP-01: 教育範囲と表記（D-074、利用者確認済み）');
    expect(specification).toContain('#### FR-LMAP-02: 定義域と終域の連動画面（D-074、利用者確認済み）');
    expect(specification).toContain('`n,m∈{2,3}`');
    expect(specification).toContain('広幅では左右、狭幅では上下');
    expect(specification).toContain('終域側の像を直接ドラッグして逆像を暗黙に一つ選ぶ操作は採用しない');
  });

  it('Lab固有状態と将来の共有境界を固定する', () => {
    expect(specification).toContain('#### FR-LMAP-03: 状態・共有・Reset境界（D-074、9.6で実装）');
    expect(specification).toContain('`(lab,v)=(linear-map,1)`');
    expect(specification).toContain('像、核・像の基底、rank、nullity、次元定理、単射・全射の分類は状態から導出');
    expect(specification).toContain('手動2D表示範囲、開いている詳細タブ、入力下書き、hover、drag previewは共有しない');
  });

  it('表現行列の後続境界と9.1の非実装範囲を明記する', () => {
    expect(specification).toContain('任意の定義域基底・終域基底に関する表現行列と基底変換はフェーズ10候補へ分離する');
    expect(specification).toContain('### AC-53: 線形写像Labの設計境界');
    expect(specification).toContain('9.1では文書・設計の整合だけを検証し、画面、数学API、`linear-map` v1 validatorは未実装');
    expect(specification).toContain('| 文書バージョン | 0.80 |');
  });
});
