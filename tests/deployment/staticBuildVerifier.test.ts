import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeBasePath,
  verifyStaticBuild,
} from '../../scripts/verify-static-build.mjs';

function createStaticBuild(basePath: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'linear-algebra-static-build-'));
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'assets', 'app.js'), 'export {};');
  writeFileSync(join(directory, 'assets', 'app.css'), 'body {}');
  writeFileSync(
    join(directory, 'index.html'),
    `<script type="module" src="${basePath}assets/app.js"></script>`
      + `<link rel="stylesheet" href="${basePath}assets/app.css">`,
  );
  return directory;
}

describe('静的配布成果物のbase path検証', () => {
  it.each(['/','/linear-algebra-visual-lab/','/class/tools/vector/'])(
    '%s の入口とアセットを検証する',
    (basePath) => {
      const result = verifyStaticBuild({
        distDirectory: createStaticBuild(basePath),
        expectedBasePath: basePath,
      });

      expect(result).toMatchObject({ basePath, assetCount: 2 });
    },
  );

  it('末尾スラッシュのない設定とbase path不一致を拒否する', () => {
    expect(() => normalizeBasePath('/lab')).toThrowError('先頭と末尾');
    expect(() => verifyStaticBuild({
      distDirectory: createStaticBuild('/wrong/'),
      expectedBasePath: '/expected/',
    })).toThrowError('期待するbase path');
  });
});
