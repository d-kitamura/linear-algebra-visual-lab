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
    expect(roadmap).toContain('8.1→8.1a→8.2→8.2a→8.2b→8.2cまで完了');
  });

  it('D-059とD-060を利用者確認済みとして記録する', () => {
    const d059 = decisions.match(/### D-059[\s\S]*?(?=### D-060)/u)?.[0];
    const d060 = decisions.match(/### D-060[\s\S]*?(?=### D-061)/u)?.[0];

    expect(d059).toContain('公開版利用者確認済み');
    expect(d060).toContain('公開版利用者確認済み');
    expect(roadmap).not.toContain('D-060確認待ち');
    expect(projectStatus).not.toContain('D-060の表示幅3%について');
  });

  it('仕様書版と8.3の実装状態を現在地へ揃える', () => {
    expect(specification).toContain('| 文書バージョン | 0.67 |');
    expect(specification).toContain('フェーズ8.3実装・自動検証済み、利用者確認待ち');
    expect(decisions).toContain('### D-061 フェーズ8開始後の棚卸しと8.3への引渡し');
    expect(decisions).toContain('### D-062 基底・次元の対象空間、判定API、数式表記');
    expect(projectStatus).toContain('D-062の数学仕様と表記を利用者が確認する');
  });
});
