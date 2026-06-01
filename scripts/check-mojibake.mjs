import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetDirs = ['src'];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

const patterns = [
  { name: 'replacement-char', regex: /\uFFFD/ },
  { name: 'private-use-char', regex: /[\uE000-\uF8FF]/ },
  { name: 'known-mojibake-token', regex: /[蝜銝敺撱憿雿鈭頛瘝閮鞈瑯賢箇颯擐霅蝭噯麮窶篞諻鴔鼒諈黺賱鮈諤]/ },
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.netlify', 'supabase'].includes(e.name)) continue;
      walk(abs, out);
      continue;
    }
    if (!exts.has(path.extname(e.name))) continue;
    out.push(abs);
  }
  return out;
}

const files = targetDirs.flatMap(d => walk(path.join(root, d)));
const hits = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('mojibake-check-ignore')) return;
    const matched = patterns.filter(p => p.regex.test(line)).map(p => p.name);
    if (matched.length === 0) return;
    hits.push({
      file: path.relative(root, file),
      line: i + 1,
      matched: matched.join(','),
      text: line.trim().slice(0, 160),
    });
  });
}

if (hits.length > 0) {
  console.error(`\n[mojibake-check] Found ${hits.length} suspicious lines:\n`);
  hits.slice(0, 200).forEach(h => {
    console.error(`${h.file}:${h.line} [${h.matched}] ${h.text}`);
  });
  if (hits.length > 200) console.error(`... and ${hits.length - 200} more`);
  process.exit(1);
}

console.log('[mojibake-check] No suspicious mojibake patterns found.');
