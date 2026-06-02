import fs from 'node:fs';
import path from 'node:path';

export const root = process.cwd();
export function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
export function exists(file) { return fs.existsSync(path.join(root, file)); }
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function all(...files) { return files.map(read).join('\n'); }
export function listFiles(dir, matcher = () => true) {
  const base = path.join(root, dir);
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (matcher(full)) out.push(path.relative(root, full));
    }
  }
  if (fs.existsSync(base)) walk(base);
  return out;
}
