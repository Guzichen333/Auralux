const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
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

const reportServicePath = 'src/renderer/src/features/netease/service/NetEaseMigrationReportService.ts';
if (!fs.existsSync(path.join(root, reportServicePath))) {
    throw new Error('Missing NetEaseMigrationReportService.ts');
}

const reportService = read(reportServicePath);
const neteaseWidget = read('src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const serviceIndex = read('src/renderer/src/features/netease/service/index.ts');

assertIncludes(reportService, 'NetEaseMigrationReport', 'Migration report type must be defined');
assertIncludes(reportService, 'snapshot', 'Reports must include a pre-import snapshot');
assertIncludes(reportService, 'failures', 'Reports must record failed tracks with reasons');
assertIncludes(reportService, 'duplicates', 'Reports must record duplicate/idempotent counts');
assertIncludes(reportService, 'canUndo', 'Reports must expose undo eligibility');
assertIncludes(reportService, 'createdPlaylistId', 'Reports must track newly created playlist id');
assertIncludes(reportService, 'recordPlaylistImport', 'Report service must persist playlist import reports');
assertIncludes(reportService, 'recordPlaylistSync', 'Report service must persist playlist sync reports');
assertIncludes(reportService, 'undoLatestCreatedImport', 'Report service must undo latest newly-created import');
assertIncludes(reportService, 'markUndone', 'Report service must mark undone reports');
assertIncludes(reportService, 'getLatestReport', 'Report service must expose latest report');
assertIncludes(reportService, 'getRecentReports', 'Report service must expose recent reports');

assertIncludes(serviceIndex, 'NetEaseMigrationReportService', 'Service index must export migration report service');
assertIncludes(neteaseWidget, 'netEaseMigrationReportService', 'NetEase import UI must use migration report service');
assertIncludes(neteaseWidget, 'recordPlaylistImport', 'New playlist imports must record reports');
assertIncludes(neteaseWidget, 'recordPlaylistSync', 'Existing playlist syncs must record reports');
assertIncludes(neteaseWidget, 'undoLatestCreatedImport', 'Import UI must expose latest import undo');
assertIncludes(neteaseWidget, 'isNew === false', 'Import flow must count existing library tracks for idempotency');
assertIncludes(neteaseWidget, 'failures.push', 'Import flow must collect per-track failure reasons');
assertIncludes(neteaseWidget, 'snapshot', 'Import flow must capture a pre-import snapshot');

assertNotIncludes(neteaseWidget, 'getLikedSongs', 'Stage 10 must not implement full liked-songs migration');
assertNotIncludes(neteaseWidget, 'getRecentPlays', 'Stage 10 must not implement recent-play migration');
assertNotIncludes(neteaseWidget, 'getCreatedPlaylists', 'Stage 10 must not implement created-playlist migration');

console.log('NetEase migration safety guard passed.');
