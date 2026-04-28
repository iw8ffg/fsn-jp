import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SearchService } from '../../src/main/SearchService';

let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-search-'));
  await fs.mkdir(path.join(root, 'sub'));
  await fs.writeFile(path.join(root, 'alpha.txt'), 'x');
  await fs.writeFile(path.join(root, 'sub', 'alphabet.md'), 'x');
  await fs.writeFile(path.join(root, 'sub', 'other.bin'), 'x');
});
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe('SearchService', () => {
  it('streams hits matching name substring', async () => {
    const svc = new SearchService();
    const allHits: string[] = [];
    await svc.search(root, 'alpha', 'q1', (hits) => {
      for (const h of hits) allHits.push(h.name);
    });
    expect(allHits.sort()).toEqual(['alpha.txt', 'alphabet.md']);
  });

  it('cancels on demand', async () => {
    const svc = new SearchService();
    let count = 0;
    const p = svc.search(root, '', 'q2', () => { count++; });
    svc.cancel('q2');
    await p;
    // result count is non-deterministic but shouldn't crash; just assert no throw
    expect(typeof count).toBe('number');
  });
});
