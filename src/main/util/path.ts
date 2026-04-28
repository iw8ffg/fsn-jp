export function normalizePath(p: string): string {
  let n = p.replace(/\\/g, '/');
  // uppercase drive letter
  if (/^[a-z]:/i.test(n)) n = n[0]!.toUpperCase() + n.slice(1);
  // strip trailing slashes (but keep "C:/")
  if (n.length > 3 && n.endsWith('/')) n = n.replace(/\/+$/, '');
  return n;
}

export function joinPath(parent: string, child: string): string {
  const p = normalizePath(parent);
  const c = child.replace(/\\/g, '/').replace(/^\/+/, '');
  return p.endsWith('/') ? p + c : `${p}/${c}`;
}
