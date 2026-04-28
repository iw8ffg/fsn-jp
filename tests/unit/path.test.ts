import { describe, it, expect } from 'vitest';
import { normalizePath, joinPath } from '../../src/main/util/path';

describe('normalizePath', () => {
  it('uses forward slashes and uppercases drive letter', () => {
    expect(normalizePath('c:\\users\\foo')).toBe('C:/users/foo');
  });
  it('strips trailing slashes except for root', () => {
    expect(normalizePath('C:/foo/')).toBe('C:/foo');
    expect(normalizePath('C:/')).toBe('C:/');
  });
});

describe('joinPath', () => {
  it('joins with forward slashes', () => {
    expect(joinPath('C:/foo', 'bar.txt')).toBe('C:/foo/bar.txt');
  });
});
