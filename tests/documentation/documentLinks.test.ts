import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const markdownFiles = [
  ...readdirSync(repositoryRoot)
    .filter((name) => name.endsWith('.md'))
    .map((name) => resolve(repositoryRoot, name)),
  ...readdirSync(resolve(repositoryRoot, 'docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => resolve(repositoryRoot, 'docs', name)),
];

describe('文書間リンク', () => {
  it('全Markdownの相対リンク先が存在する', () => {
    const missing: string[] = [];

    for (const filePath of markdownFiles) {
      const source = readFileSync(filePath, 'utf8');
      const links = [...source.matchAll(/\]\(([^)]+)\)/gu)].map((match) => match[1]);

      for (const link of links) {
        if (/^(?:https?:|mailto:|#)/u.test(link)) {
          continue;
        }
        const target = decodeURIComponent(link.split('#', 1)[0].replace(/^<|>$/gu, ''));
        if (target && !existsSync(resolve(dirname(filePath), target))) {
          missing.push(`${filePath}: ${link}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
