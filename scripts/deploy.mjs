// Publish the production build to the `gh-pages` branch of the GitHub repository.
// Usage: npm run deploy   (GitHub Pages must be set to "Deploy from a branch: gh-pages / (root)")
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const remote = out('git remote get-url origin');
const commit = out('git rev-parse --short HEAD');

run('npm test');
run('npm run build');

const dir = mkdtempSync(join(tmpdir(), 'atom-sandbox-pages-'));
try {
  cpSync('dist', dir, { recursive: true });
  writeFileSync(join(dir, '.nojekyll'), ''); // serve files as-is (no Jekyll processing)
  run('git init -q -b gh-pages', dir);
  run('git add -A', dir);
  run(`git -c user.name="$(git -C "${process.cwd()}" config user.name || echo deploy)" -c user.email="$(git -C "${process.cwd()}" config user.email || echo deploy@localhost)" commit -q -m "Publish build of ${commit}"`, dir);
  run(`git push -q --force "${remote}" gh-pages`, dir);
  console.log(`\nPublished ${commit} to the gh-pages branch.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
