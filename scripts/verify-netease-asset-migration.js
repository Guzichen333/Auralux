const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function mustExist(relativePath) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Missing ${relativePath}`);
    }
    return read(relativePath);
}

function assertIncludes(content, needle, message) {
    if (!content.includes(needle)) {
        throw new Error(message);
    }
}

function assertNotIncludes(content, needle, message) {
    if (content.includes(needle)) {
        throw new Error(message);
    }
}

const service = mustExist('src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');
const serviceIndex = read('src/renderer/src/features/netease/service/index.ts');
const types = read('src/renderer/src/features/netease/types.ts');
const widget = read('src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');

assertIncludes(service, 'NetEaseAssetMigrationService', 'Stage 11 must add an asset migration service');
assertIncludes(service, 'getMigrationPreview', 'Asset migration must expose a preview');
assertIncludes(service, 'migrateAllAssets', 'Asset migration must expose a full migration entry');
assertIncludes(service, 'prepareMigrationPreflight', 'Asset migration must expose a preflight entry');
assertIncludes(service, 'migratePreview', 'Asset migration must migrate a prepared preview');
assertIncludes(service, 'migrateLikedSongs', 'Asset migration must import liked songs');
assertIncludes(service, 'migrateUserPlaylists', 'Asset migration must import user playlists');
assertIncludes(service, 'migrateRecentPlays', 'Asset migration must import recent plays');
assertIncludes(service, '/likelist', 'Liked songs must use NetEase liked-list endpoint');
assertIncludes(service, '/user/playlist', 'User playlists must use NetEase user playlist endpoint');
assertIncludes(service, '/record/recent/song', 'Recent plays must use NetEase recent-song endpoint');
assertIncludes(service, 'created', 'User playlist migration must distinguish created playlists');
assertIncludes(service, 'subscribed', 'User playlist migration must distinguish subscribed playlists');
assertIncludes(service, 'progress', 'Migration must expose progress state');
assertIncludes(service, 'failures.push', 'Migration must collect failures');
assertIncludes(service, 'netEaseMigrationReportService', 'Migration must reuse Stage 10 report service');
assertIncludes(service, 'coverImagePath', 'Playlist covers must be written into playlist metadata');
assertIncludes(service, 'isNew === false', 'Migration must count duplicates/idempotent existing tracks');
assertIncludes(service, 'createPlaylist', 'Migration must create local target playlists');
assertIncludes(service, 'updatePlaylistMetadata', 'Migration must tag imported playlists with NetEase metadata');
assertIncludes(service, 'addTrackToLibrary', 'Migration must register NetEase tracks in the library');
assertIncludes(service, 'addToPlaylist', 'Migration must add imported tracks to playlists');

assertIncludes(serviceIndex, 'NetEaseAssetMigrationService', 'Service index must export NetEaseAssetMigrationService');
assertIncludes(types, 'NetEaseMigrationAssetKind', 'Types must define migration asset kinds');
assertIncludes(types, 'NetEaseMigrationPreview', 'Types must define migration preview');
assertIncludes(types, 'NetEaseMigrationProgress', 'Types must define migration progress');

assertIncludes(widget, 'netEaseAssetMigrationService', 'NetEase UI must use asset migration service');
assertIncludes(widget, 'openAssetMigration', 'NetEase UI must expose asset migration entry');
assertIncludes(widget, 'prepareAssetMigrationPreflight', 'NetEase UI must preflight full asset migration');
assertIncludes(widget, 'migratePreview', 'NetEase UI must start full asset migration from confirmed preview');
assertIncludes(widget, 'assetMigrationProgress', 'NetEase UI must render asset migration progress');

assertNotIncludes(service, 'lyricsTranslation', 'Stage 11 must not add lyric translation');
assertNotIncludes(service, 'sideBySideLyrics', 'Stage 11 must not add side-by-side lyrics');

console.log('NetEase asset migration guard passed.');
