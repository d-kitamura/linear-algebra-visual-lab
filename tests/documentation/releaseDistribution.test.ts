import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

describe('初版候補の配布情報', () => {
  it('MIT Licenseと承認済みの著作権表示を持つ', () => {
    const license = read('LICENSE');

    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c) 2026 Daichi Kitamura');
    expect(license).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it('変更履歴に初版候補と正式版への境界を記録する', () => {
    const changelog = read('CHANGELOG.md');

    expect(changelog).toContain('[1.0.0-rc.1]');
    expect(changelog).toContain('正式リリース');
    expect(changelog).toContain('Git tagとGitHub Releaseはまだ作成しない');
  });

  it('利用案内に共有・保存・配信・個人情報の範囲を記録する', () => {
    const guide = read('docs/USAGE_AND_PRIVACY.md');

    for (const phrase of [
      '外部APIへ状態を送信しない',
      'アプリ独自の利用者アカウント、Cookie、アクセス解析',
      'GitHub Pages',
      '個人情報',
      '浮動小数点演算と許容誤差',
    ]) {
      expect(guide).toContain(phrase);
    }
  });

  it('実行時の主要な第三者ライブラリとライセンスを記録する', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');

    for (const packageName of ['qrcode', 'react', 'react-dom', 'scheduler', 'three', 'dijkstrajs']) {
      expect(notices).toContain(packageName);
    }
    expect(notices).toContain('MIT License text');
  });
});
