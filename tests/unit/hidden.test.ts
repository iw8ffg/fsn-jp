import { describe, it, expect } from 'vitest';
import { isHiddenName } from '../../src/main/util/hidden';

describe('isHiddenName', () => {
  it('detects dotfiles', () => {
    expect(isHiddenName('.git')).toBe(true);
    expect(isHiddenName('visible.txt')).toBe(false);
  });
  it('detects hardcoded windows hidden names', () => {
    expect(isHiddenName('System Volume Information')).toBe(true);
    expect(isHiddenName('$Recycle.Bin')).toBe(true);
    expect(isHiddenName('pagefile.sys')).toBe(true);
  });
});
