import type { FsnApi } from '@shared/api';

export const fsn: FsnApi = window.fsn;

export async function unwrap<T>(
  p: Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }>,
): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(`[${r.code}] ${r.message}`);
  return r.data;
}
