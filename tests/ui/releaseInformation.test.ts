import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import packageMetadata from '../../package.json';
import { projectInfo } from '../../src/app/projectInfo';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');

describe('初版候補の表示と利用案内', () => {
  it('package.jsonを版番号の正本としてヘッダーとフッターへ使う', () => {
    expect(packageMetadata.version).toBe('1.0.0-rc.1');
    expect(projectInfo.version).toBe(packageMetadata.version);
    expect(projectInfo.phase).toContain(packageMetadata.version);
    expect(appSource).toContain('v{projectInfo.version}');
  });

  it('フッターから利用概要と詳細文書へ到達できる', () => {
    expect(appSource).toContain('利用・プライバシー');
    expect(appSource).toContain('アプリ独自のアカウント、Cookie、アクセス解析、サーバー保存はありません。');
    expect(appSource).toContain('/blob/main/docs/USAGE_AND_PRIVACY.md');
    expect(appSource).toContain('/blob/main/THIRD_PARTY_NOTICES.md');
    expect(appSource).toContain('/blob/main/LICENSE');
  });

  it('共有URLへ個人情報を含めない注意を示す', () => {
    expect(appSource).toContain('個人情報を共有URLへ含めないでください。');
    expect(appSource).toContain('GitHub Pages');
  });
});
