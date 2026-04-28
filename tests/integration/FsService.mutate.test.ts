import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

const svc = new FsService();
let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-mutate-'));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('FsService mutations', () => {
  it('mkdir creates a directory and returns its path', async () => {
    const created = await svc.mkdir(root, 'foo');
    const stat = await fs.stat(created);
    expect(stat.isDirectory()).toBe(true);
  });

  it('rename renames a file and returns new path', async () => {
    const orig = path.join(root, 'a.txt');
    await fs.writeFile(orig, 'x');
    const next = await svc.rename(orig, 'b.txt');
    expect(next.endsWith('/b.txt')).toBe(true);
    await expect(fs.access(orig)).rejects.toThrow();
  });

  it('move relocates a file', async () => {
    await fs.writeFile(path.join(root, 'a.txt'), 'x');
    await fs.mkdir(path.join(root, 'sub'));
    await svc.move(path.join(root, 'a.txt'), path.join(root, 'sub', 'a.txt'));
    await expect(fs.access(path.join(root, 'sub', 'a.txt'))).resolves.toBeUndefined();
  });

  it('copy duplicates a file', async () => {
    await fs.writeFile(path.join(root, 'a.txt'), 'hello');
    await fs.mkdir(path.join(root, 'sub'));
    await svc.copy(path.join(root, 'a.txt'), path.join(root, 'sub', 'a.txt'));
    expect(await fs.readFile(path.join(root, 'sub', 'a.txt'), 'utf8')).toBe('hello');
    expect(await fs.readFile(path.join(root, 'a.txt'),         'utf8')).toBe('hello');
  });

  it('rename rejects names containing slashes', async () => {
    const orig = path.join(root, 'a.txt');
    await fs.writeFile(orig, 'x');
    await expect(svc.rename(orig, 'evil/b.txt')).rejects.toThrow();
  });
});
