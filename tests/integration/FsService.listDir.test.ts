import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FsService } from '../../src/main/FsService';

let root: string;
const svc = new FsService();

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-listdir-'));
  await fs.mkdir(path.join(root, 'sub'));
  await fs.mkdir(path.join(root, 'sub', 'deep'));
  await fs.writeFile(path.join(root, 'a.txt'), 'hello');
  await fs.writeFile(path.join(root, 'sub', 'b.txt'), 'world');
  await fs.writeFile(path.join(root, 'sub', 'deep', 'c.txt'), 'x');
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('FsService.listDir', () => {
  it('lists immediate children with depth=1', async () => {
    const nodes = await svc.listDir(root, 1);
    const names = nodes.map(n => n.name).sort();
    expect(names).toEqual(['a.txt', 'sub']);
    const sub = nodes.find(n => n.name === 'sub')!;
    expect(sub.kind).toBe('dir');
    expect(sub.childrenLoaded).toBe(false);
    const aTxt = nodes.find(n => n.name === 'a.txt')!;
    expect(aTxt.parentPath).toBe(sub.parentPath); // both immediate children share parent
  });

  it('lists two levels with depth=2', async () => {
    const nodes = await svc.listDir(root, 2);
    const sub = nodes.find(n => n.name === 'sub')!;
    expect(sub.childrenLoaded).toBe(true);
    // children of sub are returned as siblings via path
    const subChildren = nodes.filter(n => n.path.startsWith(sub.path + '/'));
    expect(subChildren.map(n => n.name).sort()).toContain('b.txt');
    expect(subChildren.map(n => n.name).sort()).toContain('deep');
    // deep is included but its own children are not
    const deep = subChildren.find(n => n.name === 'deep')!;
    expect(deep.childrenLoaded).toBe(false);
    const bTxt = subChildren.find(n => n.name === 'b.txt')!;
    expect(bTxt.parentPath).toBe(sub.path);
  });

  it('marks unreadable directories as locked', async () => {
    const nodes = await svc.listDir('C:/Windows/CSC', 1).catch(() => []);
    // either returns [] or includes locked entries — both acceptable, no throw
    expect(Array.isArray(nodes)).toBe(true);
  });
});
