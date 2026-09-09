import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('仕様書の現在バージョンが更新履歴の最新行と一致する', () => {
  const specification = readFileSync(new URL('../../SPEC.md', import.meta.url), 'utf8');
  // 過去フェーズのテストへ現在バージョンを複製しない。
  // 通常の改訂では壊れず、文書情報と更新履歴の更新漏れは検出する。
  const versions = [...specification.matchAll(/^\| 文書バージョン \| (\d+\.\d+) \|\r?$/gm)];
  const history = [...specification.matchAll(/^\| (\d+\.\d+) \| \d{4}-\d{2}-\d{2} \|/gm)];
  expect(versions).toHaveLength(1);
  expect(history.length).toBeGreaterThan(0);
  expect(versions[0][1]).toBe(history.at(-1)![1]);
});
