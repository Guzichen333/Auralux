# Auralux Next Stage Progress Log

## Stage 44: Trusted NetEase Sync Failure / Retry Loop

### Target

Make NetEase playlist sync failures and conflicts understandable and retryable from UI-NEXT:

- failure fallback copy is Chinese and user-facing;
- conflict copy clearly says local songs are protected;
- missing NetEase playlist id does not leak English implementation wording;
- the top-right `重试同步` action retries retryable playlist sync states instead of only refreshing account status;
- dashboard/account-center state refreshes after retry.

Scope boundaries:

- Do not touch playback core.
- Do not touch immersive playback visuals.
- Do not change migration write semantics.
- Reuse the existing `NetEaseSyncStateService.retryPlaylistSync()` trusted sync path.

### Changed Files

- `scripts/verify-netease-trusted-sync-stage44.js`
- `src/renderer/src/features/netease/service/NetEaseSyncStateService.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused Stage 44 verifier and watched it fail first on the existing English sync fallback copy.
- Localized sync fallback reasons:
  - `网易云同步失败`
  - `缺少网易云歌单 ID`
  - `发现同步冲突：... 本地歌曲会保留，请确认后再重试同步。`
- `retryNetEaseAccountSync()` now delegates to `retryRetryableNetEaseSyncs()`.
- The retry-all helper enumerates `netEaseSyncStateService.getAllPlaylistSyncStates()`, retries states with `retryable === true`, refreshes NetEase account status, migration dashboard, and account center, then renders current UI state.
- If no retryable state exists, the action refreshes account status and tells the user `没有需要重试的网易云同步，已刷新账号状态`.

### Verification Results

- `node scripts/verify-netease-trusted-sync-stage44.js`: RED first, then PASS.
- `node scripts/verify-netease-trusted-sync.js`: PASS.
- `node scripts/verify-netease-migration-dashboard.js`: PASS.
- `node scripts/verify-stage36-visible-copy-cleanup.js`: PASS.
- `node --check src/renderer/src/features/netease/service/NetEaseSyncStateService.ts`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run build:ts`: PASS.
- GitNexus `impact` could not find the new Stage 44 symbols in the current index, so risk for those exact symbols is `UNKNOWN`.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 42`, `affected_count 27`, `changed_files 17`. This is the accumulated dirty worktree risk, not isolated Stage 44 scope.

### Runtime Test Request

After dev restart or while the current CDP-enabled Electron instance is running:

- open the top-right NetEase avatar menu;
- confirm `重试同步` is visible and clickable;
- if no failed/conflict sync exists, clicking it should show `没有需要重试的网易云同步，已刷新账号状态`;
- if a failed/conflict playlist sync exists, it should retry via the trusted playlist sync state path and refresh `迁移状态`.

## Stage 45: Search Experience Completion

### Target

Make UI-NEXT search feel like a daily-use search surface rather than a raw result list:

- keep search history, fuzzy suggestions, filters, local/NetEase source labels, direct play, favorite, and add-to-playlist actions;
- remove remaining English search entity copy;
- make playlist/entity results explicitly actionable with an `打开` control;
- keep layout stable when entity action buttons appear.

Scope boundaries:

- Do not touch playback core.
- Do not change search providers or NetEase API behavior.
- Do not add artist/album/statistics product areas back.
- Keep changes inside UI-NEXT search rendering and adapter search entity shaping.

### Changed Files

- `scripts/verify-netease-search-stage45.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/components/TopSearch.js`
- `src/renderer/ui-next-static/components/SearchResultsView.js`
- `src/renderer/ui-next-static/styles.css`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused Stage 45 verifier and watched it fail first on existing English copy (`NetEase artist result`, `tracks`).
- Search entity subtitles are now Chinese:
  - `网易云歌手`
  - `本地歌手`
  - `N 首歌曲`
- Top search panel playlist entities now render a stable `打开` action button.
- Full search results page playlist entities now render the same explicit `打开` action button.
- Added fixed-width `.mb-search-entity__open` styling so entity rows do not shift when the action appears.

### Verification Results

- `node scripts/verify-netease-search-stage45.js`: RED first, then PASS.
- `node scripts/verify-netease-search-experience.js`: PASS.
- `node --check src/renderer/ui-next-static/components/TopSearch.js`: PASS.
- `node --check src/renderer/ui-next-static/components/SearchResultsView.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run build:ts`: PASS.
- GitNexus impact before edits:
  - `UINextMusicBoxAdapter.search`: LOW.
  - `TopSearch`: LOW.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 43`, `affected_count 27`, `changed_files 19`. This is accumulated dirty worktree risk; Stage 45 direct UI scope is search rendering/entity presentation.

### Runtime Verification

Restarted Electron with CDP at `http://127.0.0.1:9223` and verified through Playwright DOM automation:

- App title is `Auralux`.
- Searching `网易云` renders filters `全部 / 歌曲 / 歌手 / 专辑 / 歌单`.
- Search entities render with Chinese subtitles and no `NetEase artist result`, `Local artist result`, or `N tracks` copy.
- NetEase playlist entities render `打开` buttons.
- Entity result sample included `[网易云] 我喜欢71 首歌曲网易云打开`.

## Stage 46: Offline / Cache State Completion

### Target

Make offline/cache confidence visible at the playlist level, not only inside individual track rows:

- preserve row-level `离线可播 / 已匹配本地 / 仅云端`, cover-cache, and lyrics-cache chips;
- add playlist-header summary for offline playable count, cover cache count, and lyrics cache count;
- do not touch playback resolution, queue behavior, or immersive playback quality.

Scope boundaries:

- Do not modify `toUINextTrack()` or playback resolver behavior in this stage.
- Do not change NetEase local matching thresholds.
- Only add UI summary on top of existing status fields.

### Changed Files

- `scripts/verify-offline-cache-stage46.js`
- `src/renderer/ui-next-static/components/PlaylistView.js`
- `src/renderer/ui-next-static/styles.css`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused Stage 46 verifier and watched it fail first because `PlaylistView` had no playlist-level cache summary.
- `PlaylistView` now computes `cacheSummary` from existing UI track fields:
  - `offlinePlayable`
  - `coverCacheStatus`
  - `lyricsCacheStatus`
- Playlist header now shows compact chips:
  - `离线 N/M`
  - `封面 N/M`
  - `歌词 N/M`
- Added fixed, compact `.mb-pl-cache-summary*` styles to keep the header scan-friendly.

### Verification Results

- `node scripts/verify-offline-cache-stage46.js`: RED first, then PASS.
- `node scripts/verify-offline-status.js`: PASS.
- `node --check src/renderer/ui-next-static/components/PlaylistView.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run build:ts`: PASS.
- GitNexus impact before edits:
  - `PlaylistView`: LOW.
  - `toUINextTrack`: HIGH, so Stage 46 avoided touching it.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 44`, `affected_count 27`, `changed_files 20`. This is accumulated dirty worktree risk.

### Runtime Verification

Restarted Electron with CDP at `http://127.0.0.1:9223` and verified through Playwright DOM automation:

- Opened real playlist `[网易云] 我喜欢`.
- Playlist header rendered cache summary:
  - `离线71/71`
  - `封面71/71`
  - `歌词0/71`
- Track row status chips still rendered samples:
  - `已匹配本地`
  - `封面已缓存`
  - `歌词待缓存`
  - `匹配 100%`

## Stage 47: Startup Page / Startup Warmup Completion

### Target

Make startup feel intentional and trustworthy while backend/cache work starts:

- keep the dynamic startup splash and bounded exit guard;
- keep startup warmup tasks for settings, library, playback queue, NetEase API/profile, cover cache, cover manifest, lyrics index, and lyrics cache;
- remove remaining English user-visible warmup task labels/messages;
- verify startup does not get stuck on the splash.

Scope boundaries:

- Do not change playback core.
- Do not change Electron main-process startup ordering.
- Do not increase startup blocking time beyond the existing bounded guard.

### Changed Files

- `scripts/verify-startup-stage47.js`
- `src/renderer/src/ui-next/startupWarmup.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused Stage 47 verifier and watched it fail first on English warmup copy:
  - `Preload playlist cover metadata`
  - `Warm lyrics cache index`
  - `cover cache hits`
  - `queued cover checks`
  - `lyrics cache warmed`
- Localized remaining startup warmup labels/messages:
  - `预加载歌单封面`
  - `预热歌词索引`
  - `封面缓存命中 N 个`
  - `已排队检查封面 N 个`
  - `歌单封面缓存已就绪`
  - `歌词索引已预热 N 项`
  - `歌词索引已就绪`

### Verification Results

- `node scripts/verify-startup-stage47.js`: RED first, then PASS.
- `node scripts/verify-startup-warmup.js`: PASS.
- `node scripts/verify-startup-splash-exit.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run build:ts`: PASS.
- GitNexus impact:
  - `startupWarmup`: not found in current index, treated as index coverage gap.
  - `NewMusicShell`: LOW.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 44`, `affected_count 27`, `changed_files 21`. This is accumulated dirty worktree risk.

### Runtime Verification

Restarted Electron with CDP at `http://127.0.0.1:9223` and verified:

- DevTools endpoint was available.
- Runtime logs showed window display, library cache loading, NativeAudio initialization, and NetEase API running at `http://127.0.0.1:3000`.
- DOM check after startup:
  - title `Auralux`;
  - `.mb-startup` absent;
  - `.ui-next-shell` present;
  - no `Preload playlist cover metadata` or `Warm lyrics cache index` text in body.

## Stage 48: UI-NEXT / Old UI Compatibility Boundary

### Target

Lock the product onto UI-NEXT while preventing risky wholesale deletion of compatibility-only old runtime code:

- renderer entry boots UI-NEXT directly;
- no visible return-to-old-UI switch;
- old artist/album/statistics navigation and settings stay removed;
- retired settings are still migrated away so old cache values cannot resurrect removed pages;
- old UI runtime remains compatibility-only where dialogs, widgets, plugin host compatibility, and legacy ports are still reused.

Scope boundaries:

- Do not delete old runtime directories wholesale in this stage.
- Do not remove plugin compatibility host fields yet.
- Do not remove reused NetEase/login/import dialogs.
- Do not touch playback or immersive player.

### Changed Files

- `scripts/verify-stage48-ui-next-legacy-boundary.js`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused Stage 48 verifier and watched it fail first because the Stage 48 boundary had not been recorded.
- Confirmed `src/renderer/src/app/bootstrap/main.ts` boots `../../ui-next/bootstrap` directly and has no `loadLegacyApp` or `legacy-ui` fallback.
- Confirmed `scripts/verify-ui-next-formalized.js` passes.
- Confirmed `scripts/verify-no-legacy-artist-album-statistics.js` passes.
- Confirmed `SettingsStore` keeps `retiredSettingKeys` for `statistics`, `artistsPage`, and `albumsPage`, and deletes those keys during migration. This is intentional cleanup, not a product feature.
- old UI runtime remains compatibility-only because UI-NEXT still reuses old widgets/dialogs and plugin compatibility ports.

### Verification Results

- `node scripts/verify-stage48-ui-next-legacy-boundary.js`: RED first, then PASS.
- `node scripts/verify-no-legacy-artist-album-statistics.js`: PASS.
- `node scripts/verify-ui-next-formalized.js`: PASS.
- `npm.cmd run typecheck:renderer`: pending in Stage 49 aggregate gate.
- `npm.cmd run build:renderer`: pending in Stage 49 aggregate gate.

### Runtime Verification

No extra runtime restart was required for this documentation/guard boundary. Stage 47 runtime verification already proved the app starts into `.ui-next-shell`, and Stage 48 adds guard coverage so old UI switches/pages do not reappear.

## Stage 49: Release Quality Gate / Pre-Commit Review

### Target

Run a consolidated quality gate over the accumulated UI-NEXT, NetEase, startup, cache/offline, old-UI boundary, and playback-regression guards before any commit or release decision.

Scope boundaries:

- Do not clean, reset, revert, or commit.
- Do not delete runtime logs.
- Treat GitNexus CRITICAL as accumulated dirty-worktree review scope, not as cleanup permission.

### Changed Files

- `scripts/verify-auralux-stage35-quality-gate.js`
- `scripts/verify-netease-asset-migration-preflight.js`
- `scripts/verify-netease-asset-migration.js`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added Stage 44-48 guards into the aggregate Stage 35 quality gate:
  - trusted sync Stage 44;
  - search Stage 45;
  - offline/cache Stage 46;
  - startup Stage 47;
  - UI-NEXT/legacy boundary Stage 48;
  - migration lifecycle/render/bulk/preflight/cancel guards from Stage 37-43.
- Updated older migration guards to match the current bulk-import and cancellation-aware migration architecture:
  - `migratePreview(preview, onProgress, control)`;
  - `bulkImportVirtualTracksToPlaylist`;
  - no per-track `libraryController.addTrackToLibrary` / `libraryController.addToPlaylist` path in NetEase full migration.

### Verification Results

- `node scripts/verify-auralux-stage35-quality-gate.js`: PASS after updating stale migration guards.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run build:ts`: PASS.

### Runtime Verification

Restarted Electron with CDP at `http://127.0.0.1:9223` and ran final smoke:

- Startup leaves splash and reaches `.ui-next-shell`.
- Top-right NetEase account trigger shows `网易云：已登录`.
- NetEase account menu renders `迁移全部资产`, `重新登录`, `重试同步`, `迁移状态`, `复制诊断`.
- Search `网易云` renders filters and playlist entities with `打开`; no `NetEase artist result` or `N tracks` copy remains.
- Opened real playlist `[网易云] 我喜欢`; cache summary renders `离线71/71`, `封面71/71`, `歌词0/71`.

### Remaining Review Risk

- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 44`, `affected_count 27`, `changed_files 24`. This is expected because the dirty worktree contains many accumulated stages across NetEase migration/sync, UI-NEXT search/cache/startup, playback guards, and library IPC.
- Runtime/dev logs remain dirty or untracked by instruction; do not clean them unless explicitly asked.

## Stage 39: NetEase Migration Result Consistency

### Target

Make the UI state consistent after complete NetEase migration now that Stage 38 writes library data in bulk. The migration result must be based on real bulk-write results, and UI-NEXT should reload the library snapshot before showing migration/dashboard/account state.

Scope boundaries:

- Do not change playback core.
- Do not change immersive playback visuals.
- Do not add local matching behavior.
- Keep Stage 38 bulk import IPC semantics intact.

### Changed Files

- `scripts/verify-netease-migration-result-consistency.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused consistency guard for migration result accounting and post-migration UI refresh.
- `UINextMusicBoxAdapter.migrateAllNetEaseAssets()` now calls `refreshLibrarySnapshotAfterNetEaseMigration()` after the account-menu migration completes.
- The helper reloads the library snapshot, rebuilds derived playlist/dashboard/account surfaces, and renders once so imported NetEase playlists and counts reflect the persisted cache.
- Existing Stage 38 bulk result fields remain the source for `added`, `existing`, `duplicates`, skipped failures, and report status.

### Verification Results

- `node scripts/verify-netease-migration-result-consistency.js`: RED first, then PASS with 13 checks.
- `node scripts/verify-netease-asset-migration-bulk-library-write.js`: PASS.
- `node scripts/verify-netease-asset-migration-render-isolation.js`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.

### Manual Test Request

Restart the dev app, run complete NetEase migration, and confirm:

- imported NetEase playlists appear without manually restarting;
- playlist track counts match the migration result;
- running the same migration again does not duplicate tracks inside playlists;
- migration dashboard/account menu counts refresh after completion.

## Stage 38: NetEase Migration Bulk Library Writes

### Target

Fix migration-time UI hangs caused by importing NetEase assets through per-track library IPC calls. Logs showed migration had already passed NetEase API calls and was spending time in repeated `LibraryCacheManager` writes: each track went through `addTrackToLibrary()` and `addToPlaylist()`, causing repeated whole-cache saves and repeated `library:updated` events.

Scope boundaries:

- Do not change playback core.
- Do not change immersive playback visuals.
- Do not change normal local-file import behavior.
- Keep existing single-track library APIs compatible.

### Changed Files

- `scripts/verify-netease-asset-migration-bulk-library-write.js`
- `src/main/controllers/LibraryController.ts`
- `src/main/preload.ts`
- `src/renderer/src/api/types/electron.ts`
- `src/renderer/src/infrastructure/electron/LibraryGateway.ts`
- `src/renderer/src/features/library/service/LibraryDataService.ts`
- `src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added `library:bulkImportVirtualTracksToPlaylist`.
- The bulk path accepts NetEase virtual tracks only, creates missing virtual tracks, adds them to the target playlist, saves the cache once, and emits one `library:updated` event.
- NetEase asset migration now uses `libraryDataService.bulkImportVirtualTracksToPlaylist()` instead of per-track `libraryController.addTrackToLibrary()` plus `libraryController.addToPlaylist()`.
- Existing single-track import and add-to-playlist APIs remain unchanged for other flows.

### Verification Results

- `node scripts/verify-netease-asset-migration-bulk-library-write.js`: RED first, then PASS with 11 checks.
- `node scripts/verify-netease-asset-migration-render-isolation.js`: PASS.
- `node scripts/verify-netease-account-menu-migration-running.js`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.

### Manual Test Request

Restart the dev app, start `迁移全部资产`, and watch whether the UI remains responsive during the local write phase. Expected behavior:

- NetEase API requests still run normally.
- The progress text may update by asset group instead of every single song.
- The app should not freeze while songs are written into the local library.
- After migration finishes, the library should refresh once and imported NetEase playlists should contain the migrated tracks.

## Stage 37: NetEase Migration Render Isolation

### Target

Prevent complete NetEase asset migration running-state updates from forcing full UI-NEXT shell renders. This stage addresses the customer-experience issue where migration progress and account-menu state changes could make the top-right avatar menu flicker or feel unresponsive.

Scope boundaries:

- Do not change playback core.
- Do not change immersive playback visuals or quality.
- Do not continue local-song matching work.
- Do not delete, clean, reset, or commit runtime logs.

### Changed Files

- `docs/superpowers/plans/2026-06-21-stage37-netease-migration-render-isolation.md`
- `scripts/verify-netease-asset-migration-render-isolation.js`
- `scripts/verify-netease-account-menu-migration-running.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added an adapter-level `netEaseAssetMigrationInFlight` guard so repeated complete-migration clicks show a running-state toast instead of starting a second migration.
- Added `setNetEaseAssetMigrationRunning(running)` so migration running-state changes are centralized.
- Added `NewMusicShell.renderNetEaseAccountStatus()` and wired the adapter to use it when available.
- The focused renderer swaps only the top-right `.mb-netease-account` subtree instead of rebuilding the whole shell.
- Existing open-menu stability remains guarded by the Stage 36 account-menu dropdown preservation checks.

### Verification Results

- `node scripts/verify-netease-asset-migration-render-isolation.js`: RED first, then PASS with 10 checks.
- `node scripts/verify-netease-account-menu-migration-running.js`: PASS after aligning it with the focused render path.
- `node scripts/verify-netease-account-menu-render-stability.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.

### Manual Test Request

Restart the dev app, start `迁移全部资产`, click outside the migration modal, then open the top-right NetEase avatar menu while migration is still running. Confirm:

- the menu opens normally;
- it does not visibly flicker;
- the primary migration action shows the running state and cannot be clicked again;
- the app does not become noticeably less smooth during the menu interaction.

## Stage 23: NetEase Account Menu Asset Migration Entry

### Target

Make complete NetEase asset migration reachable from the UI-NEXT account menu instead of hiding it inside the playlist import modal.

Covered behavior:

- The top-right NetEase account dropdown exposes a primary `迁移全部资产` action.
- The action reuses the existing `NetEaseAssetMigrationService.migrateAllAssets()` flow through the existing NetEase widget.
- The existing import modal is opened so progress and result text remain visible.
- After migration starts/completes, UI-NEXT refreshes migration dashboard/account-center state and opens the migration dashboard.
- Do not change local-song matching, playback core, or immersive playback visuals.

### Changed Files

- `scripts/verify-netease-account-menu-asset-migration.js`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/components/TopSearch.js`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-netease-account-menu-asset-migration.js`
- `node --check src/renderer/ui-next-static/components/TopSearch.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-account-menu-asset-migration.js`: RED first with `Account menu must expose a one-click complete asset migration action`, then PASS after implementation.
- `node --check src/renderer/ui-next-static/components/TopSearch.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- GitNexus impact before edits:
  - `TopSearch`: LOW.
  - `NewMusicShell`: LOW.
  - `UINextMusicBoxAdapter`: LOW.
  - `NetEaseCloudMusic`: HIGH because it is shared by old runtime component initialization and UI-NEXT. The implementation therefore only adds a public wrapper that reuses the existing private migration path.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 141`, `affected_count 43`, `changed_files 36`. This is accumulated multi-stage dirty-worktree risk, not isolated Stage 23 risk.

### Implementation Notes

- `NetEaseCloudMusic.startAssetMigrationFromAccountMenu()` publicly reuses the existing asset migration path.
- `UINextMusicBoxAdapter.migrateAllNetEaseAssets()` calls the widget, refreshes migration/account state, and opens the migration dashboard.
- `TopSearch` adds `迁移全部资产` as the account menu primary action.
- `NewMusicShell` wires `onMigrateAllNetEaseAssets` and closes the menu before starting migration.

### Manual Test Requested

Ask the user to open the top-right NetEase avatar menu and click `迁移全部资产`. The import modal should open, asset migration progress/result should appear, and the migration dashboard should become visible. Test with a logged-in NetEase account.

## Stage 22.1: NetEase Topbar Account Menu Cleanup

### Target

Move the NetEase account/avatar surface out of the lower-left sidebar and into the existing top-right NetEase status position.

Covered behavior:

- Top-right control shows only the NetEase avatar/status indicator, not a long inline text pill.
- Clicking the avatar opens a compact secondary menu.
- Menu contains nickname/status, last sync text, asset counts, failure/retry/migrated counts, and actions.
- Sidebar no longer owns the NetEase account center or avatar area.
- Reuse the existing login, retry sync, migration dashboard, and diagnostics copy paths.
- Do not touch local-song matching, playback core, or immersive playback visuals.

### Changed Files

- `scripts/verify-netease-account-menu-topbar.js`
- `src/renderer/ui-next-static/components/TopSearch.js`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-netease-account-menu-topbar.js`
- `node --check src/renderer/ui-next-static/components/TopSearch.js`
- `node --check src/renderer/ui-next-static/components/Sidebar.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-account-menu-topbar.js`: RED first with `Topbar must render a NetEase avatar-only account trigger`, then PASS after implementation.
- `node --check src/renderer/ui-next-static/components/TopSearch.js`: PASS.
- `node --check src/renderer/ui-next-static/components/Sidebar.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- GitNexus impact before edits:
  - `TopSearch`: LOW.
  - `Sidebar`: LOW.
  - `NewMusicShell`: LOW.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 141`, `affected_count 43`, `changed_files 36`. This is accumulated multi-stage dirty-worktree risk, not isolated Stage 22.1 risk.

### Implementation Notes

- `TopSearch` now renders `neteaseAccountTrigger()` and `mb-netease-menu`.
- Topbar avatar trigger receives `neteaseAvatarUrl`, status, nickname, sync text, and `neteaseAccountCenter`.
- `NewMusicShell` owns `neteaseMenuOpen`, outside-click close, Escape close, and action-after-close behavior.
- `Sidebar` no longer receives or renders NetEase account/avatar props.
- Old `.mb-account-center*` sidebar styles were removed; new `.mb-netease-account*` and `.mb-netease-menu*` styles were added.

### Manual Test Requested

Ask the user to inspect the top-right NetEase avatar: it should show only the avatar/status indicator; clicking it should open the menu; login/relogin, retry sync, migration status, and copy diagnostics should work; clicking outside or pressing Escape should close the menu; the lower-left sidebar should no longer feel crowded by account details.

## Stage 22: NetEase Account Center Hub

### Target

Make the UI-NEXT sidebar account area feel like a real NetEase account and migration center without continuing local-song matching work.

Covered behavior:

- Show a compact account-center block under the existing NetEase avatar/nickname/status.
- Surface migrated asset counts for liked songs, created playlists, favorite/subscribed playlists, and recent playback.
- Surface migration/sync failure count, retryable count, and migrated track count.
- Provide direct actions for login/relogin, migration dashboard, diagnostics copy, and existing retry sync.
- Reuse existing migration report, sync state, login, and diagnostics paths.
- Do not touch local playback priority or immersive playback visuals.

### Changed Files

- `scripts/verify-netease-account-center-hub.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-netease-account-center-hub.js`
- `node --check src/renderer/ui-next-static/components/Sidebar.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-account-center-hub.js`: RED first with `Adapter must define an account-center state shape`, then PASS after implementation.
- `node --check src/renderer/ui-next-static/components/Sidebar.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- GitNexus impact before edits:
  - `UINextMusicBoxAdapter`: LOW.
  - `Sidebar`: LOW.
  - `syncNetEaseStatus`: LOW.
  - `buildMigrationDashboardState`: not found in current index, treated as index coverage gap.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 138`, `affected_count 43`, `changed_files 36`. This is accumulated Stage 8-22 risk, not isolated Stage 22 risk.
- Dev restart with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`: Electron main window title `Auralux`, `Responding=True`; logs showed library cache loaded 890 tracks, audio engine initialized, NetEase API started at `http://127.0.0.1:3000`, and redacted NetEase QR/account requests.

### Implementation Notes

- Added `UINextNetEaseAccountCenterState`.
- Adapter now builds `neteaseAccountCenter` from existing migration dashboard, migration reports, sync states, and NetEase playlists.
- Account center refreshes after library snapshot, account status update, and migration dashboard open.
- `NewMusicShell` initializes and passes account-center state/actions into Sidebar.
- Sidebar renders:
  - account asset pills: `我喜欢`, `创建`, `收藏`, `最近`;
  - status line: failures, retryable count, migrated track count;
  - actions: login/relogin, migration status, copy diagnostics.
- CSS keeps the block compact inside the sidebar footer.

### Risks

- Asset category counts are derived from available playlist/report metadata; exact classification depends on imported playlist external types and names.
- Manual UI verification is required for sidebar density and text overflow at different window heights.
- Diagnostics copy still depends on clipboard permission/runtime behavior.

### Manual Test Requested

Ask the user to inspect the lower-left account area: avatar/nickname/status should remain visible, asset pills should render, failure/retryable/migrated counts should not overflow, `登录/重新登录` opens NetEase login, `迁移状态` opens the dashboard, and `复制诊断` copies or shows the existing manual-copy fallback.

## Stage 21: Matched Local Playback Resolution

### Target

Let trusted NetEase local matches improve playback reliability without changing immersive playback visuals or silently using low-confidence matches.

Covered behavior:

- NetEase-origin tracks with manual correction can play from the matched local file.
- NetEase-origin tracks with high-confidence metadata match can play from the matched local file.
- `cloud-only`, `missing`, `conflict`, low-confidence, or cloud-path matches continue using the original NetEase/cloud path.
- Resolver failures fall back to the original cloud track.
- Playback page visual quality and playback core are not changed.

### Changed Files

- `scripts/verify-netease-matched-local-playback.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `node scripts/verify-netease-matched-local-playback.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-matched-local-playback.js`: RED first with `Adapter must define a high-confidence threshold for matched local playback`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- GitNexus impact before edits:
  - `UINextMusicBoxAdapter.playTrack`: LOW.
  - `UINextMusicBoxAdapter.playTracks`: LOW.
  - `UINextMusicBoxAdapter.resolveOriginalTrack`: LOW.
  - `NetEaseLocalMatchService`: not found in current index, treated as index coverage gap.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 133`, `affected_count 43`, `changed_files 36`. This is accumulated Stage 8-21 risk, not isolated Stage 21 risk.
- Dev restart with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`: Electron main window title `Auralux`, `Responding=True`; logs showed library cache loaded 890 tracks, audio engine initialized, NetEase API started at `http://127.0.0.1:3000`, and redacted NetEase QR/account requests.

### Implementation Notes

- Added `MATCHED_LOCAL_PLAYBACK_CONFIDENCE = 0.92`.
- Added `resolvePlaybackTrack()` so playback resolution is separate from display/original track resolution.
- Added `resolveTrustedLocalPlaybackMatch()`:
  - accepts manual corrections via `match.corrected === true`;
  - accepts metadata matches only when confidence is at least `0.92`;
  - rejects non-`matched` statuses;
  - rejects `netease://` or NetEase-source matched tracks.
- Added `safeResolvedTrack()` so any resolver error falls back to the original track.
- `playTrack()` and `playTracks()` now use `resolvePlaybackTrack()`.
- Matched-local playback tracks carry `matchedLocalPlayback` and the cache/status label can show `匹配本地播放`.

### Risks

- Manual UI verification is still required with a real NetEase imported track and a real matched local file.
- Existing queue entries may still contain original cloud tracks unless replayed through the UI-NEXT track action.
- This does not change next/previous behavior deep inside the playback engine for already-existing queues outside this adapter path.

### Manual Test Requested

Ask the user to open a NetEase-imported playlist, choose a track that has a manual correction or high-confidence match, play it, and confirm playback works. Then test a conflict/low-confidence/cloud-only item and confirm it still falls back to cloud playback instead of playing the wrong local file.

## Stage 20.1: Startup Splash Exit Hotfix

### Trigger

After a dev restart, the Auralux window stayed on the startup splash even though all visible warmup tasks had reached done/degraded terminal states.

### Root Cause Direction

Main process was alive and responsive. Runtime logs showed the window displayed, library cache loaded 890 tracks, audio engine initialized, and NetEase API started at `http://127.0.0.1:3000`. The issue was isolated to the renderer UI-NEXT startup transition: the splash could remain visible if the shell/warmup handoff did not finish cleanly.

### Changed Files

- `scripts/verify-startup-splash-exit.js`
- `src/renderer/src/ui-next/bootstrap.ts`

### Implementation Notes

- Added bounded `NewMusicShell` readiness wait.
- Added bounded startup exit coordination using `MAX_STARTUP_WAIT_MS` plus a short grace period.
- Startup splash is now removed before failing with diagnostics if `NewMusicShell` is unavailable.
- Startup root is cleared before constructing `NewMusicShell`, so the splash cannot remain as stale first-screen DOM.
- Failure path surfaces `MusicBox 新 UI 启动失败` with diagnostic globals instead of leaving the full progress splash indefinitely.

### Verification Commands

- `node scripts/verify-startup-splash-exit.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-startup-splash-exit.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- Dev restart with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`: Electron main window title `Auralux`, `Responding=True`; logs showed library cache loaded 890 tracks, NetEase API started at `http://127.0.0.1:3000`, and redacted NetEase QR/account requests.
- Computer Use screenshot verification could not run because the plugin reported an internal `@oai/sky` package export error. Do not claim pixel-level verification for this hotfix.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 134`, `affected_count 38`, `changed_files 36`. This is accumulated Stage 8-20.1 risk, not isolated hotfix risk.

### Manual Test Requested

Ask the user to confirm the restarted app now leaves the startup splash and reaches UI-NEXT. If it still fails, ask whether it shows `MusicBox 新 UI 启动失败` and capture the diagnostic text.

## Stage 20: NetEase Local Match Manual Correction

### Target

Turn the UI-NEXT NetEase local-match correction button from a placeholder toast into a real manual correction flow without changing playback priority or immersive playback quality.

Covered behavior:

- Click `纠正本地匹配` on a NetEase-origin track.
- Open a single local music-file picker.
- Only accept files that already exist in the local library.
- Persist the manual correction through `NetEaseLocalMatchService.saveCorrection()`.
- Refresh visible UI-NEXT track surfaces so the local match label updates immediately.
- Show clear success/failure messages.
- Do not change playback core or automatically switch cloud playback to local playback.

### Changed Files

- `scripts/verify-netease-local-match-correction.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `node scripts/verify-netease-local-match-correction.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-local-match-correction.js`: RED first with `Adapter correction entry must be asynchronous`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- GitNexus `query`: relevant context is UI-NEXT adapter source/match flow and existing dialog IPC; no dedicated manual-correction flow existed.
- GitNexus `context(UINextMusicBoxAdapter)`: direct import/call from `mountUINext`, no indexed process participation for the class itself.
- GitNexus `context(DialogController.showOpenDialog)` and `context(FileGateway)`: existing dialog path is available and was reused.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 132`, `affected_count 38`, `changed_files 36`. This is cumulative Stage 8-20 dirty state, not isolated Stage 20 risk.
- Dev app restart after Stage 20: PASS. With `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`, log showed window display in 1108ms, library cache loaded 890 tracks, NetEase API started at `http://127.0.0.1:3000`, redacted NetEase `[OK]` account/QR requests appeared, and `Get-Process electron` showed responding main window title `Auralux`.

### Implementation Notes

- `onCorrectLocalMatch()` is now async.
- It opens `window.electronAPI.dialog.showOpenDialog()` with `properties: ['openFile']`.
- Picker filters local music files: `mp3`, `flac`, `wav`, `m4a`, `aac`, `ogg`.
- `findLocalTrackByPath()` rejects `netease://` and NetEase-origin tracks.
- If the chosen file is not already in the local library, the user sees `请先把这个本地文件加入曲库，再纠正匹配`.
- On success, `netEaseLocalMatchService.saveCorrection()` persists the mapping and `refreshCurrentTrackSurfaces()` refreshes visible UI state.

### Risks

- Manual UI verification is still required because the native file picker cannot be fully exercised by the focused source guard.
- This stage records manual correction only; it does not yet make playback prefer the matched local file.
- The user must import the chosen local file into the library first, which is intentional to avoid storing arbitrary paths outside the current library model.
- Current worktree remains very dirty, so GitNexus final risk is cumulative.

### Manual Test Requested

Ask the user to open a NetEase-imported playlist, click a track row's `纠正本地匹配` action, choose a local music file already in the library, and confirm the row changes to a matched/local label. Also test choosing a file not in the library and confirm the app asks to import it first.

## Stage 19: NetEase Migration/Login Diagnostics Panel

### Target

Add a copyable, redacted diagnostics block to the UI-NEXT migration dashboard so real login/import/sync failures can be inspected without exposing sensitive account data.

Covered behavior:

- Show diagnostics inside the existing migration dashboard, not as a blocking modal.
- Include NetEase API status, login status, failed migration report count, retryable sync count, and generated time.
- Provide `复制诊断信息` using the clipboard API when available.
- Make the copied text explicitly state that it is redacted.
- Do not include cookies, QR keys, tokens, or sensitive account data.
- Do not change login, sync, import, playback, or migration core behavior.

### Changed Files

- `scripts/verify-netease-diagnostics-panel.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-netease-diagnostics-panel.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-diagnostics-panel.js`: RED first with `Adapter must expose a migration diagnostics state shape`, then PASS after implementation.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS.
- Fresh closeout rerun after documentation updates: diagnostics guard PASS, syntax check PASS, renderer typecheck PASS, main TS build PASS, renderer build PASS, renderer lint PASS.
- GitNexus `context(UINextMusicBoxAdapter)`: direct import/call from `mountUINext`, no indexed process participation.
- GitNexus `context(NewMusicShell)`: no indexed process participation.
- GitNexus `query` did not find an existing diagnostics/migration dashboard execution flow.
- GitNexus MCP did not expose an `impact` tool earlier in this stage; final coverage used `context`, `query`, focused guard, typecheck, build, lint, and `detect_changes`.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 132`, `affected_count 38`, `changed_files 36`. This is cumulative Stage 8-19 dirty state, not isolated Stage 19 risk.
- Dev app restart after Stage 19: PASS. With `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`, log showed window display in 1475ms, library cache loaded 890 tracks, NetEase API started at `http://127.0.0.1:3000`, redacted NetEase `[OK]` account/QR requests appeared, and `Get-Process electron` showed responding main window title `Auralux`.

### Implementation Notes

- Added `UINextMigrationDiagnosticsState`.
- `UINextMigrationDashboardState` now includes `diagnostics`.
- Adapter method `buildMigrationDiagnosticsState()` builds a redacted snapshot from migration reports, sync states, NetEase API status, and login status.
- Adapter method `copyMigrationDiagnostics()` copies the diagnostic text through `navigator.clipboard.writeText()` when available and falls back to a visible manual-copy message.
- `NewMusicShell.onCopyMigrationDiagnostics()` delegates to the adapter.
- `NewMusicShell._renderMigrationDiagnostics()` renders `诊断信息`, status tiles, redaction notice, purpose copy, and the copyable text.
- Scoped CSS was added under `.mb-migration-diagnostics*`.

### Risks

- Manual UI verification is still required for actual layout, clipboard permission behavior, and long diagnostic text wrapping.
- This stage intentionally does not fix QR login or NetEase API behavior; it makes failures easier to inspect.
- Current worktree remains very dirty, so GitNexus final risk is cumulative.

### Manual Test Requested

Ask the user to open the migration dashboard and verify: `诊断信息` renders, `复制诊断信息` copies text, pasted text includes API/login/report/sync information, the text says `已脱敏`, no Cookie/token/QR key appears, and the diagnostics block has no visible overflow.

## Stage 18: First-run NetEase Migration Onboarding

### Target

Add a lightweight UI-NEXT first-run migration onboarding surface so a NetEase loyal user sees a clear path into migration without being forced through a blocking wizard.

Covered behavior:

- Persist first-run migration onboarding state in local storage with `auralux.onboarding.migration`.
- Show the onboarding only while incomplete.
- Allow skip/dismiss so local playback is never blocked.
- Provide actions for NetEase login, local music import, and migration dashboard.
- Explain asset migration scope: `我喜欢`, created/favorite playlists, and `最近播放`.
- Explain local-library protection: `不会静默覆盖本地曲库`.
- Provide a settings entry to reopen/reset the onboarding.

### Changed Files

- `scripts/verify-netease-first-run-onboarding.js`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-netease-first-run-onboarding.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-first-run-onboarding.js`: RED first with `First-run migration onboarding must persist local completion state`, then PASS after implementation.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `context(NewMusicShell)`: no execution-flow participation in the current index; direct references are local to UI-NEXT shell/static output.
- GitNexus MCP did not expose an `impact` tool in this session, so pre-edit coverage used `query`, `context`, and final `detect_changes`.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 124`, `affected_count 35`, `changed_files 36`. This remains cumulative dirty-worktree risk from Stage 8-18, not isolated Stage 18 risk.

### Implementation Notes

- UI-NEXT shell state now includes `migrationOnboarding`.
- Added `loadMigrationOnboardingState()` and `saveMigrationOnboardingState()`.
- Added onboarding actions:
  - `dismissMigrationOnboarding()`
  - `resetMigrationOnboarding()`
  - `startMigrationOnboardingLogin()`
  - `startMigrationOnboardingLocalImport()`
  - `openMigrationOnboardingDashboard()`
- Home view renders `_renderMigrationOnboarding()` above the normal home content while onboarding is incomplete.
- Settings action grid now includes `重新打开迁移向导`.
- Onboarding uses existing adapter paths: `openNetEaseLogin`, `addMusicFiles`, and `openMigrationDashboard`.

### Risks

- Manual UI verification is still required for actual layout density and first-run copy.
- This stage does not implement a full migration wizard or new migration backend logic; it exposes the existing Stage 10-17 migration/sync/dashboard foundation.
- If a user has already skipped the onboarding, it will stay hidden until reset from settings.

### Manual Test Requested

Ask the user to verify: first launch/home shows the migration onboarding, `暂时跳过` hides it and persists after restart, Settings can reopen it, `登录网易云` opens the NetEase login modal, `先导入本地音乐` opens local file import, and `查看迁移状态` opens the migration dashboard.

## Stage 17: Migration Dashboard

### Target

Add a durable UI-NEXT NetEase migration dashboard so users can inspect migration and sync results after dialogs close. The stage makes migration trustworthy by exposing summary counts, recent reports, failure reasons, sync state, conflict state, and retry entries.

### Changed Files

- `scripts/verify-netease-migration-dashboard.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `query({repo: "MusicBox", query: "UI-NEXT navigation sidebar render settings view NetEase migration report sync state dashboard"})`
- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "UINextShellState", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Interface", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseMigrationReportService", file_path: "src/renderer/src/features/netease/service/NetEaseMigrationReportService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseSyncStateService", file_path: "src/renderer/src/features/netease/service/NetEaseSyncStateService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-migration-dashboard.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`
- Restart dev app with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`.

### Verification Results

- `node scripts/verify-netease-migration-dashboard.js`: RED first with `UI-NEXT adapter must read migration reports`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus impact: `UINextMusicBoxAdapter` LOW, `UINextShellState` LOW. New NetEase report/sync services are not found in the current GitNexus index, so focused guard plus typecheck/build/lint cover them.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL, `changed_count 129`, `affected_count 35`, `changed_files 36`. This is cumulative dirty-worktree risk across Stage 8-17, not isolated Stage 17 risk.
- Dev app restart: PASS. With `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`, log recorded `???????`, library cache loaded 890 tracks, NetEase API started at `http://127.0.0.1:3000`, and `Get-Process electron` showed responding main window title `Auralux`.

### Implementation Notes

- UI-NEXT sidebar now exposes `????`.
- New UI-NEXT view key: `migration-dashboard`.
- Adapter builds `migrationDashboard` state from `netEaseMigrationReportService.getRecentReports()` and `netEaseSyncStateService.getAllPlaylistSyncStates()`.
- Dashboard summary includes report status counts, cumulative added/existing/skipped/failed/duplicate counts, and last activity time.
- Sync section lists per-playlist sync states, failure/conflict reasons, and retry buttons for retryable states.
- Recent reports show playlist name, import/sync kind, status, timestamp, counts, and expandable failure reasons.
- Retry reuses `netEaseSyncStateService.retryPlaylistSync()`; it does not invent a second sync path.

### Risks

- Manual UI verification is still required for actual layout, because automated checks prove wiring/build but do not inspect pixels.
- If there are no migration reports yet, the page should show empty states; real report rendering needs a previous import/sync report.
- GitNexus index does not yet cover newly added Stage 10/12 services, so future reanalysis would improve symbol impact accuracy.

### Manual Test Requested

Ask the user to click `????` in the sidebar and verify: empty state or report data renders, no text overflow, failed reports expand, retry button appears for failed/conflict sync states, and normal playback/immersive page feel is unchanged.

## Stage 12: Trusted Sync and Conflict Protection

### Target

Add a trusted NetEase playlist sync layer with per-playlist sync state, last successful sync time, failure reason, retry entry, conflict state, and local-library protection before cloud overwrite.

### Changed Files

- `scripts/verify-netease-trusted-sync.js`
- `src/renderer/src/features/netease/service/NetEaseSyncStateService.ts`
- `src/renderer/src/features/netease/service/index.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Commands

- `query({repo: "MusicBox", query: "NetEase playlist sync state conflict retry local playlist protection syncPlaylist refreshPlaylist"})`
- `context({repo: "MusicBox", name: "refreshPlaylist", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "doImportPlaylist", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method"})`
- `impact({repo: "MusicBox", target: "NetEasePlaylistSyncService", file_path: "src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "syncPlaylist", file_path: "src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "refreshPlaylist", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "doImportPlaylist", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseCloudMusic", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-trusted-sync.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-trusted-sync.js`: first failed with `Missing src/renderer/src/features/netease/service/NetEaseSyncStateService.ts`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: first failed because conflict-handling code was accidentally inserted into `createPlaylist`; root cause was an overly broad patch anchor around `if (!result.success)`. The misplaced block was removed and inserted into `refreshPlaylist`; rerun PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 218 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `high` risk, `changed_count 69`, `affected_count 14`, `changed_files 23`.

### GitNexus Risk Notes

- `NetEasePlaylistSyncService`: LOW, with 3 direct upstream dependents.
- `syncPlaylist`: CRITICAL, with direct callers in UI-NEXT `refreshPlaylist`, old `NetEaseCloudMusic.doImportPlaylist`, and old `PlaylistDetailPage.syncNetEasePlaylist`. This stage did not change its signature or implementation.
- `refreshPlaylist`: LOW upstream risk.
- `doImportPlaylist`: LOW upstream risk.
- `NetEaseCloudMusic`: HIGH because UI-NEXT and old component registration still reuse it. The change was kept to the existing sync branch only.

### Implementation Notes

- Added `NetEaseSyncStateService` backed by `cacheManager` local cache.
- Sync state now records `status`, `lastAttemptAt`, `lastSuccessfulSyncAt`, `failureReason`, `retryable`, and conflict details per playlist.
- `syncPlaylistWithState()` wraps the existing `netEasePlaylistSyncService.syncPlaylist()` without changing its signature.
- `detectLocalProtectionConflict()` compares local playlist tracks with the remote NetEase playlist before sync.
- If local-only tracks or cloud-removed NetEase tracks are detected, state becomes `conflict` and retryable before the real sync is allowed.
- UI-NEXT `refreshPlaylist()` shows a conflict confirmation before continuing.
- Existing `syncPlaylist()` behavior still protects local data by not deleting local tracks; Stage 12 adds explicit state and user confirmation instead of silent behavior.
- The reused NetEase import modal now records `failureReason` from sync state and retries conflict sync through the state service.

### Risks

- Conflict detection calls NetEase availability, remote playlist detail, and local playlist detail before sync; API slowness can make the first sync attempt feel slower.
- Old `PlaylistDetailPage.syncNetEasePlaylist` still calls the raw `syncPlaylist()` path because it belongs to old UI cleanup territory. UI-NEXT and the reused NetEase modal are covered.
- Manual verification is required for the visible confirmation and retry behavior.

### Next Step

Restart the dev app and ask the user to manually test a NetEase playlist refresh with a local-only track added to the playlist. After confirmation, continue to Stage 13 search experience upgrade.

## Stage 13: Search Experience Upgrade

### Target

Upgrade UI-NEXT search with persisted search history, autocomplete suggestions, result filters for songs/artists/albums/playlists, clearer local/NetEase source identity, and direct play/favorite/add-to-playlist actions from search result surfaces.

### Changed Files

- `scripts/verify-netease-search-experience.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/TopSearch.js`
- `src/renderer/ui-next-static/components/SearchResultsView.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `query({repo: "MusicBox", query: "UI-NEXT unified search TopSearch SearchResultsView search history autocomplete filter source badges play favorite add to playlist"})`
- `context({repo: "MusicBox", name: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class"})`
- `context({repo: "MusicBox", name: "search", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "UnifiedSearchService", file_path: "src/renderer/src/features/library/service/UnifiedSearchService.ts", kind: "Class"})`
- `context({repo: "MusicBox", name: "search", file_path: "src/renderer/src/features/library/service/UnifiedSearchService.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "NetEaseSearchService", file_path: "src/renderer/src/features/netease/service/NetEaseSearchService.ts", kind: "Class"})`
- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "search", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "UnifiedSearchService", file_path: "src/renderer/src/features/library/service/UnifiedSearchService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "search", file_path: "src/renderer/src/features/library/service/UnifiedSearchService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseSearchService", file_path: "src/renderer/src/features/netease/service/NetEaseSearchService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NewMusicShell", file_path: "src/renderer/ui-next-static/NewMusicShell.js", kind: "Function", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "TopSearch", file_path: "src/renderer/ui-next-static/components/TopSearch.js", kind: "Function", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "SearchResultsView", file_path: "src/renderer/ui-next-static/components/SearchResultsView.js", kind: "Function", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "UINextShellState", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Interface", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-search-experience.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-search-experience.js`: first failed with `Shell state must keep search history`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 218 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical` risk, `changed_count 86`, `affected_count 26`, `changed_files 25`.

### GitNexus Risk Notes

- `UINextMusicBoxAdapter`: LOW, 2 direct upstream dependents, no affected execution flows.
- `UINextMusicBoxAdapter.search`: LOW, no direct upstream dependents.
- `UnifiedSearchService`: LOW, 2 direct upstream dependents.
- `UnifiedSearchService.search`: LOW, direct dependents in old Search widget and UI-NEXT.
- `NetEaseSearchService`: LOW, 3 direct imports.
- `NewMusicShell`, `TopSearch`, `SearchResultsView`, and `UINextShellState`: LOW.
- Final `detect_changes` is CRITICAL because the worktree already contains accumulated Stage 8-13 and earlier dirty changes. The Stage 13 pre-edit symbol impacts were LOW.

### Implementation Notes

- Added a focused Stage 13 guard script.
- Search history is stored in `localStorage` under `auralux.search.history`.
- UI-NEXT shell state now tracks search filter, filter definitions, history, suggestions, and entity result buckets.
- Top search panel now shows filter chips, history, suggestions, local/NetEase grouped song results, entity groups, source badges, add-to-playlist, favorite, and direct play.
- Full search results now apply song/artist/album/playlist filters and show entity result groups while preserving `TrackRow` actions.
- The shared `UnifiedSearchService.search()` and `NetEaseSearchService.search()` signatures were not changed to avoid old UI/search regressions.

### Risks

- Artist and album search entities are derived from returned tracks rather than separate NetEase artist/album API calls; this keeps the stage narrow but is not a full NetEase entity search yet.
- Playlist entity search uses current UI-NEXT playlist data, not remote playlist cloud search.
- Manual UI verification is required for dropdown focus behavior, keyboard selection, and the new action buttons.

### Next Step

Restart the dev app and ask the user to manually test top search: type a keyword, use filter chips, pick a suggestion/history item, play a result, favorite a result, add a result to a playlist, and open the full search view. After confirmation, continue to Stage 14 daily primary-player playback feel.

## Stage 14: Daily Primary-Player Playback Feel

### Target

Improve daily playback reliability without adding lyric translation or side-by-side lyric comparison, and without reducing the immersive playback page visual quality.

Covered behavior:

- Continue playback and queue memory across restarts.
- One-click favorite/unfavorite surfaces remain available from player UI.
- Current song source and cache hit labels are visible in the player bar.
- Lyrics expose loading, empty/error, and retry/rematch states.
- Renderer build handles multi-HTML output safely under the current Vite/Rolldown toolchain.

### Changed Files

- `scripts/verify-playback-state-restore.js`
- `scripts/verify-playback-queue-persistence.js`
- `scripts/verify-playback-lyrics-reliability.js`
- `scripts/verify-renderer-vite-html-output.js`
- `src/renderer/src/features/playback/service/PlaybackPersistence.ts`
- `src/renderer/src/features/playback/ui-bindings/PlaybackAppController.ts`
- `src/renderer/src/api/MusicBoxAPI.ts`
- `src/renderer/src/features/mediaAssets/service/LyricsContentService.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/PlayerBar.js`
- `src/renderer/ui-next-static/components/ImmersivePlayerView.js`
- `src/renderer/ui-next-static/styles.css`
- `src/renderer/vite.config.js`

### Verification Commands

- `impact({repo: "MusicBox", target: "PlaybackPersistence", file_path: "src/renderer/src/features/playback/service/PlaybackPersistence.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "createPlaybackState", file_path: "src/renderer/src/features/playback/service/PlaybackPersistence.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "saveCurrentPlaybackState", file_path: "src/renderer/src/features/playback/service/PlaybackPersistence.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "PlaybackAppController", file_path: "src/renderer/src/features/playback/ui-bindings/PlaybackAppController.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "restorePlaybackState", file_path: "src/renderer/src/features/playback/ui-bindings/PlaybackAppController.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "LyricsContentService", file_path: "src/renderer/src/features/mediaAssets/service/LyricsContentService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "loadTrackLyrics", file_path: "src/renderer/src/features/mediaAssets/service/LyricsContentService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "setPlaylist", file_path: "src/renderer/src/api/MusicBoxAPI.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "nextTrack", file_path: "src/renderer/src/api/MusicBoxAPI.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "previousTrack", file_path: "src/renderer/src/api/MusicBoxAPI.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-playback-state-restore.js`
- `node scripts/verify-playback-queue-persistence.js`
- `node scripts/verify-playback-lyrics-reliability.js`
- `node scripts/verify-renderer-vite-html-output.js`
- `node scripts/verify-dev-gpu-fallback.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-playback-state-restore.js`: PASS, output `Playback state restore guard passed.`
- `node scripts/verify-playback-queue-persistence.js`: PASS, output `Playback queue persistence guard passed.`
- `node scripts/verify-playback-lyrics-reliability.js`: PASS, output `Playback lyrics reliability guard passed.`
- `node scripts/verify-renderer-vite-html-output.js`: first failed with `renderer src root must be absolute`, then PASS after `src/renderer/vite.config.js` was fixed.
- `node scripts/verify-dev-gpu-fallback.js`: first failed with `dev GPU fallback env var is missing`, then PASS after adding the explicit development GPU fallback.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS, rerun after the development GPU fallback.
- `npm.cmd run build:renderer`: first failed because Vite/Rolldown emitted `DesktopLyrics.html` with a relative traversal path; after using absolute renderer root/outDir and a safe `desktopLyrics` input key, rerun PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical` risk, `changed_count 112`, `affected_count 36`, `changed_files 32`.
- Dev app launch check: default launch reached startup initialization but crashed on this machine with Electron `GPU process isn't usable`; with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`, the app logged `应用窗口已显示` and `音乐库缓存加载完成`. NetEase API attempted startup but returned `connect EACCES 61.184.11.100:443`, so cloud status is network-restricted/degraded in this environment.

### GitNexus Risk Notes

- `PlaybackPersistence`: HIGH.
- `PlaybackPersistence.createPlaybackState`: HIGH.
- `PlaybackPersistence.saveCurrentPlaybackState`: HIGH.
- `PlaybackAppController`: HIGH.
- `PlaybackAppController.restorePlaybackState`: LOW.
- `UINextMusicBoxAdapter`: LOW.
- `LyricsContentService`: LOW as a class.
- `LyricsContentService.loadTrackLyrics`: HIGH, with direct upstream dependents in service/player/API surfaces.
- `MusicBoxAPI.setPlaylist`, `MusicBoxAPI.nextTrack`, and `MusicBoxAPI.previousTrack`: LOW.
- `NewMusicShell` and `PlayerBar`: LOW.
- `ImmersivePlayerView` and private UI-NEXT lyrics helpers were not found as indexed GitNexus symbols; focused guards plus renderer build/lint cover the static UI changes.
- `src/renderer/vite.config.js` is not indexed as an application symbol in GitNexus, so the Vite fix is recorded as config-only impact; the focused guard and renderer build prove the root-cause fix.
- `Application`: LOW impact before the development GPU fallback, with 1 direct upstream dependent and no affected indexed processes.
- Final `detect_changes` is CRITICAL because the worktree contains accumulated Stage 8-14 and earlier dirty changes. Stage 14 pre-edit symbol impacts were scoped and the new Vite config fix does not add application runtime call graph risk.

### Implementation Notes

- Added stable playback state and queue cache keys.
- Added queue memory persistence after playlist changes and next/previous track changes.
- Added queue-memory fallback restore when no normal playback state exists.
- Added forced lyrics reload support for retry/rematch.
- UI-NEXT state now carries lyrics loading/error status.
- Player bar shows current source/cache status labels.
- Immersive lyrics empty/error state now exposes a retry action.
- Vite config now uses an absolute renderer root/outDir and a safe lowercase `desktopLyrics` HTML input key so renderer builds do not emit invalid relative HTML asset names.
- Added `AURALUX_DISABLE_HARDWARE_ACCELERATION=1` as an explicit development-only escape hatch for Electron/GPU-host failures in the current test environment. It appends Chromium GPU-disable switches before `app.disableHardwareAcceleration()`.

### Risks

- Manual runtime verification is still required for queue restore, player bar label overflow, favorite toggles, lyrics retry behavior, and unchanged immersive visual feel.
- The queue-memory fallback currently covers the no-playback-state path; a corrupted playback-state-with-empty-track path may still need a later dedicated guard.
- The final GitNexus risk remains cumulative because the worktree is intentionally dirty.
- The current environment cannot reach the NetEase upstream over the network (`EACCES` to port 443), so cloud login/sync UI must be manually tested in a normal network environment.

### Next Step

Restart the dev app, confirm the window displays and NetEase API status is available or degraded clearly, then continue to Stage 15 offline ability and local matching.

## Stage 15: Offline Ability and Local Matching

### Target

Expose offline confidence for imported NetEase tracks without changing the playback page visual quality:

- Cached song/offline playable state.
- Cover cache status.
- Lyrics cache status.
- Offline-playable filter.
- NetEase imported track local matching state.
- Match confidence and a manual correction entry point.

### Changed Files

- `scripts/verify-netease-local-matching.js`
- `scripts/verify-offline-status.js`
- `src/renderer/src/features/netease/service/NetEaseLocalMatchService.ts`
- `src/renderer/src/features/netease/service/index.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/PlaylistView.js`
- `src/renderer/ui-next-static/components/TrackRow.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "toUINextTrack", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "openPlaylist", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-local-matching.js`
- `node scripts/verify-offline-status.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-local-matching.js`: first failed during RED with missing local matching service, then PASS after implementation. Fresh rerun PASS, output `NetEase local matching guard passed.`
- `node scripts/verify-offline-status.js`: first failed during RED with missing UI offline fields/filter, then PASS after implementation. Fresh rerun PASS, output `Offline status guard passed.`
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical` risk, `changed_count 126`, `affected_count 32`, `changed_files 35`.
- Dev app restart check: `AURALUX_DISABLE_HARDWARE_ACCELERATION=1 npm.cmd run dev:main` left active Electron processes running; `Get-Process electron` showed a responding main window titled `Auralux`. Existing `dev-run.log` also contained redacted NetEase API `[OK]` requests.

### GitNexus Risk Notes

- `UINextMusicBoxAdapter`: LOW.
- `toUINextTrack`: HIGH, with 7 direct callers and affected UI-NEXT flows including `refreshPlaylist`, constructor-driven library loading, and `playTrack`.
- `openPlaylist`: LOW.
- `filterLibraryVisibleTracks`: target not found in the current index when checked.
- Final `detect_changes` is CRITICAL because the worktree contains accumulated Stage 8-15 and earlier dirty changes. The Stage 15 symbol impacts were reviewed before editing.

### Implementation Notes

- Added `NetEaseLocalMatchService` with `matched`, `cloud-only`, `missing`, and `conflict` states.
- Matching uses normalized title, artist, album, and duration signals with confidence scoring.
- Manual correction data is stored in `localStorage` under `netease-local-match-corrections`.
- UI-NEXT tracks now carry offline playable state, cover cache state, lyrics cache state, local match status, confidence, and match label.
- Playlist view now includes an `offlineFilter` state and a visible offline-playable filter button.
- Track rows render compact status chips and a local-match correction action for NetEase-origin tracks.

### Risks

- The manual correction entry currently shows a placeholder toast instead of a full file-picker correction workflow.
- Stage 15 only exposes match/offline state; it does not yet change playback resolution to prefer a matched local file.
- Track row status chips add density, so manual visual verification is required for overflow and readability.
- NetEase cloud behavior still depends on a usable network; the current environment previously returned `connect EACCES 61.184.11.100:443`.

### Next Step

Restart the dev app, confirm UI-NEXT opens, and ask the user to manually inspect a NetEase playlist with the offline filter, status chips, and local-match correction entry. After that, continue to Stage 16 startup warmup and cache system expansion.

## Stage 16: Startup Warmup and Cache System Expansion

### Target

Improve startup and repeated playlist entry performance without lowering the immersive playback page visual quality:

- Use startup time to preload stable playlist cover metadata.
- Avoid repeated cover refetches for normal playlist entry.
- Add cover cache freshness and stale-while-revalidate rules.
- Keep cover request in-flight de-duplication and concurrency limits.
- Add a lyrics cache index and startup warmup path.
- Keep the main UI opening even if cache/network warmup degrades.

### Changed Files

- `scripts/verify-cache-system-expansion.js`
- `src/renderer/src/shared/cache/CacheManager.ts`
- `src/renderer/src/ui-next/playlistCoverManifest.ts`
- `src/renderer/src/ui-next/startupWarmup.ts`
- `E:\Obsidian\01 Projects 项目\Project - MusicBox.md`

### Verification Commands

- `context({repo: "MusicBox", name: "loadLibrarySnapshot", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "openPlaylist", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "CacheManager", file_path: "src/renderer/src/shared/cache/CacheManager.ts", kind: "Class"})`
- `context({repo: "MusicBox", name: "runStartupWarmup", file_path: "src/renderer/src/ui-next/startupWarmup.ts", kind: "Function"})`
- `context({repo: "MusicBox", name: "getLyricsCache", file_path: "src/renderer/src/shared/cache/CacheManager.ts", kind: "Method"})`
- `context({repo: "MusicBox", name: "setLyricsCache", file_path: "src/renderer/src/shared/cache/CacheManager.ts", kind: "Method"})`
- `node scripts/verify-cache-system-expansion.js`
- `node scripts/verify-cover-cache-manifest.js`
- `node scripts/verify-startup-warmup.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-cache-system-expansion.js`: first failed with missing cover freshness/stale rules, cover metadata preload, lyrics cache index, and startup warmup integration; rerun PASS after implementation.
- `node scripts/verify-cover-cache-manifest.js`: PASS.
- `node scripts/verify-startup-warmup.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical` risk, `changed_count 126`, `affected_count 32`, `changed_files 36`.
- Dev app restart check: stopped the prior MusicBox/Electron dev processes, then launched `npm.cmd run dev:main` with `AURALUX_DISABLE_HARDWARE_ACCELERATION=1`. `dev-restart.out.log` recorded window display in about `1986ms`, library cache load with `890` tracks, NetEase API running at `http://127.0.0.1:3000`, and redacted `[OK]` NetEase requests. `Get-Process electron` showed a responding main window titled `Auralux`.

### GitNexus Risk Notes

- `loadLibrarySnapshot`: direct callers include constructor initialization, playlist refresh, favorite toggle, and explicit library refresh.
- `openPlaylist`: participates in `RefreshPlaylist` flows including library input, render, and source/external-id resolution.
- `PlaylistCoverManifest`, `runStartupWarmup`, `CacheManager`, `getLyricsCache`, and `setLyricsCache` were not found as symbols in the current GitNexus index, so impact is recorded as index coverage limitation. Focused scripts plus renderer typecheck/build/lint cover these changes.
- Final `detect_changes` remains CRITICAL because the worktree contains accumulated Stage 8-16 dirty changes.

### Implementation Notes

- Added cover cache freshness constants:
  - `COVER_FRESH_MS`
  - `COVER_STALE_WHILE_REVALIDATE_MS`
- Fresh cover manifest entries return immediately.
- Stale-but-usable cover entries return immediately and schedule a background refresh.
- Very old or failed cover entries use the existing retry/backoff path.
- Added `preloadStableCoverMetadata()` for startup-time cover manifest warming.
- Added lyrics cache index storage under `LYRICS_CACHE_INDEX_KEY`.
- Added `warmLyricsCacheIndex()` and raised the renderer memory cache capacity from 5 to 80 so startup warmup has useful effect.
- Startup warmup now includes:
  - `coverManifest` task for playlist cover metadata.
  - `lyricsCacheIndex` task for lyric cache index warming.
- No immersive playback page styling, layout, animation, or visual effect code was changed.

### Risks

- `startupWarmup.ts` and several existing files contain corrupted Chinese string literals from earlier work, so this stage avoided whole-file rewrites and used narrow patches.
- `warmLyricsCacheIndex()` only warms cache entries that were written after the index exists; older lyric cache entries remain readable through the old key path but are not indexed unless rewritten.
- Cover cache refresh still depends on browser Cache Storage and network behavior; manual repeated-playlist-entry checks are needed.

### Next Step

Restart the dev app and ask the user to manually test startup splash behavior, repeated playlist entry cover loading, and that the immersive playback page still feels unchanged.

## Baseline

- Date: 2026-06-18
- Branch: `dev`
- Rule files read: `AGENTS.md`, `CODEX_HANDOFF.md`
- Existing plan reviewed: `docs/superpowers/plans/2026-06-18-settings-ui-chinese-localization.md`
- Important note: the existing settings localization plan shows corrupted Chinese in terminal output, so it is not used as a source of exact copy.

## Current Dirty Worktree Snapshot

Known dirty files at baseline:

- `dev-run.err.log`
- `dev-run.log`
- `src/renderer/src/app/runtime/components/ComponentEventBinder.ts`
- `src/renderer/src/features/netease/service/NetEaseApiClient.ts`
- `src/renderer/src/features/netease/service/NetEaseAuthService.ts`
- `src/renderer/src/features/netease/types.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/ui-next-static/styles.css`
- `dev-restart.err.log`
- `dev-restart.out.log`
- `docs/superpowers/`
- `scripts/verify-netease-qr-login.js`

No reset, clean, checkout, or overwrite was performed.

## Stage 0: Documentation Baseline

### Target

Create a durable spec, implementation plan, and progress log before touching source code.

### Changed Files

- `docs/superpowers/specs/2026-06-18-auralux-next-stage-design.md`
- `docs/superpowers/plans/2026-06-18-auralux-next-stage-plan.md`
- `docs/progress/auralux-next-stage.md`

### Verification Commands

- Pending after file creation.

### Verification Results

- Pending.

### Risks

- Worktree already contains previous uncommitted changes. All future diffs must distinguish new stage changes from existing dirty state.

### Next Step

Verify documentation files exist, then begin Stage 1 with GitNexus impact analysis and a failing settings Chinese guard.

## Stage 1: Settings UI Chinese Localization and Readability

### Target

UI-NEXT 设置页用户可见英文改成中文；清理缓存等危险操作增加危险样式；长中文文案避免溢出。

### Changed Files

- `scripts/verify-settings-ui-chinese.js`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-settings-ui-chinese.js`
- `rg -n "Show track covers|Audio engine|Library folders|Lyrics and cache|Desktop display mode|Plugin manager|Check updates" src/renderer/ui-next-static src/renderer/src/features/settings/service`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-settings-ui-chinese.js`: PASS, output `Settings UI Chinese guard passed.`
- English settings copy search: no matches.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS, Vite build completed and copied 23 static items.
- GitNexus `detect_changes`: completed earlier with `medium` risk because the worktree already contained pre-existing NetEase/UI dirty changes; reported `changed_count 19`, `affected_count 3`, `changed_files 11`.

### Risks

- Worktree was already dirty before this stage, so GitNexus change detection is broader than Stage 1 alone.
- Still needs user manual verification after dev app restart.

### Next Step

Restart dev app and ask the user to manually check that Settings is Chinese, long labels do not overflow, the cache clear action looks dangerous, and no old UI action is visible.

## Stage 2: UI-NEXT Formalization

### Target

Make UI-NEXT the normal renderer startup path and remove user-facing legacy UI switch paths.

### Changed Files

- `scripts/verify-ui-next-formalized.js`
- `src/renderer/src/app/bootstrap/main.ts`
- `src/renderer/src/ui-next/bootstrap.ts`

### Verification Commands

- `node scripts/verify-ui-next-formalized.js`
- `rg -n "legacy-ui|legacyui|__disableMusicBoxUINext|返回旧界面|旧界面" src/renderer/src src/renderer/ui-next-static`
- `rg -n "shouldUseLegacyUI|loadLegacyApp|__enableMusicBoxUINext|shouldEnableUINext" src/renderer/src/app/bootstrap/main.ts src/renderer/src/ui-next/bootstrap.ts`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus impact before edits:
  - `bootstrap` in `src/renderer/src/app/bootstrap/main.ts`: LOW risk.
  - `shouldUseLegacyUI` in `src/renderer/src/app/bootstrap/main.ts`: LOW risk.
  - `loadLegacyApp` in `src/renderer/src/app/bootstrap/main.ts`: LOW risk.
  - `shouldEnableUINext` in `src/renderer/src/ui-next/bootstrap.ts`: LOW risk.
- `node scripts/verify-ui-next-formalized.js`: first run failed before edits by detecting legacy switches; after edits PASS.
- Legacy switch search: no matches.
- Bootstrap symbol search: only `shouldEnableUINext` remains as an always-on gate.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS, Vite build completed and copied 23 static items.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 20`, `affected_count 3`, `changed_files 13`. Affected processes are still NetEase availability flows from pre-existing dirty files: `Constructor -> CheckAvailability`, `RefreshPlaylist -> CheckAvailability`, `DoImportPlaylist -> CheckAvailability`.

### Risks

- Old UI source files still exist and must be classified in Stage 6 before deletion.
- Manual launch verification is still required after dev restart.

### Next Step

Run GitNexus `detect_changes`, restart dev app, and ask the user to confirm startup lands in UI-NEXT with no old UI switch.

## Stage 3: Dynamic Startup Page and Background Warmup

### Target

UI-NEXT now shows a startup splash while it warms settings, local library, playback queue, NetEase availability/profile, cover cache, and lyrics cache in parallel, then enters the shell after a minimum display window or timeout.

### Changed Files

- `scripts/verify-startup-warmup.js`
- `src/renderer/src/ui-next/bootstrap.ts`
- `src/renderer/src/ui-next/startupWarmup.ts`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `node scripts/verify-startup-warmup.js`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-startup-warmup.js`: first run failed before edits, then PASS after implementation.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS, Vite build completed and copied 23 static items.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 33`, `affected_count 3`, `changed_files 13`. The affected processes are still the same NetEase availability flows from pre-existing dirty files.

### Risks

- Startup warmup is currently bounded by the minimum display window and timeout, but manual runtime confirmation is still required to verify the splash appears and exits correctly.
- NetEase availability is intentionally degraded-only so local playback cannot be blocked.

### Next Step

Restart the dev app and ask the user to confirm the new startup splash appears before the shell and does not block the app when NetEase is slow or offline.

## Stage 4: Cover Cache Manifest and Fetch Deduplication

### Target

Add a UI-NEXT playlist cover manifest so playlist covers prefer local Cache Storage after first fetch, with in-flight request de-duplication, concurrency limiting, and retry backoff. Playback page visuals remain untouched.

### Changed Files

- `scripts/verify-cover-cache-manifest.js`
- `src/renderer/src/ui-next/playlistCoverTypes.ts`
- `src/renderer/src/ui-next/playlistCoverManifest.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `node scripts/verify-cover-cache-manifest.js`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `git diff -- src/renderer/src/features/mediaAssets/service/CoverLookupService.ts`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus impact before choosing the implementation path:
  - `CoverLookupService`: MEDIUM risk.
  - Shared methods `getCover`, `getLocalCover`, `getNetworkCover`, and `saveCoverToLocalCache`: CRITICAL risk, touching pages/widgets/dialogs/lyrics/player flows.
  - UI-NEXT methods `openPlaylist` and `refreshLibrarySnapshot`: LOW risk.
  - `loadLibrarySnapshot`: HIGH risk, so edits were kept narrow and no shared cover lookup behavior was changed.
- `node scripts/verify-cover-cache-manifest.js`: first run failed before implementation, then PASS.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS, Vite build completed and copied 23 static items.
- `git diff -- src/renderer/src/features/mediaAssets/service/CoverLookupService.ts`: no diff; shared playback/lyrics/old UI cover lookup service was not modified.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 34`, `affected_count 3`, `changed_files 13`. Affected processes remain the pre-existing NetEase availability flows.

### Risks

- This stage intentionally limits caching to UI-NEXT playlist covers. Track cover lookup remains on the existing shared `CoverLookupService` because GitNexus marked it CRITICAL.
- Runtime manual verification is still needed: open the same playlist twice and confirm logs show `playlist cover cache stored` on first fetch and `playlist cover cache hit` on subsequent load.

### Next Step

Restart the dev app for manual playlist cover cache verification, then continue to Stage 5 NetEase account center.

## Stage 5: NetEase Account Center

### Target

Show a stronger NetEase account center in the UI-NEXT sidebar with avatar, nickname, login state, last sync time, sync status, and a retry action, while keeping the existing avatar path and avoiding playback-page changes.

### Changed Files

 - `scripts/verify-netease-account-center.js`
 - `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
 - `src/renderer/ui-next-static/NewMusicShell.js`
 - `src/renderer/ui-next-static/components/Sidebar.js`
 - `src/renderer/ui-next-static/styles.css`

### Verification Commands

 - `node scripts/verify-netease-account-center.js`
 - `npm run typecheck:renderer`
 - `npm run build:ts`
 - `npm run build:renderer`
 - `cd src/renderer && npm run lint`
 - `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

 - `node scripts/verify-netease-account-center.js`: first run failed as intended before implementation, then PASS.
 - `npm run typecheck:renderer`: PASS.
 - `npm run build:ts`: PASS.
 - `npm run build:renderer`: PASS.
 - `cd src/renderer && npm run lint`: PASS.
 - GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 42`, `affected_count 3`, `changed_files 13`. The affected processes are still the pre-existing NetEase availability flows.

### Risks

 - `syncNetEaseStatus` still participates in the constructor-side NetEase availability flow, so future edits there should stay narrow.
 - Runtime manual verification is still required for logged-in, logged-out, and offline states after restarting the dev app.

### Next Step

Restart the dev app and ask the user to manually verify the sidebar shows the stronger NetEase account state without changing the playback page.

## Stage 6: Old UI Source Audit and Deletion Plan

### Target

Audit old UI source without deleting it, then classify files into immediate deletion candidates, UI-NEXT reuse, and plugin/API/compatibility dependencies.

### Changed Files

 - `docs/progress/auralux-next-stage.md`

### Verification Commands

 - `rg --files src/renderer/src/ui src/renderer/src/app`
 - `rg -n "legacy-ui|legacyui|MusicBoxApp|ComponentRegistry|ui/widgets|@ui/|ui/pages|ui/dialogs|ui/modals" src/renderer/src src/main -S`
 - `rg -n "AlbumsPage|ArtistsPage|StatisticsPage|HomePage|RecentPage|PlaylistDetailPage|Settings|NetworkDriveDetailPage" src/renderer/src -S`
 - `rg -n "AddToPlaylistDialog|CreatePlaylistDialog|NetworkDiskModal|PluginManagerModal|NetEaseCloudMusic" src/renderer/src src/renderer/ui-next-static -S`
 - `query({repo: "MusicBox", query: "old UI component registry MusicBoxApp plugin compatibility UI-NEXT reused dialogs modals NetEaseCloudMusic"})`
 - `npm run typecheck:renderer`
 - `npm run build:ts`
 - `npm run build:renderer`
 - `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

 - Old UI source inventory found:
   - `src/renderer/src/ui/pages`: 8 files.
   - `src/renderer/src/ui/widgets`: 38 files.
   - `src/renderer/src/ui/dialogs`: 6 files.
   - `src/renderer/src/ui/modals`: 3 files.
   - `src/renderer/src/app/runtime`: 25 files.
   - `src/renderer/src/app/composition`: 3 files.
   - `src/renderer/src/app/bootstrap`: 3 files.
 - UI-NEXT direct reuse confirmed in `src/renderer/src/ui-next/bootstrap.ts`:
   - `NetEaseCloudMusic`
   - `AddToPlaylistDialog`
   - `CreatePlaylistDialog`
   - `NetworkDiskModal`
   - `PluginManagerModal`
 - UI-NEXT adapter direct type/use references confirmed:
   - `NetEaseCloudMusic`
   - `CreatePlaylistDialog`
 - Plugin/API compatibility references confirmed:
   - `src/renderer/src/app/runtime/MusicBoxApp.ts`
   - `src/renderer/src/app/runtime/PluginBootstrap.ts`
   - `src/renderer/src/extensions/core/types.ts`
   - `src/renderer/src/extensions/core/index.ts`
 - `npm run typecheck:renderer`: PASS.
 - `npm run build:ts`: PASS.
 - `npm run build:renderer`: PASS.
 - GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 42`, `affected_count 3`, `changed_files 13`. Affected flows are unchanged NetEase availability flows.

### Deletion Classification

1. Can be deleted first after a dedicated deletion pass:
   - `src/renderer/src/ui/pages/ArtistsPage.ts`
   - `src/renderer/src/ui/pages/AlbumsPage.ts`
   - `src/renderer/src/ui/pages/StatisticsPage.ts`
   - Follow-up code cleanup needed before actual deletion:
     - remove type-only fields from `src/renderer/src/app/runtime/components/ComponentTypes.ts`
     - remove dead branches in `src/renderer/src/app/runtime/ui/ContentUIFacade.ts`
     - remove dead cases from `src/renderer/src/app/runtime/ViewRouter.ts`
     - remove dead binding cases from `src/renderer/src/app/runtime/components/bindings/PageComponentBindings.ts`
     - remove obsolete settings toggles `artistsPage` / `albumsPage` from settings types if no longer surfaced

2. New UI still reuses these; migrate before deleting:
   - `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
   - `src/renderer/src/ui/dialogs/AddToPlaylistDialog.ts`
   - `src/renderer/src/ui/dialogs/CreatePlaylistDialog.ts`
   - `src/renderer/src/ui/modals/NetworkDiskModal.ts`
   - `src/renderer/src/ui/modals/PluginManagerModal.ts`
   - Shared modal styling and DOM IDs in `src/renderer/src/index.html` that these components expect.

3. Still required by plugin/API/compatibility or old runtime shell; defer:
   - `src/renderer/src/app/runtime/**`
   - `src/renderer/src/app/composition/**`
   - `src/renderer/src/app/bootstrap/app.ts`
   - `src/renderer/src/app/bootstrap/createMusicBoxApp.ts`
   - `src/renderer/src/core/MusicBoxApp.ts`
   - `src/renderer/src/core/components/ComponentRegistry.ts`
   - `src/renderer/src/core/bootstrap/createMusicBoxApp.ts`
   - `src/renderer/src/ui/base/Component.ts`
   - Existing widgets/pages still referenced by `ComponentRegistry`, `ComponentTypes`, extension APIs, or shared controller facades.

### Risks

 - There is currently no safe "delete the entire old UI" move. UI-NEXT still borrows old NetEase/login/import/modal classes.
 - Removing app runtime compatibility too early would break extension/plugin APIs that still expose `MusicBoxApp`.
 - `ArtistsPage`, `AlbumsPage`, and `StatisticsPage` are no longer desired product features, but deleting their files alone would break typecheck until runtime type/binding references are removed.

### Next Step

Wait for user approval before deletion. If approved, start with a narrow "remove artists/albums/statistics old-page chain" stage with GitNexus impact first.

## Final Review

### Target

Run all guards and required builds, restart the dev app, ask the user for manual verification, and stop without committing.

### Verification Commands

 - `node scripts/verify-settings-ui-chinese.js`
 - `node scripts/verify-ui-next-formalized.js`
 - `node scripts/verify-startup-warmup.js`
 - `node scripts/verify-cover-cache-manifest.js`
 - `node scripts/verify-netease-account-center.js`
 - `npm run typecheck:renderer`
 - `npm run build:ts`
 - `npm run build:renderer`
 - `cd src/renderer && npm run lint`
 - `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

 - `node scripts/verify-settings-ui-chinese.js`: PASS.
 - `node scripts/verify-ui-next-formalized.js`: PASS.
 - `node scripts/verify-startup-warmup.js`: PASS.
 - `node scripts/verify-cover-cache-manifest.js`: PASS.
 - `node scripts/verify-netease-account-center.js`: PASS.
 - `npm run typecheck:renderer`: PASS.
 - `npm run build:ts`: PASS.
 - `npm run build:renderer`: PASS.
 - `cd src/renderer && npm run lint`: PASS.
 - GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 42`, `affected_count 3`, `changed_files 13`. Affected processes remain the same NetEase availability flows: `Constructor -> CheckAvailability`, `RefreshPlaylist -> CheckAvailability`, `DoImportPlaylist -> CheckAvailability`.

### Runtime State

 - Dev app process is running after restart.
 - No commit was created.
 - No reset, clean, checkout, or old UI deletion was performed.

### Manual Verification Needed

 - User should confirm the startup splash appears and enters UI-NEXT normally.
 - User should confirm Settings remains Chinese and destructive cache action is visually dangerous.
 - User should confirm the sidebar account center shows avatar, nickname, login state, last sync time, sync status, and retry button.
 - User should open the same playlist twice and confirm cover cache behavior feels cached instead of refetching all covers.

### Next Step

Wait for user confirmation. If the user approves old UI deletion, start a new narrow deletion pass for `ArtistsPage`, `AlbumsPage`, and `StatisticsPage` only, with GitNexus impact before edits.

## Stage 7: Remove Deprecated Artists, Albums, and Statistics Pages

### Target

Remove the deprecated old UI artists, albums, and statistics page chain after user approval, without deleting the full old UI runtime or the old dialogs/widgets still reused by UI-NEXT.

### Changed Files

- `src/renderer/src/app/runtime/ViewRouter.ts`
- `src/renderer/src/app/runtime/ui/ContentUIFacade.ts`
- `src/renderer/src/app/runtime/components/ComponentTypes.ts`
- `src/renderer/src/app/runtime/components/bindings/ComponentBindingTypes.ts`
- `src/renderer/src/app/runtime/components/bindings/PageComponentBindings.ts`
- `src/renderer/src/features/library/service/index.ts`
- Deleted `src/renderer/src/features/library/service/LibraryPageDataService.ts`
- Deleted `src/renderer/src/ui/pages/ArtistsPage.ts`
- Deleted `src/renderer/src/ui/pages/AlbumsPage.ts`
- Deleted `src/renderer/src/ui/pages/StatisticsPage.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "ArtistsPage", file_path: "src/renderer/src/ui/pages/ArtistsPage.ts", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "AlbumsPage", file_path: "src/renderer/src/ui/pages/AlbumsPage.ts", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "StatisticsPage", file_path: "src/renderer/src/ui/pages/StatisticsPage.ts", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "ViewRouter", file_path: "src/renderer/src/app/runtime/ViewRouter.ts", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "ContentUIFacade", file_path: "src/renderer/src/app/runtime/ui/ContentUIFacade.ts", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "ComponentRegistryMap", file_path: "src/renderer/src/app/runtime/components/ComponentTypes.ts", kind: "Interface", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "PageComponentBindings", file_path: "src/renderer/src/app/runtime/components/bindings/PageComponentBindings.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "LibraryPageDataService", file_path: "src/renderer/src/features/library/service/LibraryPageDataService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `rg -n "ArtistsPage|AlbumsPage|StatisticsPage|artistsPage|albumsPage|statisticsPage|showArtistsPage|showAlbumsPage|showStatisticsPage|updateArtistsPageButtonVisibility|updateAlbumsPageButtonVisibility|updateStatisticsButtonVisibility|LibraryPageDataService|libraryPageDataService|LibraryArtistInfo|LibraryAlbumItem|StatisticsPageData" src/renderer/src -S`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `cd src/renderer && npm run lint`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus impact showed HIGH risk for the page classes, `ViewRouter`, `ContentUIFacade`, and `PageComponentBindings`, because the old pages were tied into the old runtime initialization and routing chain.
- `ComponentRegistryMap` impact was MEDIUM.
- `LibraryPageDataService` impact was LOW and had no affected execution flows.
- `MusicBoxSettings` impact was CRITICAL, so obsolete `artistsPage` / `albumsPage` optional fields were intentionally left in the shared settings type for a later dedicated settings-schema cleanup.
- Residual source scan now only finds `artistsPage` / `albumsPage` optional fields in `src/renderer/src/api/types/settings.ts`.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS.
- `cd src/renderer && npm run lint`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `medium` risk, `changed_count 42`, `affected_count 3`, `changed_files 19`. Affected flows remain the existing NetEase availability flows: `Constructor -> CheckAvailability`, `RefreshPlaylist -> CheckAvailability`, `DoImportPlaylist -> CheckAvailability`.

### Risks

- The full old UI runtime is still present because UI-NEXT still reuses old dialogs/widgets and extension compatibility code.
- Shared settings cleanup is deferred because `MusicBoxSettings` is a CRITICAL hub.
- Extension API artist/album helpers are preserved because they are plugin-facing APIs, not the removed page chain.

### Next Step

Restart the dev app and ask the user to manually confirm UI-NEXT still opens normally, settings still opens, and no artist/album/statistics entry is reachable in the active UI.

## Product Roadmap: NetEase Loyal User Migration

### Document

- `docs/superpowers/plans/2026-06-18-netease-loyal-user-migration-roadmap.md`

### Priority Contract

- P0: NetEase account center, complete asset migration, trusted sync, first-run migration onboarding, login reliability, migration safety/rollback, local matching.
- P1: Search upgrade, daily primary-player playback feel, offline ability, startup warmup, performance/cache system, migration dashboard.
- P2: Settings/state polish, NetEase source identity system, old UI cleanup, settings schema cleanup, release quality/compliance, diagnostics, verification matrix.

### Playback Boundary

- Do not implement lyric translation or side-by-side lyric comparison.
- Playback work should focus on resume, queue memory, favorite state, source badge, cache hit state, lyric loading clarity, and lyric retry/rematch.

### Added Missing Roadmap Areas

- First-run migration onboarding.
- Startup warmup as product experience.
- Performance and cache strategy that preserves playback-page quality.
- Login reliability.
- Migration rollback/idempotency.
- Local matching algorithm.
- Migration dashboard.
- Old UI and compatibility cleanup.
- Settings schema cleanup.
- Release quality, branding, and compliance.
- Diagnostics and observability.
- Verification matrix.

## Stage 8: Settings Schema Cleanup

### Target

Remove retired artist, album, and statistics page settings from the shared renderer settings schema while preserving old user settings compatibility through a focused migration path.

### Changed Files

- `scripts/verify-no-legacy-artist-album-statistics.js`
- `src/renderer/src/api/types/settings.ts`
- `src/renderer/src/features/settings/service/SettingsStore.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "MusicBoxSettings", file_path: "src/renderer/src/api/types/settings.ts", kind: "Interface", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "SettingsStore", file_path: "src/renderer/src/features/settings/service/SettingsStore.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "load", file_path: "src/renderer/src/features/settings/service/SettingsStore.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "save", file_path: "src/renderer/src/features/settings/service/SettingsStore.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "update", file_path: "src/renderer/src/features/settings/service/SettingsStore.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-no-legacy-artist-album-statistics.js`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `cd src/renderer; npm run lint`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-no-legacy-artist-album-statistics.js`: first failed after adding the shared settings schema check, then PASS after implementation.
- GitNexus impact:
  - `MusicBoxSettings`: CRITICAL, with 37 direct dependents and 4 affected settings-related flows.
  - `SettingsStore`: MEDIUM.
  - `SettingsStore.load`: LOW.
  - `SettingsStore.save`: LOW.
  - `SettingsStore.update`: HIGH, affecting settings event/update flows.
- The implementation kept the risky change narrow:
  - Removed `statistics`, `artistsPage`, and `albumsPage` from `MusicBoxSettings`.
  - Added `SettingsStore` migration so load/save/update strip those retired keys from cached settings.
  - Retired setting writes are ignored and return a migrated settings object.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS.
- `cd src/renderer; npm run lint`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `high` risk, `changed_count 49`, `affected_count 7`, `changed_files 22`.
- New affected Stage 8 settings flows:
  - `Constructor -> GetString`
  - `Constructor -> GetBoolean`
  - `UpdateSetting -> Save`
  - `Constructor -> Load`
- Pre-existing affected NetEase flows remain:
  - `Constructor -> CheckAvailability`
  - `RefreshPlaylist -> CheckAvailability`
  - `DoImportPlaylist -> CheckAvailability`

### Risks

- `MusicBoxSettings` is a shared schema hub, so the stage intentionally avoids broader settings refactors.
- Settings migration is renderer-local through `SettingsStore`; extension/private arbitrary settings still remain possible via the index signature and extension settings APIs.
- Manual UI check is still useful: open Settings and confirm it loads normally after migrated cache stripping.

### Next Step

Restart the dev app, ask the user to manually open Settings, then continue to Stage 9 login reliability.

## Stage 9: Login Reliability

### Target

Harden NetEase QR login so phone confirmation is followed by real account verification, session cookies do not linger after failed confirmation, and UI-NEXT shows expired-login state instead of a misleading signed-out state.

### Changed Files

- `scripts/verify-netease-qr-login.js`
- `src/renderer/src/features/netease/service/NetEaseAuthService.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `node scripts/verify-netease-qr-login.js`
- `npm run typecheck:renderer`
- `npm run build:ts`
- `npm run build:renderer`
- `cd src/renderer && npm run lint`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-qr-login.js`: first failed as intended before implementation, then PASS after QR confirm/account verification checks were added.
- `npm run typecheck:renderer`: PASS.
- `npm run build:ts`: PASS.
- `npm run build:renderer`: PASS.
- `cd src/renderer && npm run lint`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `high` risk, `changed_count 54`, `affected_count 14`, `changed_files 22`. This reflects accumulated Stage 7/8 work plus the new Stage 9 login edits. Notable affected processes include `DoImportPlaylist → CheckAvailability`, `DoImportPlaylist → SaveCookie`, `Constructor → CheckAvailability`, and `RefreshPlaylist → CheckAvailability`.

### Risks

- `NetEaseApiClient.get()` is a CRITICAL hub and was intentionally not modified.
- `NetEaseAuthService.confirmQRLogin` adds a short retry window; if NetEase is slow, the UI now waits for account verification rather than claiming success too early.
- Manual verification is still needed after restart: scan QR, confirm on phone, and check the desktop login state refreshes without a manual app restart.

### Next Step

Restart the dev app, ask the user to manually scan QR and confirm that the desktop UI becomes logged in only after the account state refreshes.

## Stage 10: Migration Safety, Rollback, Idempotency, and Result View Foundation

### Target

Add a narrow NetEase playlist migration safety layer: pre-import snapshot, durable migration report, duplicate/idempotent counts, per-track failure list, latest newly-created import undo, and a visible import result summary. This stage does not implement full liked-songs, created-playlists, favorite-playlists, or recent-play migration.

### Changed Files

- `scripts/verify-netease-migration-safety.js`
- `src/renderer/src/features/netease/service/NetEaseMigrationReportService.ts`
- `src/renderer/src/features/netease/service/index.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "NetEasePlaylistImportService", file_path: "src/renderer/src/features/netease/service/NetEasePlaylistImportService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEasePlaylistSyncService", file_path: "src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "syncPlaylist", file_path: "src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseCloudMusic", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "doImportPlaylist", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "deletePlaylist", file_path: "src/renderer/src/features/library/service/LibraryDataService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "getPlaylists", file_path: "src/renderer/src/features/library/service/LibraryDataService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "getPlaylistDetail", file_path: "src/renderer/src/features/library/service/LibraryDataService.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "addTrackToLibrary", file_path: "src/renderer/src/features/library/LibraryController.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "addToPlaylist", file_path: "src/renderer/src/features/library/LibraryController.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-migration-safety.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-migration-safety.js`: first failed with `Missing NetEaseMigrationReportService.ts`, then PASS after implementation.
- `npm run typecheck:renderer` through PowerShell failed because `npm.ps1` is blocked by execution policy; reran the same gate with `npm.cmd run typecheck:renderer`, PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `high` risk, `changed_count 61`, `affected_count 14`, `changed_files 23`.

### GitNexus Risk Notes

- `NetEasePlaylistImportService`: LOW.
- `NetEasePlaylistSyncService`: LOW.
- `NetEasePlaylistSyncService.syncPlaylist`: CRITICAL, with direct callers in UI-NEXT `refreshPlaylist`, old NetEase import `doImportPlaylist`, and old `PlaylistDetailPage` sync flows. This stage did not change `syncPlaylist` signature or core behavior; it only records a report from the existing return result.
- `NetEaseCloudMusic`: MEDIUM.
- `NetEaseCloudMusic.doImportPlaylist`: LOW.
- `LibraryDataService.getPlaylistDetail`: CRITICAL, `getPlaylists`: HIGH, and `LibraryController.addTrackToLibrary`: HIGH. This stage did not edit those shared methods; it only reads their existing results to build snapshots and idempotency reports.
- New helper method `renderImportReport` is not present in the current GitNexus index yet, so direct symbol impact lookup returned target-not-found after the new method was added.

### Implementation Notes

- Added `NetEaseMigrationReportService` using existing `cacheManager` local storage.
- Reports include `snapshot`, counts, `duplicates`, `failures`, `createdPlaylistId`, `canUndo`, and status.
- Existing playlist sync now writes a non-undoable sync report.
- New playlist import now counts `trackResult.isNew === false` as existing/duplicate instead of treating it as a fresh library add.
- Per-track add/library failures are collected into `failures`.
- Successful new imports leave the import modal open with a result summary and an undo button.
- Undo only deletes the latest newly-created imported playlist and marks the report `undone`; it does not remove shared tracks from the library.

### Risks

- Manual UI verification is required because the result summary and undo button live in the reused NetEase import modal.
- The current report UI is intentionally basic; Stage 13/19 can later turn reports into a full dashboard/diagnostic surface.
- Worktree remains very dirty from previous stages, so `detect_changes` is broader than Stage 10 alone.

### Next Step

Restart the dev app and ask the user to test importing the same NetEase playlist twice, inspect the result summary, and try undo on a newly-created import. After confirmation, continue to Stage 11 complete asset migration.

## Stage 11: Complete NetEase Asset Migration Foundation

### Target

Add the first complete-asset migration foundation for NetEase users: liked songs, created playlists, subscribed playlists, recent plays, playlist covers, duplicate/idempotent handling, progress feedback, and failure collection. This stage keeps the scope to migration import; trusted sync conflict handling remains Stage 12.

### Changed Files

- `scripts/verify-netease-asset-migration.js`
- `src/renderer/src/features/netease/types.ts`
- `src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts`
- `src/renderer/src/features/netease/service/index.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Commands

- `query({repo: "MusicBox", query: "NetEase complete asset migration liked songs created playlists subscribed playlists recent plays import progress"})`
- `impact({repo: "MusicBox", target: "NetEaseCloudMusic", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "setupEventListeners", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "setupModals", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseSong", file_path: "src/renderer/src/features/netease/types.ts", kind: "Interface", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "doImportPlaylist", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-asset-migration.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- `node scripts/verify-netease-asset-migration.js`: first failed with missing `NetEaseAssetMigrationService.ts`, then PASS after implementation.
- `npm.cmd run typecheck:renderer`: first failed on one implicit `any` in `NetEaseAssetMigrationService.ts`, then PASS after typing the filter callback.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 217 modules and copied 23 static items.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `high` risk, `changed_count 69`, `affected_count 14`, `changed_files 23`.

### GitNexus Risk Notes

- GitNexus query found no existing full-asset migration flow; only the single playlist import flows were present.
- `NetEaseCloudMusic`: HIGH, with direct dependents in UI-NEXT and old component registry initialization. The stage kept edits limited to adding a modal button, progress text, and an event handler.
- `setupEventListeners`: LOW.
- `setupModals`: LOW.
- `NetEaseSong`: MEDIUM. New migration types were added as separate exports and existing fields were not changed.
- `doImportPlaylist`: LOW. The single playlist import method was not structurally changed for Stage 11.

### Implementation Notes

- Added `NetEaseAssetMigrationService`.
- `getMigrationPreview()` reads account id, liked songs, user playlists, and recent plays.
- Liked songs use `/likelist` plus `/song/detail`.
- Created and subscribed playlists use `/user/playlist`, split by playlist creator id.
- Recent plays use `/record/recent/song`.
- Asset migration creates local NetEase-tagged playlists for:
  - `[网易云] 我喜欢`
  - `[网易云] 最近播放`
  - `[网易云] <playlist name>` for created/subscribed playlists
- Playlist metadata writes `source`, `externalId`, `externalType`, `syncEnabled`, `lastSyncedAt`, and `coverImagePath`.
- Track import counts `trackResult.isNew === false` as existing/duplicate.
- Failures are collected with song/playlist id, title, and reason.
- Stage 10 migration reports are reused via `netEaseMigrationReportService.recordPlaylistImport`.
- The NetEase import modal now includes a `迁移全部资产` button and progress/result text.

### Risks

- Manual UI verification is required because real NetEase account data and recent-play endpoints depend on the logged-in account state.
- This stage does not yet implement conflict prompts or two-way sync protection; that remains Stage 12.
- Large accounts may take time because playlist details are fetched sequentially. Stage 16 can add concurrency limits, request de-duplication, and warmup.
- Current UI entry is intentionally basic and lives in the reused NetEase import modal; Stage 13/19 can evolve this into a durable migration dashboard and diagnostics.
- Worktree remains dirty from previous stages, so `detect_changes` includes accumulated changes beyond Stage 11.

### Next Step

Restart the dev app and ask the user to manually test `迁移全部资产` with a logged-in NetEase account. After confirmation, continue to Stage 12 trusted sync and conflict protection.
## Stage 24: UI-NEXT Playlist Right-Click Menu

### Target

Add a UI-NEXT sidebar playlist context menu so users can right-click a playlist and choose `重命名` or `删除`.

### Changed Files

- `scripts/verify-ui-next-playlist-context-menu.js`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/styles.css`

### Verification Commands

- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "renamePlaylist", file_path: "src/renderer/src/features/library/LibraryController.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-ui-next-playlist-context-menu.js`
- `node --check src/renderer/ui-next-static/components/Sidebar.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `UINextMusicBoxAdapter` LOW, `LibraryController.renamePlaylist` LOW.
- `node scripts/verify-ui-next-playlist-context-menu.js`: first failed before implementation, then PASS with 7 checks.
- `node --check src/renderer/ui-next-static/components/Sidebar.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical`, `changed_count 143`, `affected_count 43`, `changed_files 36`. This is cumulative dirty-worktree risk from prior stages, not isolated Stage 24 risk.

### Implementation Notes

- Sidebar playlist rows now pass `oncontextmenu` into `navItem`.
- `NewMusicShell` owns `playlistContextMenu` state, clamps menu position, closes on outside click and `Escape`, and renders a compact fixed-position menu.
- Menu actions call adapter methods: `renamePlaylist` and existing `deletePlaylist`.
- `UINextMusicBoxAdapter.renamePlaylist()` reuses `libraryController.renamePlaylist`, refreshes the UI-NEXT library snapshot, and refuses NetEase-source playlists with a Chinese toast.
- Delete behavior remains the existing local-playlist delete flow. NetEase-source playlists are still protected by the adapter.

### Manual Test Request

Ask the user to right-click a local playlist in the left sidebar, choose `重命名`, confirm the name updates, then right-click again and choose `删除`. Also test `Esc` and outside click closing the menu.
## Stage 25: Playlist Mutation Performance

### Target

Reduce UI stalls when creating, deleting, renaming, importing, and syncing playlists in UI-NEXT.

### Root Cause

Playlist mutations called `libraryController.emitLibraryUpdated([])` and then directly called `loadLibrarySnapshot()`. The adapter also listens to `onLibraryUpdated` and calls `loadLibrarySnapshot()` again. One playlist change could therefore trigger duplicate full-library refreshes. Each refresh maps the full track library, rebuilds playlist caches, refreshes migration/account state, and previously scheduled per-playlist cover async reads with repeated `shell.render()` calls.

### Changed Files

- `scripts/verify-ui-next-playlist-mutation-performance.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-ui-next-playlist-mutation-performance.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `UINextMusicBoxAdapter` LOW.
- `node scripts/verify-ui-next-playlist-mutation-performance.js`: first failed before implementation, then PASS with 11 checks.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: `critical`, `changed_count 144`, `affected_count 43`, `changed_files 36`. This is cumulative dirty-worktree risk from prior stages, not isolated Stage 25 risk.

### Implementation Notes

- Added `requestLibrarySnapshotRefresh()` to coalesce concurrent library snapshot refreshes.
- Added `notifyLibraryChanged()` so playlist mutations have one notification/refresh path.
- Mutation paths for create/delete/rename/sync now use `notifyLibraryChanged()` instead of mixing direct snapshot loads with library update events.
- `loadLibrarySnapshot()` no longer runs full `hydratePlaylistCovers(uiPlaylists)` or per-playlist `resolveCachedPlaylistCoverAsync(...).then(shell.render)` on every mutation.
- Playlist covers now use synchronous manifest hits plus `preloadStableCoverMetadata(uiPlaylists)` for bounded background work.

### Manual Test Request

Ask the user to test local playlist create/delete/rename, NetEase imported playlist delete, NetEase playlist import/sync, and adding a song to a playlist. The expected result is less UI freezing during the mutation and a single visible refresh after completion.

## Stage 26: Optimistic Playlist Mutation UI

### Target

Make playlist create/delete/rename feel immediate in UI-NEXT by updating visible shell state first and delaying the full library snapshot reconciliation to the background.

### Root Cause

Stage 25 removed duplicate full-refresh paths and cover hydration loops, but mutation success handlers still depended on a library snapshot refresh to reflect user-visible playlist state. On larger libraries that refresh maps all tracks, rebuilds playlist caches, and recomputes derived account/migration surfaces, so the UI can still pause briefly after local and NetEase playlist mutations.

### Changed Files

- `scripts/verify-ui-next-playlist-mutation-performance.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "notifyLibraryChanged", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Method", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-ui-next-playlist-mutation-performance.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `notifyLibraryChanged` was not indexed, `UINextMusicBoxAdapter` LOW.
- `node scripts/verify-ui-next-playlist-mutation-performance.js`: first failed on the stale verification matcher, then PASS with 19 checks after updating the matcher and implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.
- Root `npm.cmd run lint`: not available in this repository; renderer lint is the valid documented lint command.

### Implementation Notes

- `notifyLibraryChanged()` is now a void, non-blocking notification path that emits the library update event and schedules delayed reconciliation.
- Added delayed background reconciliation through `scheduleLibrarySnapshotReconcile()` instead of awaiting a full snapshot refresh in mutation handlers.
- `createPlaylist()`, `deletePlaylist()`, and `renamePlaylist()` update shell playlist state optimistically before background reconciliation.
- Removed duplicate delete-state mutation in `deletePlaylist()` so the helper owns visible playlist removal, cache clearing, active playlist fallback, and render.
- Updated the performance verification script so method-body extraction targets actual method declarations rather than the first call site.

### Manual Test Request

Ask the user to test local playlist create/delete/rename, NetEase imported playlist delete, NetEase playlist import/sync, and adding a song to a playlist. Expected result: the visible playlist list updates immediately after the operation succeeds, while the full library refresh reconciles in the background.

## Stage 27: NetEase API Late-Ready Recovery

### Target

Prevent UI-NEXT from staying in an offline NetEase account state when the local NetEase API service becomes available after an earlier startup timeout or transient unavailable event.

### Root Cause

Runtime logs showed `NetEase API did not become ready within 45000ms`, followed later by `server running @ http://127.0.0.1:3000` and `NetEase API became ready`. The main process already continues waiting and can emit a late `netease:api-ready`, but UI-NEXT could still show a stale offline state until another explicit user action refreshed the status.

### Changed Files

- `scripts/verify-netease-api-late-ready-recovery.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`

### Verification Commands

- `impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-api-late-ready-recovery.js`
- `node --check src/renderer/ui-next-static/NewMusicShell.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `UINextMusicBoxAdapter` LOW.
- `node scripts/verify-netease-api-late-ready-recovery.js`: RED first with 12 missing checks, then PASS with 12 checks after implementation.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.

### Implementation Notes

- UI-NEXT now treats `netease:api-ready` as a forced fresh NetEase status sync, so late-ready events override earlier unavailable state.
- `netease:api-unavailable` now goes through a recovery handler that marks the UI offline and schedules a short forced retry instead of leaving the state frozen.
- NetEase status refreshes now use a session counter so stale async results cannot overwrite a newer forced refresh.
- Opening the top-right NetEase account menu triggers a forced status refresh, making the visible account surface self-healing.
- The main process startup chain was left unchanged because it already performs a longer late-ready wait after the initial 45-second timeout.

### Manual Test Request

Ask the user to restart the app, wait for the top-right NetEase status, then click the NetEase avatar/account menu. Expected result: if the API service becomes available late, the menu/status recovers to signed-in or signed-out instead of staying stuck on offline. QR login should be retried from that recovered state.

## Stage 28: NetEase QR Confirmation Finalization

### Target

Make QR login more reliable after the user scans the code and confirms on the phone, especially when the local NetEase API returns the QR confirmed state before the account cookie/profile is immediately usable.

### Root Cause

The QR flow already handled the `803` confirmed state and called `confirmQRLogin(result.cookie)`, but finalization returned only a boolean and used a short verification window. Real login can lag between phone confirmation, cookie adoption, and `/user/account` becoming readable, so the UI could show "confirmed but failed to sync account state" even after the phone confirmation was valid.

### Changed Files

- `scripts/verify-netease-qr-confirmation-finalization.js`
- `src/renderer/src/features/netease/service/NetEaseAuthService.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "NetEaseAuthService", file_path: "src/renderer/src/features/netease/service/NetEaseAuthService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseCloudMusic", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-qr-confirmation-finalization.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `NetEaseAuthService` LOW; `NetEaseCloudMusic` HIGH because it is shared by legacy widget initialization and UI-NEXT.
- `node scripts/verify-netease-qr-confirmation-finalization.js`: RED first with missing finalization checks, then PASS with 12 checks after implementation.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.

### Implementation Notes

- `confirmQRLogin(cookie?)` now returns the verified `NetEaseAccountProfile | null` instead of only a boolean.
- QR confirmation now uses explicit bounded retry constants: 12 attempts at 1000ms.
- Finalization verifies login by repeatedly reading the account profile, not just a one-shot status boolean.
- Failed finalization still clears stale cookie state.
- The QR login UI now stores the verified account profile and appends the nickname to the success status before broadcasting `netease-login-status-changed`.
- UI-NEXT already force-refreshes account state on `netease-login-status-changed` from Stage 27.

### Manual Test Request

Ask the user to open the NetEase account menu, start QR login, scan with the NetEase Cloud Music mobile app, confirm on the phone, and wait up to 12 seconds. Expected result: the login modal shows success with the account nickname, the right-top NetEase avatar/status refreshes, and the account menu no longer remains stuck in signed-out/offline state.

## Stage 29: NetEase QR Login Diagnostics

### Target

When QR login still fails after phone confirmation, show and log actionable diagnostics instead of only saying the account state sync failed.

### Root Cause

Stage 28 extended QR confirmation finalization, but a remaining failure still needed clearer evidence. The QR path spans API availability, QR status, cookie adoption, `/user/account` verification, widget state, and UI-NEXT account refresh. Without diagnostics, a real-user failure could not distinguish missing cookie, delayed profile, empty profile response, or request failure.

### Changed Files

- `scripts/verify-netease-login-diagnostics.js`
- `scripts/verify-netease-qr-login.js`
- `src/renderer/src/features/netease/types.ts`
- `src/renderer/src/features/netease/service/NetEaseAuthService.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Commands

- `impact({repo: "MusicBox", target: "NetEaseAuthService", file_path: "src/renderer/src/features/netease/service/NetEaseAuthService.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `impact({repo: "MusicBox", target: "NetEaseCloudMusic", file_path: "src/renderer/src/ui/widgets/NetEaseCloudMusic.ts", kind: "Class", direction: "upstream", summaryOnly: true})`
- `node scripts/verify-netease-login-diagnostics.js`
- `node scripts/verify-netease-qr-login.js`
- `npm.cmd run typecheck:renderer`
- `npm.cmd run build:ts`
- `npm.cmd run build:renderer`
- `npm.cmd run lint` from `src/renderer`
- `detect_changes({repo: "MusicBox", scope: "unstaged"})`

### Verification Results

- GitNexus pre-change impact: `NetEaseAuthService` LOW; `NetEaseCloudMusic` HIGH because it is shared by legacy widgets and UI-NEXT.
- `node scripts/verify-netease-login-diagnostics.js`: RED first with missing diagnostic checks, then PASS with 22 checks after implementation.
- `node scripts/verify-netease-qr-login.js`: initially failed because the old quality gate expected the Stage 9 boolean/5-attempt implementation; updated the gate to enforce the stronger Stage 28/29 diagnostic finalization and it now PASSes.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` in `src/renderer`: PASS, including architecture boundary check.

### Implementation Notes

- Added `NetEaseQRConfirmationResult` with `profile` plus diagnostic metadata.
- QR confirmation diagnostics now record whether a QR cookie was adopted, how many account verification attempts ran, and the last account-check state.
- Account check states include: `not-started`, `missing-cookie`, `profile-found`, `profile-missing`, and `request-failed`.
- QR login failure UI now appends a concise Chinese diagnostic string.
- QR login failure path logs `[NetEaseCloudMusic] QR login finalization failed` with the diagnostic payload.
- Existing QR reliability gate was updated to preserve the stronger profile verification and diagnostic behavior.

### Manual Test Request

Ask the user to test QR login again. If it succeeds, confirm the top-right account state and avatar update. If it fails after phone confirmation, copy the diagnostic text shown in the login modal and the console warning payload; that should identify whether the failure is missing cookie, empty profile, or request failure.

## Stage 30: NetEase QR Diagnostics Copy Action

### Target

Make the remaining QR-login failure state actionable by adding a copyable diagnostic payload and an explicit retry QR path.

### Changed Files

- `scripts/verify-netease-qr-diagnostics-copy.js`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Results

- `node scripts/verify-netease-qr-diagnostics-copy.js`: RED first, then PASS with 16 checks.
- `node scripts/verify-netease-login-diagnostics.js`: PASS.
- `node scripts/verify-netease-qr-login.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.
- Dev app restarted with GPU fallback; NetEase API `/login/qr/key` returned `code: 200`.

### Implementation Notes

- QR login failure now stores a copyable diagnostic text containing timestamp, API endpoint, cookie-adoption state, verification attempts, last account-check state, and visible failure text.
- The diagnostic payload intentionally excludes raw cookie values.
- The login modal dynamically adds a `复制诊断` action and changes the QR button to `重新获取二维码` after failure or expiry.
- Starting a new QR login or completing login clears stale diagnostic state.

### Manual Verification

The user verified QR login succeeds after this stage.

## Stage 31: NetEase Asset Migration Preflight

### Target

After login is working, make `迁移全部资产` safer and more predictable by pre-reading NetEase assets, showing a count summary, and requiring confirmation before the long migration starts.

### Changed Files

- `scripts/verify-netease-asset-migration-preflight.js`
- `scripts/verify-netease-asset-migration.js`
- `src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`

### Verification Results

- `node scripts/verify-netease-asset-migration-preflight.js`: RED first, then PASS with 17 checks.
- `node scripts/verify-netease-asset-migration.js`: initially failed because the old gate required direct UI `migrateAllAssets`; updated the gate for the new preflight-confirmed `migratePreview` path, then PASS.
- `node scripts/verify-netease-account-menu-asset-migration.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.

### Implementation Notes

- `NetEaseAssetMigrationService.prepareMigrationPreflight()` now reuses `getMigrationPreview()` and returns grouped asset counts, estimated target playlist count, total track estimate, and the resolved preview.
- `migrateAllAssets()` remains as the compatibility entry and delegates to `migratePreview(preview, onProgress)`.
- The NetEase import/account migration entry now preflights, renders a visible summary, asks for confirmation, and then migrates the already-prepared preview.
- The pending preview is cleared after completion, cancellation, or failure.

### Manual Test Request

Ask the user to open the right-top NetEase menu, click `迁移全部资产`, confirm that a preflight summary appears before migration starts, cancel once to verify no migration starts, then run it again and confirm the progress uses the already prepared asset list.

### Follow-up Fix: Duplicate Migration Guard

The user reproduced a real issue: clicking `迁移全部资产`, switching away so the menu collapsed, then opening it again could trigger a second migration request while the first preflight/migration was still running. Root cause was that Stage 31 disabled only the modal button, but the account-menu entry could still call `startAssetMigrationFromAccountMenu()` again.

Fix:

- Added `isAssetMigrationRunning` to `NetEaseCloudMusic`.
- `openAssetMigration()` now returns early with a visible message/toast when a migration is already in flight.
- The flag is set before async preflight starts and cleared in `finally`, covering preflight, confirmation, migration, cancellation, and failure.
- Updated `scripts/verify-netease-asset-migration-preflight.js` to enforce the in-flight guard.

Verification:

- `node scripts/verify-netease-asset-migration-preflight.js`: RED first for missing guard, then PASS with 21 checks.
- `node scripts/verify-netease-asset-migration.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.
- Dev app restarted; NetEase API `/login/qr/key` returned `code: 200`.

## Stage 32: NetEase Asset Migration Progress Throttle

### Target

Reduce UI stalls during large NetEase asset migration by throttling high-frequency progress DOM writes while preserving immediate feedback for start, preflight, cancel, finish, and error states.

### Changed Files

- `scripts/verify-netease-asset-migration-progress-throttle.js`
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
- `docs/progress/auralux-next-stage.md`

### Root Cause

The migration service reports progress per playlist and per track. The UI callback wrote both migration progress and import status text synchronously for every progress event. Large accounts can therefore create many DOM writes in quick succession, making the app feel stuck even when the migration is still progressing.

### Implementation Notes

- Added a 250ms minimum interval for non-critical asset migration progress rendering.
- Stored the latest pending progress message/status text and flushed it with a short timer.
- Kept important lifecycle messages forced and immediate: preparing, preflight, duplicate-running warning, cancellation, completion, and errors.
- The per-track migration callback now routes progress and status text through the throttled renderer instead of writing `importStatus.textContent` directly each time.
- `finally` clears any pending progress flush timer so stale progress cannot render after completion or cancellation.

### Verification Results

- `node scripts/verify-netease-asset-migration-progress-throttle.js`: RED first, then PASS with 14 checks.
- `node scripts/verify-netease-asset-migration-preflight.js`: PASS.
- `node scripts/verify-netease-asset-migration.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.

### Manual Test Request

Run `迁移全部资产` on the logged-in account and observe whether the UI remains responsive during progress. It should still show progress, but it should not update the DOM for every single track.

## Stage 33: NetEase Account Menu Migration Running State

### Target

Make the right-top NetEase account menu reflect that asset migration is already running, so users do not interpret the collapsed menu as a failed click and retry the operation.

### Changed Files

- `scripts/verify-netease-account-menu-migration-running.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/components/TopSearch.js`
- `src/renderer/ui-next-static/styles.css`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added `neteaseAssetMigrationRunning` to UI-NEXT shell state.
- `UINextMusicBoxAdapter.migrateAllNetEaseAssets()` sets the running flag before launching migration and clears it in `finally` after the account-menu migration path completes.
- `NewMusicShell` now initializes and forwards the running flag to `TopSearch`.
- `TopSearch` changes the primary menu action from `迁移全部资产` to `迁移中` while running and disables the handler.
- Added disabled styling for the NetEase menu action so the state is visible, not only functionally blocked.

### Verification Results

- `node scripts/verify-netease-account-menu-migration-running.js`: RED first, then PASS with 11 checks.
- `node --check src/renderer/ui-next-static/components/TopSearch.js`: PASS.
- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `node scripts/verify-netease-asset-migration-preflight.js`: PASS.
- `node scripts/verify-netease-asset-migration-progress-throttle.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.

### Manual Test Request

Start `迁移全部资产`, reopen the right-top NetEase menu while it is still running, and confirm the primary action shows `迁移中` and cannot be clicked.

## Stage 34: NetEase Limited Stream Playback Guards

### Target

Fix song-specific playback instability where a NetEase track exposes a full metadata duration but the actual playable stream is much shorter. Do not change immersive player visual quality or tune pickup-bar styling.

### Root Cause Evidence

For the user-reported example `netease://1447544007` / `笼中鸟`:

- `/song/detail` returned `dt = 291735ms`.
- `/song/url/v1` returned `time = 30040ms`, `fee = 1`, and a playable URL.
- `/lyric/new` returned YRC where the first lyric line starts at `34640ms`.

This means UI code could seek using about 292 seconds while the real audio stream is about 30 seconds, and lyric rendering could default to line 0 before any lyric timestamp was actually active.

### Changed Files

- `scripts/verify-netease-limited-stream-playback-guards.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts`
- `src/renderer/src/features/netease/service/NetEaseLyricsService.ts`
- `src/renderer/ui-next-static/components/ImmersivePlayerView.js`

### Implementation Notes

- `UINextMusicBoxAdapter.seek()` now ignores non-finite ratios and clamps the ratio before computing optimistic position.
- `WebAudioTrackLoader` now resolves NetEase playback duration from the real media duration when the actual stream is far shorter than metadata duration.
- NetEase YRC parsing now sanitizes invalid line and word timing.
- Immersive lyrics no longer default to the first lyric line before the first timestamp; active index can remain `-1`.

### Verification Results

- `node scripts/verify-netease-limited-stream-playback-guards.js`: RED first for missing adapter ratio guard, then PASS.
- `node scripts/verify-immersive-seek-ratio.js`: PASS.
- `node scripts/verify-playerbar-seek-ratio.js`: PASS.
- `node scripts/verify-playback-visualizer-startup-stability.js`: PASS.
- `node --check src/renderer/ui-next-static/components/ImmersivePlayerView.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run lint` from `src/renderer`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL cumulative dirty-worktree risk, `changed_count 152`, `affected_count 43`, `changed_files 38`. This is accumulated multi-stage dirty-worktree risk, not isolated Stage 34 risk.

### Manual Test Request

Restart the dev app, play `笼中鸟`, and test:

- The progress bar duration should reflect the actual playable stream instead of the full metadata duration if the API only returns a short stream.
- Clicking the playback/seek area should not jump directly to the end.
- Before the first available lyric timestamp, lyrics should not jump by treating the first line as active too early.
- Pickup-bar flicker should be observed separately; if it remains, capture whether it is only during the first seconds of the short/limited stream.

### Follow-up Fix: Prelude Lyric Render Loop

The user confirmed that `笼中鸟` still flickered only during the instrumental prelude before vocals started, then stabilized once lyrics began.

Root cause:

- Before the first lyric timestamp, immersive lyric active index can legitimately be `-1`.
- The progress update path looked for an active rendered lyric line, found none, and triggered `_refreshImmersiveLyricsWindow(-1)`.
- Because the prelude still had no active line after render, this created a high-frequency render loop that made pickup bars flicker and controls feel unresponsive.

Fix:

- `NewMusicShell._updateImmersiveProgressOnly()` now handles `active < 0` as a stable prelude state.
- Prelude state clears active lyric classes and word highlights without refreshing the lyric window.
- Perf logging is still allowed during the prelude so future regressions remain observable.
- Added `scripts/verify-immersive-prelude-lyrics-stability.js`.

Verification:

- `node --check src/renderer/ui-next-static/NewMusicShell.js`: PASS.
- `node scripts/verify-immersive-lyrics-refresh-target.js`: PASS.
- `node scripts/verify-immersive-prelude-lyrics-stability.js`: PASS.
- `node scripts/verify-immersive-visualizer-stability.js`: PASS.
- `node scripts/verify-immersive-player-playing-entry.js`: PASS.
- `node scripts/verify-immersive-debug-log.js`: PASS.
- `node scripts/verify-immersive-seek-ratio.js`: PASS.
- `node scripts/verify-playerbar-immersive-entry.js`: PASS.
- `npm.cmd run build:renderer`: PASS.
- Dev app restarted after the fix.

Manual verification:

- User confirmed the `笼中鸟` prelude flicker issue is fixed.

## Stage 35: Cross-Stage Quality Gate and UI-NEXT Fallback Copy Cleanup

### Target

Close the current playback/NetEase/UI-NEXT stabilization pass with a reusable quality gate and remove small user-visible fallback copy regressions.

Covered behavior:

- Keep Stage 35 focused on verification and cleanup, not new product features.
- Add a single cross-stage verification script that runs the existing focused checks for settings, UI-NEXT, startup, cache, playback, immersive player, NetEase login, migration, search, sync, local matching, and offline status.
- Update stale quality gates that conflicted with later stages:
  - cover cache verification now expects startup/background cover metadata preloading instead of full `hydratePlaylistCovers()` on every library snapshot;
  - QR finalization verification now expects the Stage 29 `NetEaseQRConfirmationResult` diagnostic wrapper;
  - the aggregate gate does not run the old sidebar account-center gate after the account UI moved to the top-right menu.
- Localize UI-NEXT fallback copy that could still surface if the dedicated dialogs are unavailable.

### Changed Files

- `scripts/verify-auralux-stage35-quality-gate.js`
- `scripts/verify-ui-next-stage35-fallback-copy.js`
- `scripts/verify-cover-cache-manifest.js`
- `scripts/verify-netease-qr-confirmation-finalization.js`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- `UINextMusicBoxAdapter.createPlaylist()` fallback prompt/toasts are now Chinese.
- NetEase asset migration fallback copy no longer tells the user to use the old import-modal-only path.
- NetEase imported playlist delete fallback confirm is now Chinese.
- The Stage 35 quality gate uses fixed local commands only and avoids `shell: true`.

### Verification Results

- `node scripts/verify-ui-next-stage35-fallback-copy.js`: RED first with English fallback prompt, then PASS.
- `node scripts/verify-cover-cache-manifest.js`: PASS after aligning the gate with the current cover metadata preload design.
- `node scripts/verify-netease-qr-confirmation-finalization.js`: PASS after aligning the gate with the current diagnostic confirmation result.
- `node scripts/verify-auralux-stage35-quality-gate.js`: PASS, covering 42 focused checks and syntax checks.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS, Vite built 219 modules and copied 23 static items.

### Manual Test Request

No new feature manual test is required for Stage 35. Ask the user to continue using the app normally, with special attention to:

- fallback create-playlist flow if the custom create dialog ever fails to appear;
- right-top NetEase migration entry;
- imported NetEase playlist deletion confirmation;
- `笼中鸟` immersive playback remains stable after the Stage 34 follow-up.

## Stage 36.1: Visible Copy Mojibake and Fallback Cleanup

### Target

Fix small user-visible copy regressions found during the Stage 36 read-only audit without changing playback behavior, migration behavior, UI layout, or dirty-worktree state.

Covered behavior:

- Invalid NetEase playlist ID errors display readable Chinese.
- Empty NetEase playback URL errors display readable Chinese.
- UI-NEXT fallback sync-conflict confirmation displays Chinese if the custom confirm surface is unavailable.

### Changed Files

- `scripts/verify-stage36-visible-copy-cleanup.js`
- `scripts/verify-auralux-stage35-quality-gate.js`
- `src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts`
- `src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `docs/progress/auralux-next-stage.md`

### Implementation Notes

- Added a focused guard for the three visible-copy regressions.
- Replaced the mojibake invalid NetEase playlist ID text with `无效的网易云歌单 ID`.
- Replaced the mojibake empty stream URL text with `网易云播放地址为空`.
- Replaced the English sync-conflict fallback confirm with `网易云同步检测到冲突，是否在保护本地歌曲的前提下继续？`.
- Added the focused guard to the cross-stage quality gate so this does not regress.

### Verification Results

- GitNexus pre-change impact:
  - `NetEasePlaylistSyncService`: LOW.
  - `WebAudioTrackLoader`: MEDIUM, limited to string-only user-visible copy changes.
  - `UINextMusicBoxAdapter.refreshPlaylist`: LOW.
- `node scripts/verify-stage36-visible-copy-cleanup.js`: RED first on mojibake invalid playlist ID, then PASS after implementation.
- `node --check src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts`: PASS.
- `node --check src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts`: PASS.
- `node scripts/verify-auralux-stage35-quality-gate.js`: PASS before adding this guard; rerun after adding this guard is required before final report.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.

### Manual Test Request

No immediate visual retest is required for this copy-only stage. If a future NetEase sync conflict, invalid imported playlist ID, or empty NetEase playback URL occurs, the visible fallback/error text should be readable Chinese.

## Stage 36.2: Dirty Worktree Consolidation Review

### Target

Turn the accumulated Stage 14-36 dirty worktree into an explicit review map before any cleanup, deletion, reset, or commit.

This stage is intentionally read-only for source behavior:

- Do not reset, clean, revert, delete logs, or commit.
- Do not change playback, migration, UI-NEXT behavior, or old UI runtime code.
- Produce a concrete grouping for the next commit-preparation step.

### Evidence Gathered

- `git status --short`: current worktree still contains many tracked modifications/deletions plus untracked stage assets.
- `git diff --name-status`: tracked side includes 46 changed/deleted files.
- `git diff --stat`: tracked side is `46 files changed, 5380 insertions(+), 3474 deletions(-)`.
- `git ls-files --others --exclude-standard`: untracked side is mostly verification scripts, progress/design docs, NetEase service additions, UI-NEXT cache/warmup additions, and dev logs.

### Worktree Groups

1. Runtime logs / dev evidence:
   - `dev-run.log`, `dev-run.err.log`, `dev-debug.*`, `dev-restart.*`
   - Decision: keep out of cleanup unless the user explicitly approves; do not commit by default unless needed as evidence.

2. Project progress and Superpowers design assets:
   - `docs/progress/auralux-next-stage.md`
   - `docs/superpowers/plans/*`
   - `docs/superpowers/specs/*`
   - Decision: keep as recovery/handoff assets; include progress log in project commit if committing stage work.

3. Verification quality gates:
   - `scripts/verify-*.js`
   - Decision: treat as long-term regression guards, not temporary files. Prioritize keeping the aggregate Stage 35 gate and focused guards that protect user-reported regressions.

4. UI-NEXT runtime and static shell:
   - `src/renderer/src/ui-next/**`
   - `src/renderer/ui-next-static/**`
   - `src/renderer/vite.config.js`
   - Decision: high-value stage成果; commit only after Stage 35 gate, typecheck, build, and manual smoke where needed.

5. NetEase integration:
   - `src/renderer/src/features/netease/**`
   - `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
   - NetEase-related adapter paths in `UINextMusicBoxAdapter.ts`
   - Decision: high-risk user-data surface; preserve and verify with real-account test matrix before release.

6. Playback, lyrics, cache, and persistence:
   - `MusicBoxAPI.ts`
   - `PlaybackPersistence.ts`
   - `WebAudioTrackLoader.ts`
   - `PlaybackAppController.ts`
   - `LyricsContentService.ts`
   - `CacheManager.ts`
   - Decision: preserve; do not refactor while the `笼中鸟`/immersive fixes are confirmed stable.

7. Old UI deletion and compatibility cleanup:
   - Deleted: `LibraryPageDataService.ts`, `AlbumsPage.ts`, `ArtistsPage.ts`, `StatisticsPage.ts`
   - Modified old runtime compatibility files: `ViewRouter`, `ComponentEventBinder`, component binding/types, `ContentUIFacade`
   - Decision: these deletions are intentional for removed artist/album/statistics product areas, but old UI as a whole cannot be deleted yet because UI-NEXT still reuses old dialogs/widgets and plugin compatibility.

8. New UI-NEXT cache/warmup services:
   - `playlistCoverManifest.ts`
   - `playlistCoverTypes.ts`
   - `startupWarmup.ts`
   - Decision: keep; they are part of startup warmup and cover-cache performance work.

### Risk Register

- GitNexus `detect_changes()` remains CRITICAL because the dirty worktree contains many accumulated stages across playback, NetEase, UI-NEXT, startup, and old runtime compatibility.
- The CRITICAL result must not be interpreted as a reason to reset or clean. It is a commit-preparation signal.
- `WebAudioTrackLoader`, `UINextMusicBoxAdapter`, `NewMusicShell`, and `NetEaseCloudMusic` are the most sensitive files for review because they sit on playback, immersive UI, and NetEase flows.
- Old UI deletion must proceed by dependency migration, not directory deletion.
- Line-ending warnings appeared during diff/status inspection (`LF will be replaced by CRLF` when Git touches files). Do not run broad formatting or mass line-ending normalization in the same commit as functional work.

### Recommended Commit Preparation Order

1. Keep logs uncommitted unless explicitly needed.
2. Commit documentation/progress and verification guards together or immediately after source stages.
3. Commit UI-NEXT formalization/startup/cache changes as one reviewed block.
4. Commit NetEase login/migration/sync/search/local-match changes as one or two reviewed blocks.
5. Commit playback/immersive stability fixes separately from NetEase migration changes.
6. Commit old artist/album/statistics deletion separately with the focused legacy guard.
7. Run `node scripts/verify-auralux-stage35-quality-gate.js`, `npm.cmd run typecheck:renderer`, `npm.cmd run build:renderer`, and GitNexus `detect_changes()` immediately before any commit.

### Manual Test Request

Before release or final commit series, ask the user to manually verify:

- App starts into UI-NEXT.
- Right-top NetEase account menu opens and migration entry shows correct state.
- Full NetEase migration can be cancelled once, then run once without double-trigger.
- Imported NetEase playlist deletion only removes local imported playlist.
- `笼中鸟` immersive prelude remains stable.
- Playback bar seek does not jump to the end.
- Settings page remains Chinese.

## Stage 36.3: Non-Log Commit Preparation Staging

### Target

Prepare the accumulated Auralux stage work for a reviewable commit without committing and without cleaning the working tree.

Scope:

- Stage source, documentation, verification scripts, intentional deletions, and new service files.
- Keep runtime/dev logs unstaged.
- Do not delete or truncate logs.
- Do not reset, clean, revert, commit, or push.

### Staging Policy

Explicitly exclude these log files from staging:

- `dev-run.log`
- `dev-run.err.log`
- `dev-debug.out.log`
- `dev-debug.err.log`
- `dev-restart.out.log`
- `dev-restart.err.log`

Stage everything else currently relevant to the accumulated Stage 14-36 implementation:

- UI-NEXT source/static shell changes.
- NetEase login/migration/sync/local-match/search/service changes.
- Playback, lyrics, persistence, cache, and limited-stream stability changes.
- Startup warmup/cache additions.
- Settings/UI Chinese and old artist/album/statistics deletion changes.
- Verification scripts and progress/design documentation.

### Verification Requirement

After staging:

- Review `git status --short` and confirm only dev logs remain unstaged.
- Run `node scripts/verify-auralux-stage35-quality-gate.js`.
- Run `npm.cmd run typecheck:renderer`.
- Run `npm.cmd run build:renderer`.
- Run GitNexus `detect_changes({repo: "MusicBox", scope: "staged"})`.

### Expected Risk

GitNexus staged detection is still expected to report high or critical risk because the staged package contains many accumulated phases. Treat that as a review signal, not as an instruction to reset or clean.

### Verification Results

- Staging policy applied with `git add -A`, then logs unstaged via `git restore --staged -- dev-run.log dev-run.err.log dev-debug.out.log dev-debug.err.log dev-restart.out.log dev-restart.err.log`.
- `git status --short`: all non-log stage work is staged; only dev logs remain unstaged/untracked.
- `git diff --cached --stat`: staged package contains `109 files changed, 12503 insertions(+), 3283 deletions(-)`.
- `git diff --stat`: unstaged package contains only `dev-run.err.log` and `dev-run.log`.
- `node scripts/verify-auralux-stage35-quality-gate.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "staged"})`: CRITICAL, `changed_count 178`, `affected_count 43`, `changed_files 105`. This is expected for the staged multi-stage package and should be reviewed before commit.

### Remaining Unstaged Files

- Modified logs:
  - `dev-run.log`
  - `dev-run.err.log`
- Untracked logs:
  - `dev-debug.out.log`
  - `dev-debug.err.log`
  - `dev-restart.out.log`
  - `dev-restart.err.log`

Do not clean or delete these unless the user explicitly asks.

## Stage 40: NetEase Migration Progress Lifecycle

### Target

Make full NetEase asset migration controllable and observable during long runs:

- Add explicit migration lifecycle phases: preflight, fetching, writing, refreshing, completed, cancelled, failed.
- Add a cancel control for the long migration modal.
- Keep already written library data when cancellation is requested.
- Stop at stage/playlist boundaries; do not interrupt an active bulk write mid-batch.
- Keep the top-right account menu running state independent from the full shell render path.

### Implementation Notes

- `NetEaseMigrationProgress` now carries an optional `phase`.
- `NetEaseMigrationControl` exposes `isCancelled()`.
- `NetEaseAssetMigrationService` accepts an optional cancellation control in full migration and preview migration.
- Cancellation is checked before each major group, before each user playlist, and before bulk playlist write.
- Cancelled playlist attempts record `status: 'cancelled'` in migration reports.
- The import modal now creates a `取消迁移` button, shows it while migration is running, disables it after click, and hides it in `finally`.
- The modal passes `isCancelled: () => this.assetMigrationCancelRequested` into the migration service.

### Verification Results

- `node scripts/verify-netease-migration-progress-lifecycle.js`: PASS.
- `node scripts/verify-netease-migration-result-consistency.js`: PASS.
- `node scripts/verify-netease-asset-migration-bulk-library-write.js`: PASS.
- `node scripts/verify-netease-asset-migration-render-isolation.js`: PASS.
- `node scripts/verify-netease-account-menu-migration-running.js`: PASS.
- `npm.cmd run build:ts`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL because the worktree still contains accumulated multi-stage NetEase, UI-NEXT, playback, and library changes. Treat as review scope signal, not cleanup permission.

### Manual Test Request

After dev restart:

- Open the top-right NetEase avatar/account menu and start full asset migration.
- Confirm the migration modal shows `取消迁移` while running.
- Click cancel during fetching or before a later playlist write.
- Confirm the app remains responsive.
- Confirm already imported playlists/tracks remain.
- Confirm running migration again can continue/retry.
- Confirm the top-right menu still shows migration running state while active and stops after completion/cancel.

## Stage 41: NetEase Migration Progress Re-entry

### Target

Fix the UX gap after Stage 40: when full NetEase migration continues in the background and the modal has been closed/collapsed, the top-right account menu must let the user return to the active progress/cancel surface.

Scope:

- Do not touch playback, immersive player, local matching, or migration write semantics.
- Keep duplicate migration prevention.
- Change the running menu action from dead/disabled feedback to a real progress re-entry.

### Implementation Notes

- `NetEaseCloudMusic.showAssetMigrationProgressModal()` reopens the import modal.
- If migration is running, the modal shows a background-progress message, keeps `取消迁移` visible, and focuses the cancel button.
- `UINextMusicBoxAdapter.showActiveNetEaseMigration()` delegates to the NetEase widget and shows a fallback toast if the widget is unavailable.
- `NewMusicShell` passes `onShowNetEaseMigrationProgress` into `TopSearch`.
- `TopSearch` changes the running primary action to `查看迁移进度` and calls the progress re-entry handler instead of disabling the action.

### Verification Results

- `node scripts/verify-netease-migration-progress-reentry.js`: first RED, then PASS.
- `node scripts/verify-netease-migration-progress-lifecycle.js`: PASS after updating the Stage 40 guard to the new running-action behavior.
- `node scripts/verify-netease-account-menu-migration-running.js`: PASS after updating the guard from disabled-running action to progress re-entry.
- `node scripts/verify-netease-account-menu-render-stability.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL due to accumulated multi-stage dirty worktree. Stage 41 direct scope is top-right NetEase menu, UI-NEXT adapter, and the existing NetEase migration widget.

### Manual Test Request

After dev restart:

- Start full NetEase migration from the top-right account menu.
- Close/collapse the migration modal while migration is still running.
- Reopen the top-right account menu.
- Confirm the primary action says `查看迁移进度`.
- Click it and confirm the migration modal reopens.
- Confirm `取消迁移` is visible and usable.
- Confirm it does not start a duplicate migration.

## Stage 42: NetEase Cancelled Migration Dashboard State

### Target

After Stage 40/41 added cancellation, the migration dashboard must treat cancelled migrations as a first-class, understandable state instead of blending them into failure/skip noise.

Scope:

- Do not change migration write behavior.
- Do not change playback, immersive player, local matching, or sync retry behavior.
- Only update dashboard state aggregation, visible labels, and diagnostics.

### Implementation Notes

- `UINextMigrationDashboardState.summary` now includes `cancelledCount`.
- `buildMigrationDashboardState()` counts reports with `status === 'cancelled'`.
- `formatMigrationReportStatus()` maps `cancelled` to `已取消`.
- Migration diagnostics now include `取消报告 N 个`.
- Dashboard overview renders an `已取消` metric.
- Cancelled report rows get `is-cancelled` class and use `查看取消原因` / `收起取消原因` instead of failure wording.

### Verification Results

- `node scripts/verify-netease-migration-cancelled-dashboard.js`: first RED, then PASS.
- `node scripts/verify-netease-migration-dashboard.js`: PASS.
- `node scripts/verify-netease-migration-progress-lifecycle.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL due to accumulated dirty worktree. Stage 42 direct scope is UI-NEXT dashboard aggregation/rendering only.

### Manual Test Request

After dev restart:

- Start full NetEase migration.
- Cancel it from the migration modal.
- Open `迁移状态`.
- Confirm overview shows `已取消`.
- Confirm the cancelled report row status reads `已取消`.
- If a cancel reason is expandable, confirm the button says `查看取消原因`, not `查看失败原因`.

## Stage 42.1: UI Test Channel Diagnosis

### Finding

Windows `computer-use` is partially usable against the Auralux Electron window:

- `sky.list_apps()` finds the `Auralux` window.
- Accessibility text works and exposes the UI tree, including the NetEase account button and migration labels.
- Screenshot capture fails for this Electron window with `SetIsBorderRequired failed: 不支持此接口 (0x80004002)`.
- Coordinate clicks are not reliable because the tool requires a successful screenshot state before issuing coordinate input.

### Working Test Channel

Use Electron DevTools/CDP for Auralux UI automation when real UI verification is needed:

- Restart dev Electron with `--remote-debugging-port=9223`.
- Connect Playwright over CDP to `http://127.0.0.1:9223`.
- Operate UI through DOM events and query visible state.

Verified through CDP:

- App title is `Auralux`.
- `.mb-netease-account-trigger` exists.
- Trigger title shows `网易云：已登录`.
- Clicking the trigger opens `.mb-netease-menu`.
- Menu actions render: `迁移全部资产`, `重新登录`, `重试同步`, `迁移状态`, `复制诊断`.

### Rule For Next UI Tests

For Auralux/Electron UI tests, prefer CDP DOM automation over `computer-use` screenshot/coordinate automation. Keep `computer-use` only for accessibility text inspection or non-Electron windows unless screenshot capture starts working again.

## Stage 43: Real Account Migration Cancel Verification

### Target

Run the full NetEase asset migration/cancel path against the currently logged-in real account, then fix any real behavior gaps found during testing.

### Real Test Findings

First real-account run:

- Account state: `网易云：已登录`.
- Preflight dialog reported `准备迁移 5 个歌单，约 1009 首歌曲。是否开始？`.
- Duplicate migration was fast because the assets were already imported: result showed `歌单 5 个，新增 0 首，已存在 2018 首，跳过 0 首`.
- Immediate preflight cancel exposed a real gap:
  - The cancel button could be clicked during `正在预检网易云资产...`.
  - The confirm dialog still appeared afterwards.
  - UI showed `资产迁移已取消`, but the migration dashboard did not get a new cancelled report.

### Implementation Notes

- `NetEaseCloudMusic.prepareAssetMigrationPreflight()` now checks `assetMigrationCancelRequested` after preflight finishes and before showing the confirm dialog.
- Preflight cancellation records a visible `status: 'cancelled'` report with external id `asset-migration-cancelled`.
- `NetEaseAssetMigrationService.cancelledSummary()` now records an overall `[网易云] 资产迁移` cancelled report, so service-level cancellations also appear in the dashboard.

### Verification Results

- `node scripts/verify-netease-migration-preflight-cancel-report.js`: first RED, then PASS.
- `node scripts/verify-netease-migration-cancelled-dashboard.js`: PASS.
- `node scripts/verify-netease-migration-progress-lifecycle.js`: PASS.
- `node scripts/verify-netease-migration-result-consistency.js`: PASS.
- `node scripts/verify-netease-asset-migration-bulk-library-write.js`: PASS.
- `npm.cmd run typecheck:renderer`: PASS.
- `npm.cmd run build:renderer`: PASS.
- `npm.cmd run build:ts`: PASS.
- GitNexus `detect_changes({repo: "MusicBox", scope: "unstaged"})`: CRITICAL due to accumulated dirty worktree; Stage 43 direct high-risk area is `NetEaseCloudMusic`, with change limited to migration preflight/cancel/reporting.

### Real Retest Results

Retest through CDP/DOM automation with logged-in account:

- Clicked `迁移全部资产`.
- Clicked `取消迁移` during `正在预检网易云资产...`.
- No confirm dialog appeared after cancellation.
- Final modal progress: `已取消网易云资产迁移`.
- Opened `迁移状态`.
- Dashboard overview showed `2已取消`.
- Latest reports include `[网易云] 资产迁移 ... 已取消`.
- Cancelled report rows have class `is-cancelled`.
- Cancelled report action text is `查看取消原因`.

### Status

Stage 43 is complete. The real-account cancellation loop is now verified end-to-end.
