import { describe, expect, it } from 'vitest';
import { projectInfo } from '../src/app/projectInfo';

describe('project foundation', () => {
  it('identifies the application and current development phase', () => {
    expect(projectInfo.name).toBe('Linear Algebra Visual Lab');
    expect(projectInfo.phase).toBe('フェーズ 5 完了');
  });
});
