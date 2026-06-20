const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const controllerPath = path.join(root, 'src', 'renderer', 'src', 'ui', 'widgets', 'player', 'PlayerCoverInteractionController.ts');
const playerPath = path.join(root, 'src', 'renderer', 'src', 'ui', 'widgets', 'Player.ts');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const controller = read(controllerPath);
const player = read(playerPath);

assertContains(controller, 'onOpenImmersivePlayer: () => boolean | void;', 'immersive callback option');
assertContains(controller, 'private readonly onOpenImmersivePlayer: () => boolean | void;', 'immersive callback field');
assertContains(controller, 'this.onOpenImmersivePlayer = options.onOpenImmersivePlayer;', 'immersive callback assignment');
assertContains(controller, 'if (this.onOpenImmersivePlayer()) return;', 'cover click opens immersive before lyrics fallback');
assertContains(player, 'onOpenImmersivePlayer: () => this.openUINextImmersivePlayer()', 'player wires legacy cover to UI-NEXT immersive');
assertContains(player, "this.addEventListenerManaged(document, 'click', this.handleLegacyCoverCaptureClick, {capture: true});", 'document capture guard for playing-state cover clicks');
assertContains(player, 'private readonly handleLegacyCoverCaptureClick = (event: Event): void =>', 'capture click handler');
assertContains(player, "target.closest('#player .track-cover-container')", 'capture handler targets legacy player cover');
assertContains(player, 'this.isLegacyCoverClick(event, target)', 'capture handler uses coordinate-aware cover detection');
assertContains(player, 'private isLegacyCoverClick(event: Event, target: Element): boolean', 'coordinate-aware cover detection helper');
assertContains(player, "document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY)", 'click probe records hit-tested DOM');
assertContains(player, '__auraluxLastPlayerClickProbe', 'last player click runtime probe');
assertContains(player, "document.querySelector<HTMLElement>('#player .playing .container')", 'left playing container participates in hit testing');
assertContains(player, "target.closest('#player .like-button, #player #like-btn')", 'like button is excluded from immersive hotzone');
assertContains(player, 'blockedByAction', 'click probe records action exclusion');
assertContains(player, 'coverHotZoneRight', 'legacy left cover hotzone is wider than the exact image element');
assertContains(player, "matchedBy = 'playing-cover-hotzone'", 'left-bottom cover hotzone opens immersive when image element is not the event target');
assertContains(player, 'event.stopPropagation();', 'capture handler stops old lyrics fallback after immersive opens');
assertContains(player, 'private openUINextImmersivePlayer(): boolean', 'legacy player immersive helper');
assertContains(player, "const shellApi = (window as any).__newShell;", 'helper uses real UI-NEXT shell global');
assertContains(player, "if (shellApi && typeof shellApi.onOpenImmersivePlayer === 'function')", 'helper calls UI-NEXT shell directly first');
assertContains(player, "shellApi.onOpenImmersivePlayer();", 'direct shell immersive call');
assertContains(player, "document.querySelector<HTMLElement>('.ui-next-shell .mb-player__cover-btn')", 'helper clicks UI-NEXT playerbar cover as fallback');
assertContains(player, "__auraluxLegacyCoverEntryProbe", 'legacy cover runtime probe');

console.log('legacy player cover immersive entry guard passed');
