const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(ok, label) {
  checks.push({ok, label});
}

const checks = [];
const warmup = read('src/renderer/src/ui-next/startupWarmup.ts');
const bootstrap = read('src/renderer/src/ui-next/bootstrap.ts');
const preload = read('src/main/preload.ts');
const electronTypes = read('src/renderer/src/api/types/electron.ts');

expect(
  /waitForNetEaseApiReady\(\): Promise<string>/.test(warmup),
  'startup warmup waits for the main-process NetEase API ready event'
);
expect(
  /MAX_STARTUP_WAIT_MS\s*=\s*45000/.test(warmup),
  'startup warmup allows the NetEase API startup timeout before failing'
);
expect(
  /window\.electronAPI\?\.netease/.test(warmup)
    && /onApiReady\(\(data\) => \{[\s\S]*?resolve\(data\.endpoint\)/.test(warmup),
  'startup warmup resolves only after api-ready provides an endpoint'
);
expect(
  /window\.electronAPI\?\.netease/.test(warmup)
    && /onApiUnavailable\(\(data\) => \{[\s\S]*?reject\(new Error/.test(warmup),
  'startup warmup treats api-unavailable as a startup gate failure'
);
expect(
  /netEaseApiClient\.setApiEndpoint\(endpoint\)/.test(warmup),
  'startup warmup applies the runtime endpoint before checking availability'
);
expect(
  /id: 'neteaseAvailability'[\s\S]*?const endpoint = await waitForNetEaseApiReady\(\)/.test(warmup),
  'NetEase availability task is driven by the api-ready gate'
);
expect(
  /criticalTaskIds\s*=\s*new Set\(\['neteaseAvailability'\]\)/.test(warmup),
  'NetEase availability is marked as a critical startup task'
);
expect(
  /throw error;[\s\S]*?degraded\.push\(definition\.id\)/.test(warmup),
  'critical startup task failures reject warmup instead of degrading'
);
expect(
  /throw new Error\('Startup critical task timed out: neteaseAvailability'\)/.test(warmup),
  'NetEase API timeout prevents entering the home shell'
);
expect(
  /Promise\.all\(definitions\.map/.test(warmup) && !/Promise\.allSettled\(definitions\.map/.test(warmup),
  'critical startup task failures reject warmup instead of being swallowed'
);
expect(
  /return Promise\.all\(\[warmup, waitForStartupGate\(startedAt\)\]\)/.test(bootstrap),
  'bootstrap waits for warmup completion before removing startup splash'
);
expect(
  !/Promise\.race\(\[\s*Promise\.all\(\[warmup/.test(bootstrap),
  'bootstrap does not race warmup against a fallback timer before entering home'
);
expect(
  /latestNetEaseApiStatus/.test(preload) && /getApiStatus: \(\) => latestNetEaseApiStatus/.test(preload),
  'preload stores the latest NetEase API status for late startup subscribers'
);
expect(
  /queueMicrotask\(\(\) => callback\(snapshot\.data\)\)/.test(preload),
  'preload replays the latest NetEase API event to late subscribers'
);
expect(
  /getApiStatus\(\):/.test(electronTypes),
  'renderer types expose replayable NetEase API status'
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('Startup NetEase API gate verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`Startup NetEase API gate verification passed (${checks.length} checks).`);
