const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');

const adapter = fs.readFileSync(adapterPath, 'utf8');
const shell = fs.readFileSync(shellPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

function methodBody(source, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = new RegExp(`(?:^|\\n)\\s*(?:(?:private|public|protected)\\s+)?(?:async\\s+)?${escapedName}\\s*\\(`, 'g');
  const prototypeAssignment = new RegExp(`${escapedName}\\s*=\\s*function\\s*\\(`, 'g');
  const match = declaration.exec(source) || prototypeAssignment.exec(source);
  const start = match?.index ?? -1;
  if (start === -1) return '';
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(brace, i + 1);
  }
  return '';
}

const constructorBody = methodBody(adapter, 'constructor');
const apiReadyHandler = /onApiReady\(\([^)]*\) => \{[\s\S]*?syncNetEaseStatus\(0,\s*\{force:\s*true\}\)/.test(constructorBody);
const apiUnavailableHandler = /onApiUnavailable\(\([^)]*\) => \{[\s\S]*?handleNetEaseApiUnavailable\(\)/.test(constructorBody);

expect(/private netEaseStatusRefreshSession = 0;/.test(adapter), 'adapter tracks NetEase status refresh sessions');
expect(/private netEaseUnavailableRecoveryTimer = 0;/.test(adapter), 'adapter tracks delayed unavailable recovery');
expect(apiReadyHandler, 'late api-ready event forces a fresh NetEase status sync');
expect(apiUnavailableHandler, 'api-unavailable event is routed through recovery handler');
expect(/private handleNetEaseApiUnavailable\(\): void/.test(adapter), 'adapter has a NetEase unavailable recovery handler');
expect(/private scheduleNetEaseUnavailableRecovery\(\): void/.test(adapter), 'adapter schedules a delayed NetEase recovery check');
expect(/window\.setTimeout\(\(\) => \{[\s\S]*?syncNetEaseStatus\(0,\s*\{force:\s*true\}\)/.test(adapter), 'recovery check forces status sync after transient unavailable state');
expect(/private async syncNetEaseStatus\(attempt = 0,\s*options: \{force\?: boolean\} = \{\}\): Promise<void>/.test(adapter), 'syncNetEaseStatus supports forced refreshes');
expect(/const session = \+\+this\.netEaseStatusRefreshSession;/.test(adapter), 'syncNetEaseStatus ignores stale async results');
expect(/if \(!options\.force && attempt === 0 && this\.shell\.state\.neteaseStatus === 'online'\)/.test(adapter), 'regular status sync can avoid unnecessary duplicate checks');

const toggleBody = methodBody(shell, 'NewMusicShell.prototype.toggleNetEaseMenu');
expect(/refreshNetEaseStatus/.test(shell), 'shell exposes a NetEase status refresh hook');
expect(/refreshNetEaseStatus/.test(toggleBody), 'opening the NetEase account menu triggers a status refresh');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase API late-ready recovery verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase API late-ready recovery verification passed (${checks.length} checks).`);
