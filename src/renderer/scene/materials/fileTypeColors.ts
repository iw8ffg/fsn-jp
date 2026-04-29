const CATEGORIES: Record<string, number> = {
  code:    0x6cb2d9, // TS/JS/PY/RS/GO/JAVA — steel cyan, dominant FSN tone
  doc:     0xc8d4e0, // MD/TXT/PDF — light blue-gray
  data:    0x8fb86a, // JSON/CSV/YAML — olive green
  image:   0xd99c5c, // PNG/JPG/SVG — warm orange
  video:   0xb84a6a, // muted magenta
  audio:   0x8a6fb0, // muted purple
  archive: 0xc4b85a, // ZIP/RAR/7Z — mustard
  exec:    0xc94a4a, // EXE/BAT/MSI — dull red
  config:  0x808a94, // cool gray
  default: 0x6c7680,
};

const EXT_MAP: Record<string, keyof typeof CATEGORIES> = {
  ts: 'code', tsx: 'code', js: 'code', jsx: 'code', py: 'code', rs: 'code', go: 'code', java: 'code', kt: 'code', cs: 'code', cpp: 'code', c: 'code', h: 'code',
  md: 'doc', txt: 'doc', pdf: 'doc', rtf: 'doc', docx: 'doc',
  json: 'data', csv: 'data', yml: 'data', yaml: 'data', xml: 'data', toml: 'data',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  exe: 'exec', bat: 'exec', cmd: 'exec', msi: 'exec', ps1: 'exec',
  ini: 'config', conf: 'config', env: 'config',
};

export function colorForFile(name: string): number {
  const cat = fileTypeCategory(name);
  return CATEGORIES[cat] ?? CATEGORIES.default!;
}

export function fileTypeCategory(name: string): keyof typeof CATEGORIES {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return 'default';
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_MAP[ext] ?? 'default';
}
