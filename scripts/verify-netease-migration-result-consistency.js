const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const migrationPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');
const mainControllerPath = path.join(root, 'src/main/controllers/LibraryController.ts');

const adapter = fs.readFileSync(adapterPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');
const mainController = fs.readFileSync(mainControllerPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/await this\.refreshLibrarySnapshotAfterNetEaseMigration\(\)/.test(adapter), 'adapter refreshes the library snapshot after complete migration');
expect(/private async refreshLibrarySnapshotAfterNetEaseMigration\(\): Promise<void>/.test(adapter), 'adapter has a dedicated post-migration library refresh helper');
expect(/await this\.loadLibrarySnapshot\(\)/.test(adapter), 'post-migration helper reloads playlists and tracks from the library cache');
expect(/this\.refreshPlaylistDerivedSurfaces\(\)/.test(adapter), 'post-migration refresh rebuilds derived playlist surfaces');
expect(/this\.shell\.render\(\)/.test(adapter), 'post-migration refresh renders once after data is consistent');

expect(/playlistAdded/.test(migration), 'migration result accounting distinguishes newly added playlist entries');
expect(/result\.duplicate/.test(migration), 'migration result accounting distinguishes duplicate playlist entries');
expect(/result\.isNew === false/.test(migration), 'migration result accounting distinguishes existing library tracks');
expect(/status: failures\.length > 0 \|\| skipped > 0 \? 'partial' : 'completed'/.test(migration), 'migration report status reflects partial failures');

expect(/playlistAdded: !alreadyInPlaylist/.test(mainController), 'bulk import marks newly inserted playlist entries');
expect(/duplicate: alreadyInPlaylist/.test(mainController), 'bulk import marks duplicate playlist entries');
expect(/isNew/.test(mainController), 'bulk import marks whether the library track was newly created');
expect(/results\.push\(\{[\s\S]*success: false[\s\S]*filePath/.test(mainController), 'bulk import keeps per-track failures in result list');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase migration result consistency verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase migration result consistency verification passed (${checks.length} checks).`);
