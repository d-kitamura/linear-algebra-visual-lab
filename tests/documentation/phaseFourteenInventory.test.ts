import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('14.9 棚卸しと配布文書の現在地', () => {
  it('棚卸しの結論と未実施の検証・正式リリースを区別する', () => {
    const inventory = read('docs/INVENTORY_PHASE14.md');
    for (const text of ['D-132', 'D-133', 'D-134', '106例', '第15週', 'フェーズ7',
      '微小非零', 'availableStages', '正式な互換保証はまだ開始しない',
      '数学API・画面・共有形式・依存は変更しない', 'オンライン脆弱性監査は未実施',
      'Actions／公開確認はCodexでは実施しない']) expect(inventory).toContain(text);
    for (const file of ['README.md', 'ROADMAP.md', 'docs/PROJECT_STATUS.md', 'docs/DECISIONS.md']) {
      expect(read(file)).toContain('INVENTORY_PHASE14.md');
    }
  });

  it('配布・互換版一覧・利用目的が第七Labに追随する', () => {
    const compatibility = read('docs/SHARE_URL_COMPATIBILITY.md');
    const table = compatibility.split('## バージョン表')[1].split('## 固定fixture')[0];
    for (const [lab, version] of [['vector-space', 4], ['basis-dimension', 2], ['linear-map', 2],
      ['representation-matrix', 1], ['eigenspace', 1], ['diagonalization', 1], ['inner-product', 1]]) {
      expect(table).toContain(`| \`${lab}\` v${version} | 現行 |`);
    }
    expect(compatibility).toContain('7件のQR生成');
    expect(compatibility).toContain('計106代表例');
    const privacy = read('docs/USAGE_AND_PRIVACY.md');
    expect(privacy).toContain('7つのLab');
    expect(privacy).toContain('有理数による厳密演算');
    expect(read('docs/CLASSROOM_DISTRIBUTION.md')).toContain('教員が7つのLab');
  });

  it('現行仕様でURL上限や内積共有を未決定・未接続としない', () => {
    const spec = read('SPEC.md');
    expect(spec).not.toContain('URL の最大長、短縮 URL サービス、サーバー保存型 ID は未決定');
    expect(spec.split('### 8.3 URL 要件')[1].split('## 9.')[0]).toContain('2048文字');
    const overview = spec.split('## 1.')[0];
    expect(overview).not.toContain('共有14.7予定');
    expect(overview).toContain('D-134最終確認待ち');
  });
});
