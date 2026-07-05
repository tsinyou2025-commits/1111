const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
function createLogFile() {
  const tmpDir = path.join(process.cwd(), '.vercel-tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return path.join(tmpDir, 'login.log');
}
const LOG_FILE = createLogFile();
const ALLOWED_COMMANDS = new Set(['vercel', 'node', 'npx']);
function commandExists(cmd) {
  if (!ALLOWED_COMMANDS.has(cmd)) throw new Error(`Not allowed: ${cmd}`);
  try {
    if (isWindows) { return spawnSync('where', [cmd], { stdio: 'ignore' }).status === 0; }
    else { return spawnSync('sh', ['-c', `command -v "$1"`, '--', cmd], { stdio: 'ignore' }).status === 0; }
  } catch { return false; }
}
function openBrowser(url) {
  const urlPattern = /^https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+$/;
  if (!urlPattern.test(url)) { console.error('URL does not match expected pattern: ' + url); return; }
  const platform = os.platform();
  try {
    if (platform === 'darwin') spawnSync('open', [url], { stdio: 'ignore' });
    else if (platform === 'win32') spawnSync('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore', windowsHide: true });
    else spawnSync('xdg-open', [url], { stdio: 'ignore' });
    console.error('Browser opened');
  } catch (e) { console.error('Failed to open browser: ' + e.message); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitForUrl() {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const match = content.match(/https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+(?=\s|$)/);
        if (match) return match[0];
      }
    } catch {}
  }
  return null;
}
async function main() {
  console.error('Checking Vercel CLI login...');
  // Check existing login via npx
  const r = spawnSync('npx', ['vercel', 'whoami'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: isWindows });
  const out = (r.stdout || '').trim();
  if (r.status === 0 && out && !out.includes('Error') && !out.includes('not')) {
    console.error('Already logged in as: ' + out);
    console.log(JSON.stringify({ status: 'already_logged_in' }));
    return;
  }
  console.error('Not logged in, starting background login...');
  const logStream = fs.openSync(LOG_FILE, 'w');
  const child = spawn('npx', ['vercel', 'login'], {
    detached: true, stdio: ['ignore', logStream, logStream], shell: isWindows
  });
  child.unref();
  console.error('Background login PID: ' + child.pid);
  console.error('Waiting for auth URL...');
  const url = await waitForUrl();
  if (url) {
    console.error('');
    console.error('AUTH URL: ' + url);
    openBrowser(url);
    console.log(JSON.stringify({ status: 'needs_auth', auth_url: url }));
  } else {
    console.error('Failed to get auth URL. Check log: ' + LOG_FILE);
    try { console.error('Log: ' + fs.readFileSync(LOG_FILE, 'utf8')); } catch {}
    process.exit(1);
  }
}
main();
