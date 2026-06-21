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
const service = read('src/main/services/netease/NetEaseApiService.ts');
const client = read('src/renderer/src/features/netease/service/NetEaseApiClient.ts');
const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const widget = read('src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');

expect(
  /private readonly preferredPort: number;/.test(service),
  'NetEaseApiService keeps the configured port as a preferred port'
);
expect(
  /private port: number;/.test(service),
  'NetEaseApiService can move to a fallback port'
);
expect(
  /private async findLaunchPort\(\): Promise<number>/.test(service),
  'NetEaseApiService resolves a launch port before spawning'
);
expect(
  /await this\.probeNetEaseApi\(this\.endpoint\)/.test(service),
  'existing-service detection uses a NetEase-specific probe'
);
expect(
  /\/login\/qr\/key\?timestamp=/.test(service),
  'main-process API probe calls a NetEase endpoint, not the server root'
);
expect(
  /data\?\.code === 200 \|\| data\?\.data\?\.code === 200/.test(service),
  'main-process API probe validates the NetEase JSON shape'
);
expect(
  /EADDRINUSE/.test(service),
  'port scan treats occupied ports as conflicts'
);
expect(
  /0\.0\.0\.0/.test(service),
  'port scan avoids ports already occupied on wildcard addresses'
);
expect(
  /PORT: String\(this\.port\)/.test(service),
  'spawned NetEase API receives the selected port'
);

expect(
  /setApiEndpoint\(endpoint: string\): void/.test(client),
  'renderer NetEase client exposes endpoint updates'
);
expect(
  /this\.config = \{\.\.\.this\.config, apiEndpoint: endpoint\};/.test(client),
  'renderer NetEase client stores the runtime endpoint'
);
expect(
  /onApiReady\(\(data\) => \{[\s\S]*?netEaseApiClient\.setApiEndpoint\(data\.endpoint\)/.test(adapter),
  'UI-NEXT adapter applies the api-ready endpoint before syncing status'
);
expect(
  /onApiUnavailable\(\(data\) => \{[\s\S]*?netEaseApiClient\.setApiEndpoint\(data\.endpoint\)/.test(adapter),
  'UI-NEXT adapter applies the api-unavailable endpoint before recovery checks'
);
expect(
  /onApiReady\(\(data\) => \{[\s\S]*?netEaseApiClient\.setApiEndpoint\(data\.endpoint\)/.test(widget),
  'legacy NetEase widget applies the api-ready endpoint before login checks'
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase API port-conflict recovery verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase API port-conflict recovery verification passed (${checks.length} checks).`);
