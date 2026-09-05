import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const roadmap = readProjectFile('ROADMAP.md');
const decisions = readProjectFile('docs/DECISIONS.md');
const projectStatus = readProjectFile('docs/PROJECT_STATUS.md');
const specification = readProjectFile('SPEC.md');

describe('フェーズ8開始後の棚卸し記録', () => {
  it('追加補修と棚卸しを含む実施順をロードマップに残す', () => {
    expect(roadmap).toContain('### 8.1a 3Dターゲット表示と平面span吸着の補修');
    expect(roadmap).toContain('### 8.2a 3Dターゲットの原点・直線span吸着');
    expect(roadmap).toContain('### 8.2b 3D共通吸着距離の調整');
    expect(roadmap).toContain('### 8.2c フェーズ8開始後の統合棚卸し');
    expect(roadmap).toContain('8.1→8.1a→8.2→8.2a→8.2b→8.2c→8.3→8.4→8.4a→8.4b→8.4c→8.5→8.5a→8.5b→8.6→8.6a→8.6b→8.7はすべて利用者確認済み');
  });

  it('D-059とD-060を利用者確認済みとして記録する', () => {
    const d059 = decisions.match(/### D-059[\s\S]*?(?=### D-060)/u)?.[0];
    const d060 = decisions.match(/### D-060[\s\S]*?(?=### D-061)/u)?.[0];

    expect(d059).toContain('公開版利用者確認済み');
    expect(d060).toContain('公開版利用者確認済み');
    expect(roadmap).not.toContain('D-060確認待ち');
    expect(projectStatus).not.toContain('D-060の表示幅3%について');
  });

  it('フェーズ8完了を後続フェーズ開始後も現在地へ残す', () => {
    expect(specification).toContain('| 文書バージョン | 0.99 |');
    expect(specification).toContain('フェーズ8・9は利用者確認と統合棚卸しまで完了');
    expect(decisions).toContain('### D-061 フェーズ8開始後の棚卸しと8.3への引渡し');
    expect(decisions).toContain('### D-062 基底・次元の対象空間、判定API、数式表記');
    expect(decisions).toContain('### D-063 2D/3D基底エクスプローラの画面と段階的共有境界');
    expect(decisions).toContain('### D-064 基底・次元Labの2D平行吸着を既存Labへ統一');
    expect(decisions).toContain('### D-065 基底候補の数式表記、判定要約、通常ベクトルの原点吸着');
    expect(decisions).toContain('### D-066 原点優先吸着の全Lab統一と3D平面spanの有限境界');
    expect(decisions).toContain('### D-067 基底に関する座標の分類と同一ターゲット比較');
    expect(decisions).toContain('### D-068 基底・次元Labの詳細タブ、角括弧、係数記号の既存Lab統一');
    expect(decisions).toContain('### D-069 2D吸着距離2%とターゲット原点優先の全Lab統一');
    expect(decisions).toContain('### D-070 多項式を係数ベクトルとして読む段階的表示');
    expect(decisions).toContain('### D-071 基底・次元Labの一次結合モードと多項式表記の既存Lab統一');
    expect(decisions).toContain('### D-072 多項式係数と一次結合係数の記号分担、基底Labの表示補修');
    expect(decisions).toContain('### D-073 基底・次元Lab v1共有状態、代表例、フェーズ8統合棚卸し');
    expect(decisions).toContain('D-063〜D-073は利用者確認済みであり、フェーズ8を完了した');
    expect(projectStatus).toContain('フェーズ8を完了');
    expect(projectStatus).toContain('8.7「フェーズ8統合棚卸し」');
    expect(roadmap).toContain('## 10. フェーズ9「線形写像Lab」の作業単位案');
    expect(roadmap).toContain('### 9.7 統合確認と棚卸し');
    expect(projectStatus).toContain(String.raw`\mathbb{R}[x]_1`);
    expect(projectStatus).toContain(String.raw`\mathbb{R}[x]_2`);
  });
});
