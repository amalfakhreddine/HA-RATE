import fs from 'node:fs';
import path from 'node:path';

const roots = ['client/src', 'server', 'shared', 'scripts'];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const replacements = [
  [/totalHA-RATEDistributed/g, 'totalHARATEDistributed'],
  [/totalHA_RATE-Distributed/g, 'totalHARATEDistributed'],
  [/HA-RATEBalance/g, 'HARATEBalance'],
  [/HA-RATERate/g, 'HARATERate'],
  [/HA-RATEAmount/g, 'HARATEAmount'],
  [/HA-RATEReward/g, 'HARATEReward'],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) {
      let s = fs.readFileSync(p, 'utf8');
      const before = s;
      for (const [re, value] of replacements) s = s.replace(re, value);
      if (s !== before) fs.writeFileSync(p, s);
    }
  }
}

for (const root of roots) walk(root);
console.log('[prebuild-fix] identifier guard complete');
