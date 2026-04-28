import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('electron', () => ({ app: { getPath: () => os.tmpdir() } }));

import { Persistence } from '../../src/main/Persistence';

let dir: string;
let file: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsn-persistence-'));
  file = path.join(dir, 'config.json');
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('Persistence', () => {
  it('returns defaults when file is missing', async () => {
    const p = new Persistence(path.join(dir, 'missing.json'));
    const cfg = await p.load();
    expect(cfg).toEqual({ hiddenVisible: false });
  });

  it('round-trips config through save/load', async () => {
    const p = new Persistence(file);
    await p.save({ lastRoot: 'C:/', hiddenVisible: true });
    const cfg = await p.load();
    expect(cfg).toEqual({ lastRoot: 'C:/', hiddenVisible: true });
  });

  it('merges defaults for missing fields', async () => {
    const partial = path.join(dir, 'partial.json');
    await fs.writeFile(partial, JSON.stringify({ lastRoot: 'D:/' }));
    const p = new Persistence(partial);
    const cfg = await p.load();
    expect(cfg).toEqual({ lastRoot: 'D:/', hiddenVisible: false });
  });

  it('returns defaults when JSON is malformed', async () => {
    const bad = path.join(dir, 'bad.json');
    await fs.writeFile(bad, '{not json');
    const p = new Persistence(bad);
    const cfg = await p.load();
    expect(cfg).toEqual({ hiddenVisible: false });
  });

  it('serializes concurrent saves; final value wins and JSON is valid', async () => {
    const concurrent = path.join(dir, 'concurrent.json');
    const p = new Persistence(concurrent);
    const writes = Array.from({ length: 25 }, (_, i) =>
      p.save({ lastRoot: `C:/r${i}`, hiddenVisible: i % 2 === 0 }),
    );
    await Promise.all(writes);
    const raw = await fs.readFile(concurrent, 'utf8');
    // Must be parseable (atomic rename — no torn writes).
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ lastRoot: 'C:/r24', hiddenVisible: true });
  });

  it('cleans up the temp file on success (best-effort)', async () => {
    const target = path.join(dir, 'cleanup.json');
    const p = new Persistence(target);
    await p.save({ lastRoot: 'C:/x', hiddenVisible: true });
    await expect(fs.access(target + '.tmp')).rejects.toBeDefined();
  });
});
