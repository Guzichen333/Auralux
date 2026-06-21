const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');
const source = fs.readFileSync(shellPath, 'utf8');

const settingsStart = source.indexOf('NewMusicShell.prototype._renderSettingsView = function () {');
const settingsEnd = source.indexOf('NewMusicShell.prototype._focusImmersiveCacheEditInput', settingsStart);

if (settingsStart < 0 || settingsEnd < 0) {
  throw new Error('Unable to locate NewMusicShell settings render block.');
}

const settingsSource = source.slice(settingsStart, settingsEnd);

const forbiddenSettingsEntries = [
  {pattern: /\\u7f51\\u7edc\\u78c1\\u76d8/, label: 'network drive visible label'},
  {pattern: /networkDriveEnabled/, label: 'network drive toggle'},
  {pattern: /openNetworkDrive/, label: 'network drive action'},
  {pattern: /\\u63d2\\u4ef6\\u7ba1\\u7406/, label: 'plugin manager visible label'},
  {pattern: /openPluginManager/, label: 'plugin manager action'}
];

const requiredSurvivors = [
  {pattern: /\\u7528\\u6237\\u6570\\u636e\\u6587\\u4ef6\\u5939/, label: 'user data folder action'},
  {pattern: /\\u5f00\\u53d1\\u8005\\u5de5\\u5177/, label: 'developer tools action'},
  {pattern: /\\u786c\\u4ef6\\u52a0\\u901f/, label: 'hardware acceleration setting'}
];

const failures = [];

for (const entry of forbiddenSettingsEntries) {
  if (entry.pattern.test(settingsSource)) {
    failures.push(`Settings still exposes ${entry.label}.`);
  }
}

for (const survivor of requiredSurvivors) {
  if (!survivor.pattern.test(settingsSource)) {
    failures.push(`Settings lost expected ${survivor.label}.`);
  }
}

if (failures.length > 0) {
  console.error('Settings plugin/network-drive visibility guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Settings plugin/network-drive visibility guard passed.');
