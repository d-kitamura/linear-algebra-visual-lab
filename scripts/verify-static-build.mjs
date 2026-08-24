import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function normalizeBasePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || !value.endsWith('/')) {
    throw new TypeError('EXPECTED_BASE_PATHは先頭と末尾が「/」の絶対パスにしてください。');
  }
  if (value.includes('?') || value.includes('#') || value.includes('\\')) {
    throw new TypeError('EXPECTED_BASE_PATHにクエリー、ハッシュ、バックスラッシュは使えません。');
  }
  return value.replace(/\/{2,}/gu, '/');
}

export function verifyStaticBuild({
  distDirectory = resolve('dist'),
  expectedBasePath = '/',
} = {}) {
  const basePath = normalizeBasePath(expectedBasePath);
  const indexPath = resolve(distDirectory, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`静的成果物の入口がありません: ${indexPath}`);
  }

  const indexHtml = readFileSync(indexPath, 'utf8');
  const assetUrls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/gu)]
    .map((match) => match[1])
    .filter((url) => url.includes('/assets/'));
  if (assetUrls.length < 2) {
    throw new Error('index.htmlからJavaScriptとCSSの静的アセットを検出できません。');
  }

  for (const assetUrl of assetUrls) {
    if (!assetUrl.startsWith(`${basePath}assets/`)) {
      throw new Error(`静的アセットが期待するbase pathを使っていません: ${assetUrl}`);
    }
    const relativePath = assetUrl.slice(basePath.length).split(/[?#]/u, 1)[0];
    const assetPath = resolve(distDirectory, relativePath);
    const distPrefix = `${resolve(distDirectory)}${sep}`;
    if (!assetPath.startsWith(distPrefix) || !existsSync(assetPath)) {
      throw new Error(`index.htmlが存在しない静的アセットを参照しています: ${assetUrl}`);
    }
  }

  return {
    basePath,
    indexPath,
    assetCount: assetUrls.length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = verifyStaticBuild({
    distDirectory: resolve(process.env.DIST_DIRECTORY ?? 'dist'),
    expectedBasePath: process.env.EXPECTED_BASE_PATH ?? '/',
  });
  process.stdout.write(
    `Static build verified: base=${result.basePath}, assets=${result.assetCount}\n`,
  );
}
