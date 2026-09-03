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
const basisLabSource = readFileSync(
  new URL('../../src/labs/basis-dimension/BasisDimensionLab.tsx', import.meta.url),
  'utf8',
);
const linearMapLabSource = readFileSync(
  new URL('../../src/labs/linear-map/LinearMapLab.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('共通アプリシェルとLab境界', () => {
  it('共通Appがヘッダー、Labメニュー、フッターと現行Labを接続する', () => {
    expect(appSource).toContain('<LabMenu activeLabId={activeLabId} onLabChange={setActiveLabId} />');
    expect(appSource).toContain("<VectorSpaceLab active={activeLabId === 'vector-space'} />");
    expect(appSource).toContain('<BasisDimensionLab active={activeLabId === \'basis-dimension\'} />');
    expect(appSource).toContain('<LinearMapLab active={activeLabId === \'linear-map\'} />');
    expect(appSource).toContain('className="site-header"');
    expect(appSource).toContain('className="site-footer"');
    expect(vectorLabSource).toContain('data-lab-id="vector-space"');
    expect(vectorLabSource).not.toContain('className="site-header"');
  });

  it('現在Labを読み上げ可能に示し、3つのLabを選択できる', () => {
    expect(labMenuSource).toContain('aria-label={`教材Labを選択。現在は${activeLab.name}`}');
    expect(labMenuSource).toContain("aria-current={isCurrent ? 'page' : undefined}");
    expect(labMenuSource).toContain("id: 'vector-space'");
    expect(labMenuSource).toContain("id: 'basis-dimension'");
    expect(labMenuSource).toContain("id: 'linear-map'");
    expect(labMenuSource).toContain("onClick={() => handleLabChange(lab.id)}");
    expect(labMenuSource).not.toContain('aria-disabled="true"');
    expect(labMenuSource).not.toContain('フェーズ8で準備中');
  });

  it('共有とResetを現在Labの操作として共通部品へ接続する', () => {
    expect(vectorLabSource).toContain('<LabActionControls');
    expect(basisLabSource).toContain('<LabActionControls');
    expect(linearMapLabSource).toContain('<LabActionControls');
    expect(linearMapLabSource).toContain('onExport={handleOpenShareDialog}');
    expect(basisLabSource).toContain('exportDisabled={hasInvalidCoordinateDraft}');
    expect(basisLabSource).toContain('onExport={handleOpenShareDialog}');
    expect(appSource).toContain("return result.status === 'success' ? result.state.lab : 'vector-space'");
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
