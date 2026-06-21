# Stage 37 NetEase Migration Render Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent complete NetEase asset migration state changes from triggering full UI-NEXT shell renders that make the top-right avatar menu flicker or feel unresponsive.

**Architecture:** Keep the existing full render path for normal navigation and menu open/close. Add a focused NetEase account subtree refresh for migration running-state changes, and add an adapter-level in-flight guard so duplicate migration clicks do not start a second migration.

**Tech Stack:** Electron renderer, TypeScript adapter, UI-NEXT static JavaScript shell, focused Node verification scripts.

## Global Constraints

- Do not touch playback core, immersive player visuals, local-song matching, or old UI runtime behavior.
- Source edits use `apply_patch`.
- Runtime logs remain uncommitted and are not cleaned.
- Verify with focused scripts, renderer typecheck, renderer build, and a real dev restart.

---

### Task 1: Add Focused Regression Guard

**Files:**
- Create: `scripts/verify-netease-asset-migration-render-isolation.js`

**Interfaces:**
- Consumes: `UINextMusicBoxAdapter.migrateAllNetEaseAssets()`, `NewMusicShell.renderNetEaseAccountStatus()`.
- Produces: A focused gate that fails unless migration running-state changes avoid full shell renders and duplicate migration clicks are blocked.

- [x] **Step 1: Write the failing verification script**

Run: `node scripts/verify-netease-asset-migration-render-isolation.js`

Expected before implementation: FAIL with missing in-flight guard, focused render method, and direct full-render checks.

### Task 2: Implement Migration Render Isolation

**Files:**
- Modify: `src/renderer/src/ui-next/UINextMusicBoxAdapter.ts`
- Modify: `src/renderer/ui-next-static/NewMusicShell.js`

**Interfaces:**
- Produces: `private setNetEaseAssetMigrationRunning(running: boolean): void`
- Produces: `NewMusicShell.prototype.renderNetEaseAccountStatus()`

- [ ] **Step 1: Add the adapter guard**

`migrateAllNetEaseAssets()` returns early with a Chinese toast when `netEaseAssetMigrationInFlight` is already true.

- [ ] **Step 2: Add focused running-state updates**

`setNetEaseAssetMigrationRunning()` updates `shell.state.neteaseAssetMigrationRunning` and calls `shell.renderNetEaseAccountStatus()` when available, falling back to `shell.render()`.

- [ ] **Step 3: Add focused account subtree rendering**

`renderNetEaseAccountStatus()` builds a temporary `TopSearch`, extracts `.mb-netease-account`, and swaps only the existing account subtree.

- [ ] **Step 4: Verify**

Run:

```bash
node scripts/verify-netease-asset-migration-render-isolation.js
node scripts/verify-netease-account-menu-render-stability.js
node scripts/verify-netease-account-menu-migration-running.js
node --check src/renderer/ui-next-static/NewMusicShell.js
npm.cmd run typecheck:renderer
npm.cmd run build:renderer
```

Expected: all commands pass.

### Task 3: Document and Restart

**Files:**
- Modify: `docs/progress/auralux-next-stage.md`

**Interfaces:**
- Produces: Stage 37 progress log with changed files, verification results, and manual test request.

- [ ] **Step 1: Append Stage 37 progress**

Record the render-isolation scope and verification commands.

- [ ] **Step 2: Restart the dev app**

Stop old MusicBox/Auralux Electron/Node processes, then run `npm.cmd run dev` without `AURALUX_DISABLE_HARDWARE_ACCELERATION`.

Manual test request: start complete migration, click outside the migration modal, open the top-right avatar menu, and confirm the menu opens without flicker or duplicate migration.
