// node scripts/outils/api-modules.cjs admin/annuaire,admin/annuaireLecture : inscrit des modules Convex dans _generated/api.d.ts, tenu à la main.
const fs = require('fs');
const p = 'src/lib/convex/_generated/api.d.ts';
let s = fs.readFileSync(p, 'utf8');
for (const m of (process.argv[2] || '').split(',').filter(Boolean)) {
  const ident = m.replace(/\//g, '_');
  if (s.includes(`"${m}": typeof`)) continue;
  let l = s.split('\n');
  const imports = l.map((x, i) => [x, i]).filter(([x]) => x.startsWith('import type * as '));
  const c = imports.find(([x]) => { const r = /from "\.\.\/(.+)\.js"/.exec(x); return r && r[1] > m; });
  l.splice(c ? c[1] : imports[imports.length - 1][1] + 1, 0, `import type * as ${ident} from "../${m}.js";`);
  const ent = l.map((x, i) => [x, i]).filter(([x]) => /^  "?[\w/]+"?: typeof /.test(x));
  const c2 = ent.find(([x]) => /^  "?([\w/]+)"?:/.exec(x)[1] > m);
  l.splice(c2 ? c2[1] : ent[ent.length - 1][1] + 1, 0, `  "${m}": typeof ${ident};`);
  s = l.join('\n');
}
fs.writeFileSync(p, s);
