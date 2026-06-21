const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainControllerPath = path.join(root, 'src/main/controllers/LibraryController.ts');
const preloadPath = path.join(root, 'src/main/preload.ts');
const gatewayPath = path.join(root, 'src/renderer/src/infrastructure/electron/LibraryGateway.ts');
const dataServicePath = path.join(root, 'src/renderer/src/features/library/service/LibraryDataService.ts');
const migrationPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');

const mainController = fs.readFileSync(mainControllerPath, 'utf8');
const preload = fs.readFileSync(preloadPath, 'utf8');
const gateway = fs.readFileSync(gatewayPath, 'utf8');
const dataService = fs.readFileSync(dataServicePath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/@IpcHandle\(['"]library:bulkImportVirtualTracksToPlaylist['"]\)/.test(mainController), 'main process exposes a bulk virtual-track playlist import IPC');
expect(/async bulkImportVirtualTracksToPlaylist\(/.test(mainController), 'main process implements bulk virtual-track playlist import');
expect(/saveCache\(\);[\s\S]*webContents\.send\(['"]library:updated['"]/.test(mainController), 'bulk import saves cache once and emits one library update');
expect(!/bulkImportVirtualTracksToPlaylist[\s\S]{0,1200}addTrackToLibrary\(/.test(mainController), 'bulk import does not call per-track addTrackToLibrary');
expect(!/bulkImportVirtualTracksToPlaylist[\s\S]{0,1200}addToPlaylist\(/.test(mainController), 'bulk import does not call per-track addToPlaylist');
expect(/bulkImportVirtualTracksToPlaylist:\s*\([^)]*\)\s*=>\s*ipcRenderer\.invoke\(['"]library:bulkImportVirtualTracksToPlaylist['"]/.test(preload), 'preload exposes the bulk import IPC');
expect(/bulkImportVirtualTracksToPlaylist\(/.test(gateway), 'renderer gateway exposes bulk import');
expect(/bulkImportVirtualTracksToPlaylist\(/.test(dataService), 'library data service exposes bulk import');
expect(/libraryDataService\.bulkImportVirtualTracksToPlaylist/.test(migration), 'NetEase migration uses the bulk import path');
expect(!/libraryController\.addTrackToLibrary/.test(migration), 'NetEase migration no longer imports every track through per-track addTrackToLibrary');
expect(!/libraryController\.addToPlaylist/.test(migration), 'NetEase migration no longer adds every track through per-track addToPlaylist');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase asset migration bulk library write verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase asset migration bulk library write verification passed (${checks.length} checks).`);
