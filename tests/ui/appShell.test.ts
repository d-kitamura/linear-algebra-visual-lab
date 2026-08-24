import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const labMenuSource = readFileSync(
  new URL('../../src/app/LabMenu.tsx', import.meta.url),
  'utf8',
);
const actionSource = readFileSync(
  new URL('../../src/app/LabActionControls.tsx', import.meta.url),
  'utf8',
);
const vectorLabSource = readFileSync(
  new URL('../../src/labs/vector-space/VectorSpaceLab.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('共通アプリシェルとLab境界', () => {
  it('共通Appがヘッダー、Labメニュー、フッターと現行Labを接続する', () => {
    expect(appSource).toContain('<LabMenu />');
    expect(appSource).toContain('<VectorSpaceLab />');
    expect(appSource).toContain('className="site-header"');
    expect(appSource).toContain('className="site-footer"');
    expect(vectorLabSource).toContain('data-lab-id="vector-space"');
    expect(vectorLabSource).not.toContain('className="site-header"');
  });

  it('現在Labを読み上げ可能なメニューとして示し、次のLabを準備中とする', () => {
    expect(labMenuSource).toContain('aria-label={`教材Labを選択。現在は${activeLab.name}`}');
    expect(labMenuSource).toContain('aria-current="page"');
    expect(labMenuSource).toContain("id: 'vector-space'");
    expect(labMenuSource).toContain("id: 'basis-dimension'");
    expect(labMenuSource).toContain('aria-disabled="true"');
    expect(labMenuSource).toContain('フェーズ8で準備中');
  });

  it('共有とResetを現在Labの操作として共通部品へ接続する', () => {
    expect(vectorLabSource).toContain('<LabActionControls');
    expect(actionSource).toContain('現在のLabの教材状態を操作');
    expect(actionSource).toContain('onClick={onExport}');
    expect(actionSource).toContain('onClick={onReset}');
  });

  it('PCではポップオーバーメニュー、スマートフォンでは全幅の操作領域にする', () => {
    expect(cssSource).toMatch(/\.lab-menu-popover\s*\{[^}]*position:\s*absolute;/su);
    expect(cssSource).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.lab-menu\s*\{[^}]*width:\s*100%;/su,
    );
    expect(cssSource).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.lab-menu summary\s*\{[^}]*width:\s*100%;/su,
    );
  });
});
