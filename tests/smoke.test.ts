import { describe, expect, it } from 'vitest';
import { projectInfo } from '../src/app/projectInfo';

describe('project foundation', () => {
  it('identifies the application and current development phase', () => {
    expect(projectInfo.name).toBe('Linear Algebra Visual Lab');
    expect(projectInfo.version).toBe('1.0.0-rc.1');
    expect(projectInfo.phase).toBe('初版候補 v1.0.0-rc.1');
  });
});
