import { describe, it, expect } from 'vitest';
import { colorForFile } from '../../src/renderer/scene/materials/fileTypeColors';

describe('colorForFile', () => {
  it('codes typescript files as code color', () => {
    expect(colorForFile('foo.ts')).toBe(colorForFile('bar.tsx'));
  });
  it('groups exe/bat as exec', () => {
    expect(colorForFile('a.exe')).toBe(colorForFile('b.bat'));
  });
  it('returns default for unknown', () => {
    expect(colorForFile('mystery.xyz')).toBeTypeOf('number');
  });
});
