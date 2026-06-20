const {spawnSync} = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

const checks = [
  ['node', ['scripts/verify-ui-next-stage35-fallback-copy.js']],
  ['node', ['scripts/verify-stage36-visible-copy-cleanup.js']],
  ['node', ['scripts/verify-settings-ui-chinese.js']],
  ['node', ['scripts/verify-no-legacy-artist-album-statistics.js']],
  ['node', ['scripts/verify-ui-next-formalized.js']],
  ['node', ['scripts/verify-renderer-vite-html-output.js']],
  ['node', ['scripts/verify-startup-splash-exit.js']],
  ['node', ['scripts/verify-startup-warmup.js']],
  ['node', ['scripts/verify-cover-cache-manifest.js']],
  ['node', ['scripts/verify-cache-system-expansion.js']],
  ['node', ['scripts/verify-playback-state-restore.js']],
  ['node', ['scripts/verify-playback-queue-persistence.js']],
  ['node', ['scripts/verify-playback-lyrics-reliability.js']],
  ['node', ['scripts/verify-playerbar-immersive-entry.js']],
  ['node', ['scripts/verify-immersive-player-playing-entry.js']],
  ['node', ['scripts/verify-immersive-seek-ratio.js']],
  ['node', ['scripts/verify-immersive-lyrics-refresh-target.js']],
  ['node', ['scripts/verify-immersive-prelude-lyrics-stability.js']],
  ['node', ['scripts/verify-immersive-visualizer-stability.js']],
  ['node', ['scripts/verify-netease-api-late-ready-recovery.js']],
  ['node', ['scripts/verify-netease-qr-login.js']],
  ['node', ['scripts/verify-netease-login-diagnostics.js']],
  ['node', ['scripts/verify-netease-qr-confirmation-finalization.js']],
  ['node', ['scripts/verify-netease-qr-diagnostics-copy.js']],
  ['node', ['scripts/verify-netease-account-menu-topbar.js']],
  ['node', ['scripts/verify-netease-account-menu-asset-migration.js']],
  ['node', ['scripts/verify-netease-account-menu-migration-running.js']],
  ['node', ['scripts/verify-netease-asset-migration-preflight.js']],
  ['node', ['scripts/verify-netease-asset-migration-progress-throttle.js']],
  ['node', ['scripts/verify-netease-asset-migration.js']],
  ['node', ['scripts/verify-netease-limited-stream-playback-guards.js']],
  ['node', ['scripts/verify-netease-search-experience.js']],
  ['node', ['scripts/verify-netease-trusted-sync.js']],
  ['node', ['scripts/verify-netease-local-matching.js']],
  ['node', ['scripts/verify-netease-local-match-correction.js']],
  ['node', ['scripts/verify-netease-matched-local-playback.js']],
  ['node', ['scripts/verify-offline-status.js']],
  ['node', ['--check', 'src/renderer/ui-next-static/NewMusicShell.js']],
  ['node', ['--check', 'src/renderer/ui-next-static/components/ImmersivePlayerView.js']],
  ['node', ['--check', 'src/renderer/ui-next-static/components/TopSearch.js']],
  ['node', ['--check', 'src/renderer/ui-next-static/components/Sidebar.js']],
  ['node', ['--check', 'src/renderer/ui-next-static/components/PlayerBar.js']]
];

for (const [command, args] of checks) {
  const label = [command, ...args].join(' ');
  process.stdout.write(`[stage35] ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`Stage 35 quality gate failed: ${label}`);
  }
}

console.log('verify-auralux-stage35-quality-gate: ok');
