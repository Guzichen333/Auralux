const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'features', 'netease', 'service', 'NetEaseLocalMatchService.ts');
const serviceIndexPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'features', 'netease', 'service', 'index.ts');
const adapterPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'ui-next', 'UINextMusicBoxAdapter.ts');

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const service = read(servicePath);
const serviceIndex = read(serviceIndexPath);
const adapter = read(adapterPath);

assertContains(service, 'export type NetEaseLocalMatchStatus', 'local match status type is missing');
assertContains(service, 'matched', 'matched state is missing');
assertContains(service, 'cloud-only', 'cloud-only state is missing');
assertContains(service, 'conflict', 'conflict state is missing');
assertContains(service, 'confidence', 'match confidence is missing');
assertContains(service, 'normalizeTrackText', 'normalized text matching is missing');
assertContains(service, 'duration', 'duration matching signal is missing');
assertContains(service, 'matchTrack(', 'single track matching API is missing');
assertContains(service, 'matchTracks(', 'batch track matching API is missing');
assertContains(serviceIndex, "NetEaseLocalMatchService", 'local match service must be exported');
assertContains(adapter, 'netEaseLocalMatchService', 'UI-NEXT adapter must consume local match service');
assertContains(adapter, 'localMatchStatus', 'UI track must expose local match status');
assertContains(adapter, 'matchConfidence', 'UI track must expose match confidence');
assertContains(adapter, 'onCorrectLocalMatch', 'manual correction entry must be wired to UI-NEXT');

console.log('NetEase local matching guard passed.');
