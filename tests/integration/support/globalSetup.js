const {execFileSync, spawn} = require('node:child_process');
const {mkdtempSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const KIT = path.join(ROOT, 'mobile-engineer-candidate-kit');
const START_TIMEOUT_MS = 10_000;

/** Creates oversize.csv with the kit's own command and starts one mock for the whole run. */
module.exports = async () => {
  execFileSync('npm', ['run', 'fixtures:oversize', '--silent'], {cwd: KIT, stdio: 'ignore'});
  const stateDirectory = mkdtempSync(path.join(tmpdir(), 'billduck-mock-'));
  const child = spawn(
    process.execPath,
    [path.join(__dirname, 'startMock.mjs'), path.join(stateDirectory, 'state.json')],
    {
      stdio: ['ignore', 'pipe', 'inherit']
    }
  );
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('the mock did not start')), START_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      const match = /MOCK_PORT=(\d+)/.exec(String(chunk));
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on('exit', () => reject(new Error('the mock exited')));
  });
  process.env.MOCK_BASE_URL = `http://127.0.0.1:${port}`;
  globalThis.mockProcess = {child, stateDirectory};
};
