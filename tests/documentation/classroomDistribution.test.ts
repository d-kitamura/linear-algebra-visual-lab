import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guide = readFileSync(
  new URL('../../docs/CLASSROOM_DISTRIBUTION.md', import.meta.url),
  'utf8',
);

describe('授業配布・対応環境ガイド', () => {
  it('正規URLと教員・学生・復旧の一連の手順を持つ', () => {
    expect(guide).toContain('https://d-kitamura.github.io/linear-algebra-visual-lab/');
    expect(guide).toContain('教員が状態を配布する標準手順');
    expect(guide).toContain('学生側の確認手順');
    expect(guide).toContain('授業中の復旧手順');
    expect(guide).toContain('Reset');
  });

  it('主要機能と失敗時の代替導線を分離して案内する', () => {
    for (const phrase of [
      'WebGL',
      'Clipboard API',
      '手動コピー',
      'テキストで保存',
      'QRコードを保存',
      '数値入力と解析カード',
      'Canvasの外側',
    ]) {
      expect(guide).toContain(phrase);
    }
  });

  it('URL上限と問い合わせ時の記録項目を明示する', () => {
    expect(guide).toContain('2048文字');
    expect(guide).toContain('端末・OS・ブラウザ');
    expect(guide).toContain('個人情報を含めない');
  });
});
