const HARDCODED = new Set([
  'System Volume Information',
  '$Recycle.Bin',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  'DumpStack.log',
  'DumpStack.log.tmp',
]);

export function isHiddenName(name: string): boolean {
  if (HARDCODED.has(name)) return true;
  return name.startsWith('.');
}
