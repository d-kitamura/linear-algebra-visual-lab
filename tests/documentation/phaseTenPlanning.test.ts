import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const roadmap = readProjectFile('ROADMAP.md');
const decisions = readProjectFile('docs/DECISIONS.md');
const projectStatus = readProjectFile('docs/PROJECT_STATUS.md');
const specification = readProjectFile('SPEC.md');
const syllabus = readProjectFile('syllabus.txt');
const mathWritingRules = readProjectFile('math-writing-rules.txt');

describe('フェーズ10 0・1次元拡張とフェーズ11 表現行列Labの詳細ロードマップ', () => {
  it('D-080を利用者確認済みとしてフェーズ9を完了する', () => {
    expect(decisions).toContain('状態: **利用者確認済み**（2026-09-03、作業単位9.7）');
    expect(roadmap).toContain('完了（9.1〜9.7・利用者確認・統合棚卸し済み）');
    expect(projectStatus).toContain('9「線形写像Lab」');
    expect(specification).toContain('フェーズ8・9は利用者確認と統合棚卸しまで完了');
  });

  it('D-082として0D・1Dを先に補う独立フェーズ10を提案する', () => {
    expect(decisions).toContain('### D-082 0・1次元空間を既存3Labへ補うフェーズ10挿入案');
    expect(decisions).toContain('状態: **提案・利用者確認待ち**（2026-09-03、フェーズ10計画）');
    expect(roadmap).toContain('## 11. フェーズ10「0・1次元空間の基礎拡張」の詳細作業単位案');
    expect(roadmap).toContain('中〜大規模の基礎改修として扱う');
    expect(projectStatus).toContain('D-082としてフェーズ10「0・1次元空間の基礎拡張」');
  });

  it('1Dを通常操作、0Dを制約付き境界教材として分ける', () => {
    expect(roadmap).toContain('1Dは全3Labで通常操作できる第一級の表示');
    expect(roadmap).toContain('0Dは一点表示と定義上必要な固定状態');
    expect(roadmap).toContain(String.raw`\mathrm{span}(\emptyset)=\{\bm{0}\}`);
    expect(roadmap).toContain(String.raw`\mathcal{B}=()`);
    expect(roadmap).toContain(String.raw`\mathbb{R}[x]_0`);
    expect(roadmap).toContain('0Dでは多項式表示を設けない');
  });

  it('数学、共通描画、既存3Lab、共有、棚卸しへ段階分割する', () => {
    expect(roadmap).toContain('### 10.2 0〜3次元に対応する数学ロジック');
    expect(roadmap).toContain('### 10.3 0D一点表示と1D数直線の共通描画');
    expect(roadmap).toContain('### 10.4 ベクトル空間Labの0D・1D拡張');
    expect(roadmap).toContain('### 10.5 基底・次元Labの0D・1D拡張');
    expect(roadmap).toContain('### 10.6 線形写像Labの0D・1D拡張');
    expect(roadmap).toContain('### 10.7 共有状態、教材例、アクセシビリティ');
    expect(roadmap).toContain('### 10.8 統合確認と棚卸し');
  });

  it('線形写像は2段の次元セレクタと0Dの固定写像を計画する', () => {
    expect(roadmap).toContain('定義域と終域をそれぞれ0D・1D・2D・3Dから選ぶ2段の小さなセレクタ');
    expect(roadmap).toContain('存在する唯一の写像を固定表示する');
    expect(roadmap).toContain('`0→m`の単射性、`n→0`の全射性、`0→0`の全単射性');
    expect(decisions).toContain('16次元組をボタンで一列に並べない');
  });

  it('D-081を多項式空間を含むフェーズ11案へ更新する', () => {
    expect(syllabus).toContain('線形写像の表現行列（１）');
    expect(syllabus).toContain('線形写像の表現行列（２）');
    expect(mathWritingRules).toContain('表現行列：T: U \\rightarrow Vなる線形写像');
    expect(decisions).toContain('状態: **方針一部承認・詳細確認待ち**（2026-09-03、フェーズ11計画');
    expect(roadmap).toContain('## 12. フェーズ11「表現行列・基底変換Lab」の詳細作業単位案');
    expect(roadmap).toContain('### 11.6 多項式空間上の線形写像と表現行列');
  });

  it('多項式そのものと係数座標への行列作用を区別する', () => {
    expect(roadmap).toContain('多項式そのものへの`T`と、係数ベクトルに作用する表現行列を同一視しない');
    expect(roadmap).toContain('微分`D:\\mathbb{R}[x]_2\\rightarrow\\mathbb{R}[x]_1`');
    expect(roadmap).toContain('`x`倍`M_x:\\mathbb{R}[x]_1\\rightarrow\\mathbb{R}[x]_2`');
    expect(roadmap).toContain('一般式の構文解析、関数グラフ、3次以上');
    expect(roadmap).toContain(String.raw`f\mapsto f^2`);
  });

  it('表現行列の記号と基底変換の向きを実装前確認へ残す', () => {
    expect(roadmap).toContain('表現行列を添え字付きで略記するか');
    expect(roadmap).toContain('基底変換行列の「どの基底の座標から、どの基底の座標へ変換するか」');
    expect(roadmap).toContain('仮の記号で先行実装しない');
    expect(projectStatus).toContain('表現行列と写像定義用行列の文字');
    expect(specification).toContain('| 文書バージョン | 0.92 |');
  });
});
