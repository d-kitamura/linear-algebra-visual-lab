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
    expect(roadmap).toContain('進行中（9.2利用者確認済み、9.3実装済み）');
    expect(roadmap).toContain('次は9.2で描画非依存の数学ロジックを実装する');
    expect(projectStatus).toContain('フェーズ9「線形写像Lab」の9.2まで利用者確認済み');
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
    expect(specification).toContain('| 文書バージョン | 0.83 |');
  });

  it('D-075と9.2の数学APIを利用者確認済みとして記録する', () => {
    expect(decisions).toContain('### D-075 線形写像の行列積、核・像、rank-nullity解析API');
    expect(decisions).toContain('状態: **利用者確認済み**（2026-08-31、作業単位9.2）');
    expect(roadmap).toContain('`applyLinearMap`と`analyzeLinearMap`として描画非依存に実装する');
    expect(projectStatus).toContain('完了・利用者確認済みの作業単位: 0.1');
  });

  it('9.2の結果と9.3への非UI境界を仕様へ固定する', () => {
    expect(specification).toContain('#### FR-LMAP-04: 描画非依存の数学解析（D-075、利用者確認済み）');
    expect(specification).toContain('### AC-54: 線形写像の数学解析');
    expect(specification).toContain('単射はnullity 0、全射はrankが`m`、全単射は両方が成立する場合');
    expect(specification).toContain('9.2では状態、UI、描画、共有validatorを追加しない');
  });

  it('D-076と9.3の2D最小縦断版を実装・自動検証済みとして記録する', () => {
    expect(decisions).toContain('### D-076 線形写像Labの`2→2`最小縦断画面');
    expect(decisions).toContain('状態: **実装・自動検証済み、利用者確認待ち**（2026-08-31、作業単位9.3）');
    expect(roadmap).toContain('50テストファイル・398テスト');
    expect(projectStatus).toContain('実装・自動検証済み、利用者確認待ちの作業単位: 9.3');
    expect(specification).toContain('#### FR-LMAP-05: `2→2`最小縦断画面（D-076、利用者確認待ち）');
    expect(specification).toContain('### AC-55: `2→2`線形写像の最小縦断画面');
  });
});
