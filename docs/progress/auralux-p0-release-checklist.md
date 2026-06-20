# Auralux P0 Release Checklist

This checklist is the current release-blocking validation set for Auralux. Run the automated gates first, then ask the user to complete the manual checks on the real desktop app.

## Automated Gates

Run from the repository root:

```bash
node scripts/verify-auralux-license-docs.js
node scripts/verify-auralux-stage35-quality-gate.js
npm.cmd run typecheck:renderer
npm.cmd run build:renderer
```

Before committing or publishing a development snapshot, also run GitNexus:

```text
detect_changes({repo: "MusicBox", scope: "staged"})
```

## Manual App Smoke Test

Use a real dev app restart. Do not rely only on stale windows.

- App starts into UI-NEXT and does not stay on the startup splash.
- Window title, top-left logo, favicon/window icon, and taskbar icon show Auralux branding.
- Settings page visible user copy is Chinese and does not overflow.
- Bottom player bar can play, pause, seek, change volume, and open immersive playback.
- Clicking the bottom cover enters immersive playback while a track is playing.
- Immersive playback can return to the main UI.
- `笼中鸟` playback remains stable during the prelude: no pickup-bar flicker loop, no lyric jump loop, controls remain responsive.
- Playback/seek bar clicks do not jump directly to the end.

## NetEase Account And Migration

Use a logged-in personal NetEase account.

- Right-top avatar-only NetEase status control opens the account menu.
- Login/relogin action opens the NetEase login flow when needed.
- Account menu shows avatar, nickname/status, sync status, and asset counts.
- Complete asset migration starts from the account menu.
- While migration is running, the migration action is visibly disabled/running and cannot double-trigger.
- Migration progress/result remains visible in the import/migration surface.
- Failed migration items are visible enough for diagnosis.
- Copy diagnostics works or shows the manual-copy fallback.

## Playlist And Data Safety

- Local playlist create/rename/delete does not freeze the UI.
- Imported NetEase playlist delete removes only the local imported playlist and does not imply cloud deletion.
- NetEase imported playlist right-click actions show clear Chinese confirmation text.
- Large playlist actions show loading/disabled state and avoid repeated clicks.
- Existing local library data is not overwritten by NetEase sync without a conflict/protection prompt.

## Cache And Offline Signals

- Playlist cover cache does not visibly refetch every cover on each playlist entry.
- Cached cover/lyrics/offline status labels are understandable.
- NetEase-origin tracks show local-match/cloud-only/conflict state where available.
- Startup warmup does not block indefinitely if NetEase API or cache preload degrades.

## Repository And Release Hygiene

- Keep runtime logs out of commits unless explicitly needed as evidence.
- Do not reset, clean, or delete user/runtime artifacts without explicit approval.
- Keep original `LICENSE` MIT notice for MusicBox/asxez.
- Keep `NOTICE.md` and `AURALUX_LICENSE.md` with the layered license model.
- Do not describe Auralux as an entirely MIT-licensed open-source project; use source-available for Auralux-specific modifications.
