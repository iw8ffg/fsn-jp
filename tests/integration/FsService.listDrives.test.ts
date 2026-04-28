import { describe, it, expect } from 'vitest';
import { FsService } from '../../src/main/FsService';

describe('FsService.listDrives (Windows)', () => {
  it('returns at least drive C:', async () => {
    const svc = new FsService();
    const drives = await svc.listDrives();
    expect(drives.length).toBeGreaterThan(0);
    expect(drives.some(d => d.letter === 'C:')).toBe(true);
  });
});
