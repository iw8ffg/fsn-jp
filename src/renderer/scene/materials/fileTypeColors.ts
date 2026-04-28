const CATEGORIES: Record<string, number> = {
  code:    0x6cb0ff, // TS/JS/PY/RS/GO/JAVA
  doc:     0xb6e0ff, // MD/TXT/PDF
  data:    0xc4d4a8, // JSON/CSV/YAML
  image:   0xffb37a, // PNG/JPG/SVG
  video:   0xff8a8a,
  audio:   0xd6a4ff,
  archive: 0xc8c8c8, // ZIP/RAR/7Z
  exec:    0xff5b5b, // EXE/BAT/MSI
  config:  0x9fb3a3,
  default: 0x8c98a5,
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
