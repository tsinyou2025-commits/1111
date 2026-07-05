const { spawnSync } = require('child_process');
const os = require('os');
const isWindows = os.platform() === 'win32';
const ALLOWED_COMMANDS = new Set(['node', 'npm', 'pnpm', 'yarn', 'vercel']);
function commandExists(cmd) {
  if (!ALLOWED_COMMANDS.has(cmd)) throw new Error(`Command not in whitelist: ${cmd}`);
  try {
    if (isWindows) { const r = spawnSync('where', [cmd], { stdio: 'ignore' }); return r.status === 0; }
    else { const r = spawnSync('sh', ['-c', `command -v "$1"`, '--', cmd], { stdio: 'ignore' }); return r.status === 0; }
  } catch { return false; }
}
function getCommandOutput(cmd, args) {
  try { const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], shell: isWindows }); return r.status === 0 ? (r.stdout || '').trim() : null; } catch { return null; }
}
function detectPackageManager() {
  if (commandExists('pnpm')) return 'pnpm';
  if (commandExists('yarn')) return 'yarn';
  if (commandExists('npm')) return 'npm';
  return null;
}
function main() {
  console.error('Checking Vercel CLI...');
  if (commandExists('vercel')) {
    const v = getCommandOutput('vercel', ['--version']) || 'unknown';
    console.error(`Vercel CLI installed: ${v}`);
    console.log(JSON.stringify({ status: 'already_installed' }));
    process.exit(0);
  }
  const pm = detectPackageManager();
  if (!pm) { console.error('No package manager found'); process.exit(1); }
  console.error(`Installing Vercel CLI using ${pm}...`);
  const cmds = { pnpm: ['pnpm', ['add', '-g', 'vercel']], yarn: ['yarn', ['global', 'add', 'vercel']], npm: ['npm', ['install', '-g', 'vercel']] };
  const entry = cmds[pm];
  const r = spawnSync(entry[0], entry[1], { stdio: 'inherit', shell: isWindows });
  if (r.status !== 0) { console.error('Install failed'); process.exit(1); }
  console.error('Vercel CLI installed!');
  console.log(JSON.stringify({ status: 'success' }));
}
main();
