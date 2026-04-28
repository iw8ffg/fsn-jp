const CATEGORIES: Record<string, number> = {
  code:    0x4dd0e1, // TS/JS/PY/RS/GO/JAVA — cyan-bright, dominant FSN color
  doc:     0xb6e0ff, // MD/TXT/PDF — light blue
  data:    0x4ade80, // JSON/CSV/YAML — neon green
  image:   0xff7a00, // PNG/JPG/SVG — neon orange
  video:   0xff3366, // hot pink/magenta
  audio:   0xa78bfa, // neon violet
  archive: 0xfde047, // ZIP/RAR/7Z — neon yellow
  exec:    0xff1744, // EXE/BAT/MSI — neon red
  config:  0x94a3b8, // cool gray-blue
  default: 0x607d8b, // steel blue
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
