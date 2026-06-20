# NetEase Loyal User Migration Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans before turning any roadmap phase into an implementation plan. This file is the product roadmap and priority contract, not an execution checklist.

**Goal:** Make Auralux convincing enough for long-time NetEase Cloud Music users to move their daily music library and keep using Auralux as the primary player.

**Product Direction:** Do not add lyric translation or side-by-side lyric comparison in this roadmap. The playback page direction is daily primary-player reliability: resume, queue memory, favorite actions, cache state, source state, and clearer lyric reliability.

**Scope Boundary:** Preserve the immersive playback page's current visual quality. Performance and state improvements must not flatten the player, remove visual depth, or weaken the current listening atmosphere.

---

## P0: Make Users Feel "This Is My Music Library"

### 1. NetEase Account Center

Show account identity and sync confidence directly in the UI-NEXT sidebar/account area.

- Avatar and nickname.
- Account login state.
- Favorite count and playlist count.
- Last sync time.
- Sync success or failure state.
- Retry entry for failed account/sync actions.

Primary code areas:

- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/components/Sidebar.js`
- `src/renderer/src/features/netease/service/NetEaseAuthService.ts`

Current status:

- Basic avatar, nickname, login state, sync status, last sync time, and retry entry are implemented.
- Next pass should enrich counts and sync details.

### 2. Complete Asset Migration

Treat migration like moving a user's music home, not importing a file.

- Liked songs.
- Favorite playlists.
- Created playlists.
- Recent plays.
- Playlist covers.
- Duplicate handling.
- Import progress.
- Failure list with reasons.

Primary code areas:

- `src/renderer/src/features/netease/service/NetEasePlaylistImportService.ts`
- `src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts`
- `src/renderer/src/features/library/service/LibraryDataService.ts`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`

Acceptance checks:

- A user can see what was imported, skipped, duplicated, failed, and retryable.
- Local user data is not overwritten without a clear conflict path.

### 3. Trusted Sync

Make users trust that Auralux will not lose or silently overwrite their library.

- Last successful sync time.
- Per-playlist sync state.
- Failure reason.
- Retry mechanism.
- Conflict prompt.
- Local data protection before cloud overwrite.

Acceptance checks:

- Sync failures are visible and explainable.
- Retry never duplicates already imported tracks.
- Conflict handling protects existing local playlists.

### 4. First-Run Migration Onboarding

Make the first product experience feel like a guided move into Auralux.

- First launch explains what Auralux can migrate from NetEase.
- User can choose login now, skip login, or import local music first.
- Migration preview shows which assets will be imported.
- Clear statement that local playlists and library data will not be overwritten silently.
- Migration result page shows imported, skipped, duplicated, failed, and retryable items.

Acceptance checks:

- A new user understands what will happen before starting migration.
- Skipping login still leaves the app usable as a local player.
- Failed migration does not leave the user stuck on an onboarding screen.

### 5. Login Reliability

Make QR and session login dependable before expanding more NetEase features.

- QR key request state.
- QR polling state.
- Phone-confirmed state refresh.
- Cookie/session persistence.
- Login expiration prompt.
- Account info retry when `/user/account` fails.
- NetEase API unavailable fallback state.

Acceptance checks:

- After phone confirmation, the desktop UI refreshes account state without requiring a manual restart.
- Login expiration is visible and actionable.
- API startup failure shows a degraded state instead of a misleading success message.

### 6. Migration Safety, Rollback, and Idempotency

Protect user trust by making migration reversible and repeatable.

- Snapshot local library and playlists before import.
- Do not commit partially failed imports as if they fully succeeded.
- One-click undo for the latest migration batch.
- Repeat imports are idempotent and do not duplicate tracks.
- Local playlists are protected from cloud overwrite unless the user accepts a conflict resolution.
- Migration reports remain viewable after closing the import dialog.

Acceptance checks:

- Running the same import twice does not duplicate the same tracks.
- A failed import can be retried or undone.
- A user can inspect what changed after migration.

### 7. Local Matching Algorithm

Match NetEase tracks to local files so imported assets become useful offline where possible.

- Match by title, artist, album, duration, and normalized text.
- Optional future file fingerprinting for stronger confidence.
- Confidence score for each match.
- Manual correction for bad matches.
- Distinguish matched, cloud-only, missing, and conflict states.

Acceptance checks:

- The UI can explain why a NetEase track is considered matched or unmatched.
- A user can fix an incorrect match without editing raw files.
- Offline filters use the matching state, not guesswork.

---

## P1: Make It Smoother Than NetEase

### 8. Search Experience Upgrade

Improve search speed, clarity, and direct action.

- Search history.
- Fuzzy autocomplete.
- Local/NetEase source badges.
- Filters for song, artist, album, and playlist.
- Direct play, favorite, and add-to-playlist actions from results.

Acceptance checks:

- A user can search and act on a result without opening a secondary page.
- Mixed local/cloud results are visually distinguishable.

### 9. Daily Primary-Player Playback Feel

Do not build lyric translation or lyric comparison. Improve the behaviors that make the player feel dependable every day.

- Continue playback.
- Playback queue memory.
- One-click favorite/unfavorite.
- Current song source badge.
- Cache hit indicator.
- Clearer lyric loading state.
- Retry/rematch entry when lyrics are missing or mismatched.

Primary code areas:

- `src/renderer/src/features/playback/**`
- `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- `src/renderer/ui-next-static/NewMusicShell.js`
- `src/renderer/ui-next-static/styles.css`

Acceptance checks:

- Restarting the app restores a sensible queue and playback context.
- Favorite state is visible and can be changed in one action.
- Lyrics show loading, missing, error, and retry states clearly.

### 10. Offline Ability

Show what can be used without a network and what still depends on NetEase.

- Cached song badge.
- Cover cache state.
- Lyric cache state.
- Offline-playable filter.
- Local matching state for NetEase-imported tracks.

Acceptance checks:

- Users can identify what will play offline before losing network access.
- Imported NetEase tracks show whether they are locally matched or cloud-only.

### 11. Startup Warmup and Loading Experience

Use the startup animation as useful work time instead of showing a blank wait.

- Start NetEase API availability checks during startup.
- Load library cache.
- Load playlist cover manifest.
- Preload stable cover metadata without refetching every playlist.
- Load lyric cache index.
- Check account login state.
- Continue into UI-NEXT even if cloud checks fail.

Acceptance checks:

- Startup status communicates progress without exposing internal jargon.
- NetEase API delay does not block the app indefinitely.
- The main UI opens with cache-backed data ready where possible.

### 12. Performance and Cache System

Improve speed without lowering the playback page's visual quality.

- Cover cache keys are stable.
- Playlist cover fetches use in-flight de-duplication.
- Cover and lyric caches have explicit freshness rules.
- Startup preloads low-risk metadata once instead of refetching on every view entry.
- Network requests use concurrency limits and retry backoff.
- Stale cached data can be shown while refreshing in the background.
- Playback page visual effects keep their current quality; optimizations should target unnecessary work, not visual downgrade.

Acceptance checks:

- Opening the same playlist repeatedly does not refetch every cover.
- Cached covers and lyrics show immediately when available.
- Performance improvements do not remove immersive playback visuals.

### 13. Migration Dashboard

Give users a durable place to inspect migration and sync status.

- Overall migration progress.
- Separate status for liked songs, favorite playlists, created playlists, and recent plays.
- Imported count.
- Skipped duplicate count.
- Failed count.
- Items needing user action.
- Retry entry per failed group.

Acceptance checks:

- A user can answer "what happened to my NetEase library?" without reading logs.
- The dashboard remains useful after the first migration, not only during import.

---

## P2: Trust, Status, and Detail Polish

### 14. Settings Localization and State Feedback

Keep settings readable, localized, and honest about cloud features.

- All user-visible settings English translated to Chinese.
- Buttons, titles, descriptions, dialogs, and toast text unified in Chinese.
- Dangerous actions use clear danger styling.
- Long Chinese text wraps without overflow.
- Cloud features, sync failures, and NetEase-origin content are visible.

Current status:

- Main settings Chinese localization and danger styling are implemented.
- Future passes should keep checking newly added settings copy.

### 15. NetEase Source Identity System

Make cloud/local state visible across library, search, playlists, and sync.

- Which playlists came from NetEase.
- Which tracks are locally matched.
- Which tracks are cloud-only.
- Which items failed sync.
- Which items need user action.

Acceptance checks:

- A user can tell the origin and availability of playlists/tracks without opening logs.
- Sync problems are visible in normal product surfaces, not only developer output.

### 16. Old UI and Compatibility Cleanup

Remove old UI code only after UI-NEXT owns or replaces each reused surface.

- Migrate UI-NEXT off old dialogs/widgets one at a time.
- Keep plugin-facing compatibility until an explicit replacement exists.
- Do not delete `MusicBoxApp` runtime while extension APIs still depend on it.
- Keep a deletion map for immediate deletion, migrate-first, and compatibility-deferred files.

Acceptance checks:

- Typecheck and renderer build pass after every deletion slice.
- GitNexus impact is run before editing runtime symbols.
- UI-NEXT still supports playlist dialogs, NetEase login/import, plugin manager, and network disk after each cleanup pass.

### 17. Settings Schema Cleanup

Clean obsolete settings safely after page and feature removals.

- Remove retired options such as old artists/albums page toggles only in a dedicated pass.
- Migrate old user settings to the new schema.
- Preserve unknown settings until their owner is understood.
- Keep defaults stable for existing users.

Acceptance checks:

- Existing settings files load without runtime errors.
- Removed fields do not reappear in user-facing settings.
- `MusicBoxSettings` changes have a GitNexus impact report because it is a shared hub.

### 18. Release Quality, Branding, and Compliance

Prepare the product for external distribution without losing upstream attribution.

- Validate Windows taskbar/window/installer icon behavior.
- Check packaged app branding and app ID.
- Keep MusicBox MIT license attribution.
- Keep NeteaseCloudMusicApi third-party notice.
- Avoid claiming official NetEase affiliation.
- Maintain release smoke-test checklist.
- Use isolated test config for packaged-app verification.

Acceptance checks:

- README, NOTICE, LICENSE, package metadata, and icons are consistent.
- Packaged app launches and shows Auralux branding.
- Third-party API and upstream attribution are visible and accurate.

### 19. Diagnostics and Observability

Make failures debuggable for both developers and users.

- Login failure logs include state and endpoint, with secrets redacted.
- Import failures include playlist/track identifiers and reason.
- Sync failures are grouped by retryability.
- User-facing diagnostics can be copied without exposing cookies.
- Dev and release logging levels are separated.

Acceptance checks:

- A user can report a failed login/import with useful diagnostic text.
- Logs never print raw cookies or tokens.
- Developer logs map to visible UI failure states.

### 20. Verification Matrix

Make "tested" mean the same thing every phase.

- Each implementation phase defines automated checks.
- Each UI phase defines manual checks for the user.
- Every stage that changes symbols runs GitNexus impact before edits.
- Every commit candidate runs GitNexus `detect_changes()`.
- Every runtime-facing stage restarts the dev app.
- Assistant should ask the user to manually test product flows instead of pretending to click them when manual confirmation is required.

Acceptance checks:

- Progress log records commands, results, risk, and manual checks.
- No stage is marked complete from assumptions alone.
- Verification scope is clear before implementation starts.

---

## First Three Implementation Targets

1. NetEase account center completion: counts, status, last sync, retry.
2. Complete migration of liked songs, favorite playlists, created playlists, and recent plays.
3. Trusted sync: per-playlist state, failure retry, conflict protection.

## Suggested Next Engineering Stages

1. Settings schema cleanup for retired artists/albums/statistics page settings.
2. Login reliability hardening for QR confirmation, session persistence, and account refresh.
3. Migration safety and dashboard foundation.
4. Complete asset migration.
5. Trusted sync and conflict protection.
6. Search upgrade.
7. Playback daily-use state: resume, queue memory, favorite, cache/source badges.
8. Offline and local matching.
9. Performance/cache system expansion.
10. UI-NEXT old component migration and old runtime cleanup.
11. Release quality and compliance.
12. Diagnostics and verification matrix.

## Explicit Non-Goals

- No lyric translation.
- No side-by-side lyric comparison.
- No playback page visual downgrade.
- No broad deletion of old UI runtime before UI-NEXT stops reusing old dialogs/widgets.
- No shared settings schema cleanup without a dedicated GitNexus impact pass.
