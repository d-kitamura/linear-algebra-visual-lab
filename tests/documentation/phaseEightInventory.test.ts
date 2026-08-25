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
    expect(roadmap).toContain('8.1→8.1a→8.2→8.2a→8.2b→8.2c→8.3→8.4→8.4a→8.4b→8.4cまで利用者確認済み');
  });

  it('D-059とD-060を利用者確認済みとして記録する', () => {
    const d059 = decisions.match(/### D-059[\s\S]*?(?=### D-060)/u)?.[0];
    const d060 = decisions.match(/### D-060[\s\S]*?(?=### D-061)/u)?.[0];

    expect(d059).toContain('公開版利用者確認済み');
    expect(d060).toContain('公開版利用者確認済み');
    expect(roadmap).not.toContain('D-060確認待ち');
    expect(projectStatus).not.toContain('D-060の表示幅3%について');
  });

  it('仕様書版と8.5の実装状態を現在地へ揃える', () => {
    expect(specification).toContain('| 文書バージョン | 0.72 |');
    expect(specification).toContain('フェーズ8.4cまで利用者確認済み、8.5実装・自動検証済み');
    expect(decisions).toContain('### D-061 フェーズ8開始後の棚卸しと8.3への引渡し');
    expect(decisions).toContain('### D-062 基底・次元の対象空間、判定API、数式表記');
    expect(decisions).toContain('### D-063 2D/3D基底エクスプローラの画面と段階的共有境界');
    expect(decisions).toContain('### D-064 基底・次元Labの2D平行吸着を既存Labへ統一');
    expect(decisions).toContain('### D-065 基底候補の数式表記、判定要約、通常ベクトルの原点吸着');
    expect(decisions).toContain('### D-066 原点優先吸着の全Lab統一と3D平面spanの有限境界');
    expect(decisions).toContain('### D-067 基底に関する座標の分類と同一ターゲット比較');
    expect(projectStatus).toContain('D-067の座標の一意性、非基底時の3分類、同じターゲットに対する基底・順序別の座標比較');
  });
});
