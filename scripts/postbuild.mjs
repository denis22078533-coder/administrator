import { readFileSync, writeFileSync, readdirSync, statSync, chmodSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

// 1. Fix absolute paths in index.html → relative
const indexPath = join(DIST, 'index.html');
let html = readFileSync(indexPath, 'utf8');

// Replace src="/assets/ → src="./assets/
// Replace href="/assets/ → href="./assets/
html = html
  .replace(/\bsrc="\/assets\//g, 'src="./assets/')
  .replace(/\bhref="\/assets\//g, 'href="./assets/')
  .replace(/\bsrc='\/assets\//g, "src='./assets/")
  .replace(/\bhref='\/assets\//g, "href='./assets/");

writeFileSync(indexPath, html, 'utf8');
console.log('[postbuild] index.html: absolute paths → relative ✓');

// 2. Fix file permissions recursively: files → 644, dirs → 755
function fixPermissions(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      chmodSync(fullPath, 0o755);
      fixPermissions(fullPath);
    } else {
      chmodSync(fullPath, 0o644);
    }
  }
}

fixPermissions(DIST);
console.log('[postbuild] permissions: files=644, dirs=755 ✓');
