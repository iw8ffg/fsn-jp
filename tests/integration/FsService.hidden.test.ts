import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

describe('FsService hidden detection', () => {
  it('marks dotfiles as hidden', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-hidden-'));
    await fs.writeFile(path.join(root, '.secret'), 'x');
    await fs.writeFile(path.join(root, 'visible.txt'), 'y');
    const svc = new FsService();
    const nodes = await svc.listDir(root, 1);
    const secret  = nodes.find(n => n.name === '.secret')!;
    const visible = nodes.find(n => n.name === 'visible.txt')!;
    expect(secret.isHidden).toBe(true);
    expect(visible.isHidden).toBe(false);
    await fs.rm(root, { recursive: true, force: true });
  });
});
