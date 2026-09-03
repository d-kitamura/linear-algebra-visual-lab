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

describe('フェーズ10 表現行列・基底変換Labの詳細ロードマップ', () => {
  it('D-080を利用者確認済みとしてフェーズ9を完了する', () => {
    expect(decisions).toContain('状態: **利用者確認済み**（2026-09-03、作業単位9.7）');
    expect(roadmap).toContain('完了（9.1〜9.7・利用者確認・統合棚卸し済み）');
    expect(projectStatus).toContain('9「線形写像Lab」');
    expect(specification).toContain('フェーズ8・9は利用者確認と統合棚卸しまで完了');
  });

  it('シラバスと表記規則を根拠に独立した第四のLabを提案する', () => {
    expect(syllabus).toContain('線形写像の表現行列（１）');
    expect(syllabus).toContain('線形写像の表現行列（２）');
    expect(mathWritingRules).toContain('表現行列：T: U \\rightarrow Vなる線形写像');
    expect(decisions).toContain('### D-081 表現行列・基底変換Labの詳細ロードマップ案');
    expect(decisions).toContain('状態: **提案・利用者確認待ち**（2026-09-03、フェーズ10計画）');
    expect(roadmap).toContain('第四の「表現行列・基底変換Lab」を推奨する');
    expect(roadmap).toContain('識別子を`representation-matrix`');
  });

  it('実装前に記号と基底変換の向きを利用者確認へ残す', () => {
    expect(roadmap).toContain('表現行列を添え字付きで略記するか');
    expect(roadmap).toContain('基底変換行列の「どの基底の座標から、どの基底の座標へ変換するか」');
    expect(roadmap).toContain('仮の記号で先行実装しない');
    expect(projectStatus).toContain('表現行列と写像定義用行列の文字');
  });

  it('列構成、座標の2経路、基底変換を段階的な数学・UI作業へ分ける', () => {
    expect(roadmap).toContain('### 10.2 表現行列と基底変換の数学ロジック');
    expect(roadmap).toContain('### 10.3 `2→2`最小縦断版');
    expect(roadmap).toContain('### 10.4 2D/3Dと4つの入出力次元への拡張');
    expect(roadmap).toContain('### 10.5 座標の可換関係と基底変換エクスプローラ');
    expect(roadmap).toContain('その一意な座標ベクトルを第`i`列に並べて表現行列を構成する');
    expect(roadmap).toContain('恒等写像を異なる2基底間で表した場合を基底変換として扱い');
  });

  it('独立共有版、教材例、アクセシビリティ、統合棚卸しまで計画する', () => {
    expect(roadmap).toContain('### 10.6 共有状態、URL、QR、Reset');
    expect(roadmap).toContain('`representation-matrix` v1');
    expect(roadmap).toContain('### 10.7 代表例、授業導線、アクセシビリティ');
    expect(roadmap).toContain('### 10.8 統合確認と棚卸し');
    expect(roadmap).toContain('既存`vector-space` v3、`basis-dimension` v1、`linear-map` v1の固定fixtureを変更せず');
  });

  it('対象外とフェーズ11への引渡しを明記する', () => {
    expect(roadmap).toContain('高次元、多項式写像、記号計算、固有値・対角化を含めない');
    expect(roadmap).toContain('フェーズ11「固有値・固有空間Lab」へ渡す責務');
    expect(roadmap).toContain('実数体、対角化を先行しない境界');
    expect(specification).toContain('| 文書バージョン | 0.91 |');
  });
});
