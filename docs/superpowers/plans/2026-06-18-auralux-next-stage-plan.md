# Auralux Next Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make UI-NEXT the verified primary Auralux shell with Chinese settings, startup warmup, cover cache performance, NetEase account presence, and an evidence-based old UI cleanup plan.

**Architecture:** Work proceeds in six verified stages. Each stage starts with GitNexus impact analysis for symbols that will be edited, uses scripts or focused checks where possible, updates `docs/progress/auralux-next-stage.md`, runs builds/typechecks, and ends with GitNexus `detect_changes`. Generated `src/renderer/public/**` files are produced only by build commands.

**Tech Stack:** Electron, Vite renderer, TypeScript, UI-NEXT static JavaScript/CSS, GitNexus MCP, Superpowers workflow, existing NetEase and settings services.

---

## File Structure

- Create: `docs/progress/auralux-next-stage.md`
  - Ongoing stage log with commands, results, risks, and next steps.
- Create: `scripts/verify-settings-ui-chinese.js`
  - Guard against known visible English settings strings.
- Create: `scripts/verify-ui-next-formalized.js`
  - Guard against user-facing old UI switch paths.
- Create: `scripts/verify-cover-cache-manifest.js`
  - Guard for cover cache manifest behavior after Stage 4.
- Modify: `src/renderer/ui-next-static/NewMusicShell.js`
  - Settings text, old UI action removal, and possible startup state handoff.
- Modify: `src/renderer/ui-next-static/styles.css`
  - Settings wrapping, danger action styling, and startup page styling.
- Modify: `src/renderer/src/ui-next/bootstrap.ts`
  - UI-NEXT formalization and startup warmup orchestration.
- Modify: `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
  - Settings data, startup warmup hooks, cover cache hooks, and NetEase account state.
- Modify: `src/renderer/src/features/settings/service/*.ts`
  - User-facing Chinese toasts/dialogs/status text.
- Modify or create focused files under `src/renderer/src/features/mediaAssets/service/`
  - Cover cache manifest and request de-duplication.
- Modify or create focused files under `src/renderer/src/features/netease/service/`
  - Account profile and sync status support.

## Stage 0: Current State and Documentation Baseline

- [ ] **Step 1: Read required project docs**

Run:

```bash
Get-Content -Raw AGENTS.md
Get-Content -Raw CODEX_HANDOFF.md
Get-ChildItem docs/superpowers/plans -Force
git status --short
```

Expected: files are readable, worktree is dirty, no destructive command is used.

- [ ] **Step 2: Create progress log skeleton**

Create `docs/progress/auralux-next-stage.md` with sections for Stage 0 through Stage 6 and Final Review.

- [ ] **Step 3: Record current dirty baseline**

Append the current branch and `git status --short` output summary to the progress log.

## Stage 1: Settings UI Chinese Localization and Readability

- [ ] **Step 1: Run impact analysis before editing settings symbols**

Run GitNexus impact for:

```text
impact({repo: "MusicBox", target: "NewMusicShell", file_path: "src/renderer/ui-next-static/NewMusicShell.js", kind: "Function", direction: "upstream"})
impact({repo: "MusicBox", target: "UINextMusicBoxAdapter", file_path: "src/renderer/src/ui-next/UINextMusicBoxAdapter.ts", kind: "Class", direction: "upstream"})
impact({repo: "MusicBox", target: "ShortcutDialogService", file_path: "src/renderer/src/features/settings/service/ShortcutDialogService.ts", kind: "Class", direction: "upstream"})
impact({repo: "MusicBox", target: "SettingsToolsController", file_path: "src/renderer/src/features/settings/service/SettingsToolsController.ts", kind: "Class", direction: "upstream"})
```

Expected: risk is below HIGH before proceeding.

- [ ] **Step 2: Write failing settings Chinese guard**

Create `scripts/verify-settings-ui-chinese.js` to scan the source settings files for known visible English strings such as `Show track covers`, `Audio engine`, `Library folders`, `Lyrics and cache`, `Desktop display mode`, `Network drive`, `Plugin manager`, and `Check updates`.

- [ ] **Step 3: Verify the guard fails before localization**

Run:

```bash
node scripts/verify-settings-ui-chinese.js
```

Expected: exit code 1 with a list of existing visible English strings.

- [ ] **Step 4: Localize UI-NEXT settings text**

Modify `src/renderer/ui-next-static/NewMusicShell.js` only for visible settings strings. Keep keys such as `showTrackCovers`, `gaplessPlayback`, and `desktopLyricsDisplayMode` unchanged.

- [ ] **Step 5: Localize settings service feedback**

Modify settings service files so user-visible shortcut, cache, directory, and confirmation text is normal Chinese, not corrupted Chinese.

- [ ] **Step 6: Add readability styling**

Modify `src/renderer/ui-next-static/styles.css` to add danger styling for destructive setting actions and `overflow-wrap` for long settings labels/buttons.

- [ ] **Step 7: Verify Stage 1**

Run:

```bash
node scripts/verify-settings-ui-chinese.js
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Expected: all commands exit 0.

- [ ] **Step 8: Run GitNexus detect changes and update progress log**

Run:

```text
detect_changes({repo: "MusicBox", scope: "unstaged"})
```

Record changed files, risk, verification output, and next step in `docs/progress/auralux-next-stage.md`.

## Stage 2: UI-NEXT Formalization

- [ ] **Step 1: Run impact analysis before editing startup symbols**

Run GitNexus impact for `bootstrap`, `shouldUseLegacyUI`, `shouldEnableUINext`, and `NewMusicShell` with file path disambiguation.

- [ ] **Step 2: Write failing UI-NEXT formalization guard**

Create `scripts/verify-ui-next-formalized.js` that fails when user-facing source still contains `__disableMusicBoxUINext`, old UI action text, or active `legacy-ui` switching logic in runtime source.

- [ ] **Step 3: Verify the guard fails before formalization**

Run:

```bash
node scripts/verify-ui-next-formalized.js
```

Expected: exit code 1 before edits.

- [ ] **Step 4: Remove old UI user switch paths**

Remove the return-to-old-UI action from `NewMusicShell.js`, remove the disable function from `ui-next/bootstrap.ts`, and make `app/bootstrap/main.ts` always mount UI-NEXT for normal startup while preserving old code only if needed as non-user-facing deferred code.

- [ ] **Step 5: Verify Stage 2**

Run:

```bash
node scripts/verify-ui-next-formalized.js
rg -n "legacy-ui|legacyui|__disableMusicBoxUINext|返回旧界面" src/renderer/src src/renderer/ui-next-static
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Expected: guard exits 0; `rg` has no user-facing runtime matches except allowlisted audit text if any; builds pass.

- [ ] **Step 6: Run GitNexus detect changes and update progress log**

Record command output and remaining old UI dependencies.

## Stage 3: Dynamic Startup Page and Background Warmup

- [ ] **Step 1: Run impact analysis for startup and adapter symbols**

Run impact for `mountUINext`, `UINextMusicBoxAdapter`, and any new warmup coordinator symbol before editing.

- [ ] **Step 2: Add startup verification script or focused checks**

Add a script or deterministic check that verifies startup task definitions include minimum display time, maximum wait time, NetEase degraded handling, and background continuation.

- [ ] **Step 3: Implement startup model**

Add a focused startup coordinator that reports statuses for settings, library, queue, NetEase, cover cache, lyric cache, and sync checks.

- [ ] **Step 4: Implement dynamic startup UI**

Add UI-NEXT startup screen styling and status rendering without changing playback page visuals.

- [ ] **Step 5: Verify Stage 3**

Run:

```bash
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Then restart dev app and record startup logs. Ask user to manually confirm the startup page.

- [ ] **Step 6: Run GitNexus detect changes and update progress log**

Record verification and remaining startup risks.

## Stage 4: Cover Cache Manifest and Fetch Deduplication

- [ ] **Step 1: Explore current cover cache flow with GitNexus**

Use `query({repo: "MusicBox", query: "cover cache lookup playlist cover"})` and context on the selected cover service symbols.

- [ ] **Step 2: Run impact analysis for cover symbols**

Run impact for the specific cover lookup/update classes before editing.

- [ ] **Step 3: Write failing cover cache verification**

Create `scripts/verify-cover-cache-manifest.js` or a focused unit script that proves repeated access to the same cover source uses manifest/de-duplication rather than repeated full fetch.

- [ ] **Step 4: Implement manifest and de-duplication**

Implement stable cache keys, manifest load/save, in-flight request de-duplication, concurrency limiting, and retry backoff in focused service files.

- [ ] **Step 5: Verify Stage 4**

Run:

```bash
node scripts/verify-cover-cache-manifest.js
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Restart dev app and ask user to open the same playlist twice while logs prove no repeated full cover fetch.

- [ ] **Step 6: Run GitNexus detect changes and update progress log**

Record evidence.

## Stage 5: NetEase Account Center

- [ ] **Step 1: Run impact analysis for NetEase account symbols**

Run impact for `NetEaseAuthService`, `UINextMusicBoxAdapter`, and the UI-NEXT sidebar/account rendering symbol before editing.

- [ ] **Step 2: Add account state verification**

Add a deterministic script or renderer-level check for logged-out, logged-in, and failure account states.

- [ ] **Step 3: Implement account center state**

Expose avatar, nickname, login state, last sync time, sync state, and retry action to UI-NEXT. Preserve existing avatar behavior.

- [ ] **Step 4: Verify Stage 5**

Run the account verification, typecheck, renderer build, main build, and dev app restart. Ask user to manually test logged-in and logged-out states.

- [ ] **Step 5: Run GitNexus detect changes and update progress log**

Record evidence.

## Stage 6: Old UI Source Audit and Deletion Plan

- [ ] **Step 1: Gather references**

Run:

```bash
rg -n "@ui/pages|@ui/widgets|@ui/modals|@ui/dialogs|legacy-ui|legacyui|ComponentRegistry|MusicBoxApp" src/renderer/src src/renderer/ui-next-static
rg --files src/renderer/src/ui
```

- [ ] **Step 2: Classify old UI files**

Write three lists into `docs/progress/auralux-next-stage.md`:

- Safe to delete now.
- Still reused by UI-NEXT and must be migrated first.
- Still required by plugin/API/compatibility and deferred.

- [ ] **Step 3: Verify Stage 6**

Run:

```bash
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Run GitNexus `detect_changes` and record results.

## Final Review

- [ ] **Step 1: Run all stage guard scripts**

Run every script created in `scripts/verify-*.js` relevant to this work.

- [ ] **Step 2: Run full required checks**

Run:

```bash
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

- [ ] **Step 3: Restart dev app**

Run `npm run dev`, leave the app running, and ask the user to manually test UI-NEXT settings, startup, NetEase account state, and playlist cover behavior.

- [ ] **Step 4: Final GitNexus detect changes**

Run `detect_changes({repo: "MusicBox", scope: "unstaged"})` and record the final risk summary.

- [ ] **Step 5: Stop**

Do not commit. Report progress log path, verification evidence, and any remaining manual checks.
