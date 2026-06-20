(function (global) {
  'use strict';

  var h = MBUtil.h;
  var clear = MBUtil.clear;
  var debounce = MBUtil.debounce;
  var clamp = MBUtil.clamp;

  var Sidebar = global.MBSidebar;
  var TopSearch = global.MBTopSearch;
  var HomeView = global.MBHomeView;
  var PlaylistView = global.MBPlaylistView;
  var SearchResultsView = global.MBSearchResultsView;
  var PlayerBar = global.MBPlayerBar;
  var QueuePanel = global.MBQueuePanel;
  var ImmersivePlayerView = global.MBImmersivePlayerView;
  var ImmersivePerfProbe = global.MBImmersivePerfProbe;

  function NewMusicShell(opts) {
    this.el = document.querySelector(opts.el);
    if (!this.el) throw new Error('鏂扮晫闈㈡寕杞界偣涓嶅瓨鍦? ' + opts.el);

    var M = opts.mockData || global.MusicBoxMock;
    if (!M) throw new Error('鏈彁渚?UI-NEXT 鍒濆鏁版嵁');

    this.mock = M;
    this.adapter = opts.adapter || null;
    this.state = {
      currentTrack: M.currentTrack ? clone(M.currentTrack) : null,
      isPlaying: false,
      position: 0,
      duration: M.currentTrack ? M.currentTrack.duration : 0,
      volume: 0.7,
      muted: false,
      playMode: 'sequence',
      queue: { tracks: clone(M.queue.tracks), currentIndex: M.queue.currentIndex },
      view: 'home',
      activePlaylistId: null,
      offlineFilter: false,
      searchQuery: '',
      searchFocused: false,
      searchSelectedIndex: 0,
      searchResults: { local: [], netease: [], entities: { artists: [], albums: [], playlists: [] } },
      searchFilter: 'all',
      searchFilters: [
        { id: 'all', label: '\u5168\u90e8' },
        { id: 'songs', label: '\u6b4c\u66f2' },
        { id: 'artists', label: '\u6b4c\u624b' },
        { id: 'albums', label: '\u4e13\u8f91' },
        { id: 'playlists', label: '\u6b4c\u5355' }
      ],
      searchHistory: loadSearchHistory(),
      searchSuggestions: [],
      migrationOnboarding: loadMigrationOnboardingState(),
      queueOpen: false,
      syncing: false,
      confirmDialog: null,
      playlistContextMenu: { open: false, playlistId: '', playlistName: '', source: 'local', x: 0, y: 0 },
      neteaseStatus: M.neteaseStatus || 'signed-out',
      neteaseAvatarUrl: M.neteaseAvatarUrl || '',
      neteaseNickname: M.neteaseNickname || '',
      neteaseLastSyncText: M.neteaseLastSyncText || '尚未同步',
      neteaseSyncStatus: M.neteaseSyncStatus || '未登录',
      neteaseAssetMigrationRunning: M.neteaseAssetMigrationRunning || false,
      neteaseAccountCenter: M.neteaseAccountCenter || null,
      neteaseMenuOpen: false,
      migrationDashboard: {
        summary: {
          reportCount: 0,
          completedCount: 0,
          partialCount: 0,
          failedCount: 0,
          undoneCount: 0,
          added: 0,
          existing: 0,
          skipped: 0,
          failed: 0,
          duplicates: 0,
          lastActivityText: '暂无记录'
        },
        syncSummary: { total: 0, success: 0, failed: 0, conflict: 0, retryable: 0 },
        syncStates: [],
        reports: [],
        expandedReportIds: [],
        diagnostics: null
      },
      settings: {
        autoplay: false,
        rememberPosition: false,
        desktopLyrics: true,
        systemTray: true,
        trayCloseBehavior: 'exit',
        trayStartMinimized: false
      },
      immersiveLyrics: [],
      immersiveLyricsLoading: false,
      immersiveLyricsStatus: 'idle',
      immersiveLyricsError: '',
      immersiveLyricsMode: 'standard',
      immersiveVisualizerStyle: 'classic',
      immersiveBackground: { type: 'cover', src: '' },
      immersiveCachedVideos: [],
      immersiveBackgroundFilter: 'video',
      immersiveStylePanelOpen: false,
      immersiveCacheEditPath: '',
      immersiveCacheEditName: '',
      libraryCount: (M.tracks && M.tracks.length) || 0,
      viewTracks: [],
      canGoBack: false,
      canGoForward: false
    };

    this._tick = this._tick.bind(this);
    this._interval = null;
    this._history = [{ view: 'home', activePlaylistId: null }];
    this._historyIndex = 0;
    this._debouncedRunSearch = debounce(this._runSearch.bind(this), 200);
    this._immersiveProgressFrame = 0;
    this._immersiveProgressPending = false;
    this._immersiveSmoothFrame = 0;
    this._immersiveSmoothBasePosition = 0;
    this._immersiveSmoothBaseTime = 0;
    this._immersiveSmoothLastSync = 0;
    this._immersiveLastVisualUpdate = 0;
    this._immersiveLastTextUpdate = 0;
    this._immersiveLastWaveActive = -1;
    this._immersiveLastRatio = -1;
    this._immersiveDomCache = null;
    this._immersiveLastSpectrum = [];
    this._immersiveLastSpectrumAt = 0;
    this._immersiveLastBarHeights = [];
    this._immersiveLastActive = -1;
    this._immersiveRenderActive = null;
    this._immersiveLastMode = '';
    this._immersiveLastWordKey = '';
    this._immersiveLastVisualUpdate = 0;
    this._immersiveLastTextUpdate = 0;
    this._immersiveLastWaveActive = -1;
    this._immersiveLastRatio = -1;
    this._immersivePerf = ImmersivePerfProbe ? new ImmersivePerfProbe() : null;
    this.root = h('div', { class: 'ui-next-shell' });
    this.el.appendChild(this.root);
    this._bindGlobal();
    this.render();
  }

  NewMusicShell.prototype.onSearch = function (query) {
    if (this.adapter && typeof this.adapter.search === 'function') {
      this.adapter.search(query);
      return;
    }
    this._debouncedRunSearch(query);
  };

  NewMusicShell.prototype.onSearchFilter = function (filter) {
    this.state.searchFilter = filter || 'all';
    this.state.searchSelectedIndex = 0;
    this.render();
  };

  NewMusicShell.prototype.dismissMigrationOnboarding = function () {
    this.state.migrationOnboarding = saveMigrationOnboardingState({
      completed: true,
      skipped: true,
      completedAt: new Date().toISOString()
    });
    this.render();
  };

  NewMusicShell.prototype.resetMigrationOnboarding = function () {
    this.state.migrationOnboarding = saveMigrationOnboardingState({
      completed: false,
      skipped: false,
      completedAt: ''
    });
    this.state.view = 'home';
    this.render();
  };

  NewMusicShell.prototype.startMigrationOnboardingLogin = function () {
    this.state.migrationOnboarding = saveMigrationOnboardingState({
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString()
    });
    if (this.adapter && typeof this.adapter.openNetEaseLogin === 'function') {
      this.adapter.openNetEaseLogin();
    }
    this.render();
  };

  NewMusicShell.prototype.startMigrationOnboardingLocalImport = function () {
    this.state.migrationOnboarding = saveMigrationOnboardingState({
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString()
    });
    if (this.adapter && typeof this.adapter.addMusicFiles === 'function') {
      this.adapter.addMusicFiles();
    }
    this.render();
  };

  NewMusicShell.prototype.openMigrationOnboardingDashboard = function () {
    this.state.migrationOnboarding = saveMigrationOnboardingState({
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString()
    });
    if (this.adapter && typeof this.adapter.openMigrationDashboard === 'function') {
      this.adapter.openMigrationDashboard();
      return;
    }
    this.state.view = 'migration-dashboard';
    this.render();
  };

  NewMusicShell.prototype.onSelectSearchTerm = function (term) {
    var value = (term || '').trim();
    if (!value) return;
    this.state.searchQuery = value;
    this.state.searchFocused = true;
    this.state.searchSelectedIndex = 0;
    this.onSearch(value);
    this.render();
  };

  NewMusicShell.prototype.toggleNetEaseMenu = function () {
    this.state.neteaseMenuOpen = !this.state.neteaseMenuOpen;
    if (this.state.neteaseMenuOpen && this.adapter && typeof this.adapter.refreshNetEaseStatus === 'function') {
      this.adapter.refreshNetEaseStatus();
    }
    this.render();
  };

  NewMusicShell.prototype.closeNetEaseMenu = function () {
    if (!this.state.neteaseMenuOpen) return;
    this.state.neteaseMenuOpen = false;
    this.render();
  };

  NewMusicShell.prototype.openPlaylistContextMenu = function (playlist, x, y) {
    if (!playlist || !playlist.id) return;
    this.state.neteaseMenuOpen = false;
    this.state.playlistContextMenu = {
      open: true,
      playlistId: playlist.id,
      playlistName: playlist.name || '',
      source: playlist.source || 'local',
      x: clamp(x || 0, 8, Math.max(8, window.innerWidth - 188)),
      y: clamp(y || 0, 8, Math.max(8, window.innerHeight - 104))
    };
    this.render();
  };

  NewMusicShell.prototype.closePlaylistContextMenu = function () {
    if (!this.state.playlistContextMenu || !this.state.playlistContextMenu.open) return;
    this.state.playlistContextMenu.open = false;
    this.render();
  };

  NewMusicShell.prototype.renamePlaylistFromContextMenu = function (playlistId) {
    this.closePlaylistContextMenu();
    if (this.adapter && typeof this.adapter.renamePlaylist === 'function') {
      this.adapter.renamePlaylist(playlistId);
    }
  };

  NewMusicShell.prototype.deletePlaylistFromContextMenu = function (playlistId) {
    this.closePlaylistContextMenu();
    if (this.adapter && typeof this.adapter.deletePlaylist === 'function') {
      this.adapter.deletePlaylist(playlistId);
    }
  };

  NewMusicShell.prototype.recordSearchHistory = function (query) {
    var value = (query || '').trim();
    if (value.length < 2) return;
    var history = [value].concat((this.state.searchHistory || []).filter(function (item) {
      return item.toLowerCase() !== value.toLowerCase();
    })).slice(0, 10);
    this.state.searchHistory = history;
    saveSearchHistory(history);
  };

  NewMusicShell.prototype.confirm = function (options) {
    var self = this;
    return new Promise(function (resolve) {
      self.state.confirmDialog = {
        title: options && options.title ? options.title : 'Confirm action',
        message: options && options.message ? options.message : '',
        confirmText: options && options.confirmText ? options.confirmText : 'Confirm',
        cancelText: options && options.cancelText ? options.cancelText : 'Cancel',
        danger: Boolean(options && options.danger),
        resolve: resolve
      };
      self.render();
    });
  };

  NewMusicShell.prototype._closeConfirm = function (confirmed) {
    var dialog = this.state.confirmDialog;
    if (!dialog) return;

    this.state.confirmDialog = null;
    dialog.resolve(Boolean(confirmed));
    this.render();
  };

  NewMusicShell.prototype.onPlayTrack = function (track) {
    if (this.adapter && typeof this.adapter.playTrack === 'function') {
      this.adapter.playTrack(track);
      return;
    }
    this._setCurrent(track, true);
    this.state.isPlaying = true;
    this.state.position = 0;
    this.state.searchFocused = false;
    this._ensureTicking();
    this.render();
  };

  NewMusicShell.prototype.onPause = function () {
    if (this.adapter && typeof this.adapter.pause === 'function') {
      this.adapter.pause();
      return;
    }
    this.state.isPlaying = false;
    this._stopTicking();
    this.render();
  };

  NewMusicShell.prototype.onResume = function () {
    if (this.adapter && typeof this.adapter.resume === 'function') {
      this.adapter.resume();
      return;
    }
    if (!this.state.currentTrack) return;
    this.state.isPlaying = true;
    this._ensureTicking();
    this.render();
  };

  NewMusicShell.prototype.onSeek = function (ratio, dragging) {
    if (this.adapter && typeof this.adapter.seek === 'function') {
      this.adapter.seek(ratio, dragging);
      return;
    }
    var dur = this.state.duration || 0;
    this.state.position = clamp(ratio * dur, 0, dur);
    if (!dragging) this.render();
  };

  NewMusicShell.prototype.onVolumeChange = function (ratio) {
    if (this.adapter && typeof this.adapter.setVolume === 'function') {
      this.adapter.setVolume(ratio);
      return;
    }
    this.state.volume = clamp(ratio, 0, 1);
    if (this.state.muted && ratio > 0) this.state.muted = false;
    this.render();
  };

  NewMusicShell.prototype.onOpenPlaylist = function (playlistId) {
    this._pushHistory('playlist', playlistId);
    if (this.adapter && typeof this.adapter.openPlaylist === 'function') {
      this.adapter.openPlaylist(playlistId);
      return;
    }
    this.state.view = 'playlist';
    this.state.activePlaylistId = playlistId;
    this.render();
  };

  NewMusicShell.prototype.onRefreshPlaylist = function (playlistId) {
    if (this.adapter && typeof this.adapter.refreshPlaylist === 'function') {
      this.adapter.refreshPlaylist(playlistId);
      return;
    }
  };

  NewMusicShell.prototype.toggleOfflinePlayableFilter = function () {
    if (this.adapter && typeof this.adapter.toggleOfflinePlayableFilter === 'function') {
      this.adapter.toggleOfflinePlayableFilter();
      return;
    }
    this.state.offlineFilter = !this.state.offlineFilter;
    this.render();
  };

  NewMusicShell.prototype.onCorrectLocalMatch = function (track) {
    if (this.adapter && typeof this.adapter.onCorrectLocalMatch === 'function') {
      this.adapter.onCorrectLocalMatch(track);
    }
  };

  NewMusicShell.prototype.onAddToPlaylist = function (track) {
    if (this.adapter && typeof this.adapter.addToPlaylist === 'function') {
      this.adapter.addToPlaylist(track);
    }
  };

  NewMusicShell.prototype.onToggleLike = function (track) {
    if (this.adapter && typeof this.adapter.toggleLike === 'function') {
      this.adapter.toggleLike(track);
      return;
    }
    var liked = !track.liked;
    this._applyLiked(track.id, liked);
    var src = this.mock.byId(track.id);
    if (src) src.liked = liked;
    this.render();
  };

  NewMusicShell.prototype.onDeleteTrackFile = function (track) {
    if (this.adapter && typeof this.adapter.deleteTrackFile === 'function') {
      this.adapter.deleteTrackFile(track);
    }
  };

  NewMusicShell.prototype.onOpenQueue = function () {
    this.state.queueOpen = true;
    this.render();
  };

  NewMusicShell.prototype.onOpenImmersivePlayer = function () {
    this._recordImmersiveEntryProbe('onOpenImmersivePlayer', null);
    this._resetImmersiveVisualizerState();
    this._pushHistory('immersive-player', null);
    if (this.adapter && typeof this.adapter.openImmersivePlayer === 'function') {
      this.adapter.openImmersivePlayer();
      return;
    }

    this.state.view = 'immersive-player';
    this.state.activePlaylistId = null;
    this.state.queueOpen = false;
    this.render();
  };

  NewMusicShell.prototype._openImmersiveFromPlayerCover = function (event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    this._recordImmersiveEntryProbe('playerbar-cover-click', event && event.target);
    this.onOpenImmersivePlayer();
  };

  NewMusicShell.prototype._recordImmersiveEntryProbe = function (reason, target) {
    var snapshot = {
      reason: reason || '',
      viewBefore: this.state && this.state.view,
      hasCurrentTrack: Boolean(this.state && this.state.currentTrack),
      targetClass: target && target.className ? String(target.className) : '',
      timestamp: Date.now()
    };
    global.__auraluxImmersiveEntryProbe = snapshot;
    try {
      console.info('[ui-next] immersive entry', snapshot);
    } catch (_) {}
  };

  NewMusicShell.prototype._recordBottomClickProbe = function (event, phase) {
    if (!(event instanceof MouseEvent)) return;
    if (event.clientY < window.innerHeight - 130) return;

    var target = event.target instanceof Element ? event.target : null;
    var hit = document.elementFromPoint(event.clientX, event.clientY);
    var hitElement = hit instanceof Element ? hit : null;
    var current = target && target.closest ? target.closest('.mb-player__current') : null;
    var hitCurrent = hitElement && hitElement.closest ? hitElement.closest('.mb-player__current') : null;
    var coverButton = target && target.closest ? target.closest('.mb-player__cover-btn') : null;
    var hitCoverButton = hitElement && hitElement.closest ? hitElement.closest('.mb-player__cover-btn') : null;
    var player = target && target.closest ? target.closest('.mb-player') : null;
    var hitPlayer = hitElement && hitElement.closest ? hitElement.closest('.mb-player') : null;

    var snapshot = {
      phase: phase || '',
      x: event.clientX,
      y: event.clientY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      view: this.state && this.state.view,
      hasCurrentTrack: Boolean(this.state && this.state.currentTrack),
      rootContainsTarget: Boolean(this.root && target && this.root.contains(target)),
      rootContainsHit: Boolean(this.root && hitElement && this.root.contains(hitElement)),
      targetTag: target ? target.tagName : '',
      targetId: target ? target.id : '',
      targetClass: target && target.className ? String(target.className) : '',
      hitTag: hitElement ? hitElement.tagName : '',
      hitId: hitElement ? hitElement.id : '',
      hitClass: hitElement && hitElement.className ? String(hitElement.className) : '',
      matchedCurrent: Boolean(current || hitCurrent),
      matchedCoverButton: Boolean(coverButton || hitCoverButton),
      matchedPlayer: Boolean(player || hitPlayer),
      targetHtml: target ? target.outerHTML.slice(0, 260) : '',
      hitHtml: hitElement ? hitElement.outerHTML.slice(0, 260) : '',
      timestamp: Date.now()
    };

    global.__auraluxBottomClickProbe = snapshot;
    try {
      global.localStorage.setItem('auralux.bottomClickProbe', JSON.stringify(snapshot));
    } catch (_) {}
    try {
      console.info('[ui-next] bottom click probe', snapshot);
    } catch (_) {}
  };

  NewMusicShell.prototype.onCloseQueue = function () {
    this.state.queueOpen = false;
    this.render();
  };

  NewMusicShell.prototype._setCurrent = function (track) {
    var idx = indexOfTrack(this.state.queue.tracks, track.id);
    if (idx === -1) {
      var at = this.state.queue.currentIndex + 1;
      this.state.queue.tracks.splice(at, 0, clone(track));
      this.state.queue.currentIndex = at;
    } else {
      this.state.queue.currentIndex = idx;
    }
    this.state.currentTrack = clone(track);
    this.state.duration = track.duration || 0;
  };

  NewMusicShell.prototype._applyLiked = function (trackId, liked) {
    function apply(list) {
      list.forEach(function (t) { if (t.id === trackId) t.liked = liked; });
    }
    apply(this.state.queue.tracks);
    apply(this.mock.tracks);
    if (this.state.currentTrack && this.state.currentTrack.id === trackId) {
      this.state.currentTrack.liked = liked;
    }
  };

  NewMusicShell.prototype._ensureTicking = function () {
    if (this.adapter) return;
    if (this._interval) return;
    this._interval = setInterval(this._tick, 1000);
  };

  NewMusicShell.prototype._stopTicking = function () {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  };

  NewMusicShell.prototype._tick = function () {
    if (this.adapter) return;
    if (!this.state.isPlaying || !this.state.currentTrack) return;
    this.state.position = Math.min(this.state.position + 1, this.state.duration);
    if (this.state.position >= this.state.duration) this._skipNext();
    this._updateProgressOnly();
    this._updateImmersiveProgressOnly();
  };

  NewMusicShell.prototype._skipNext = function () {
    var q = this.state.queue;
    if (!q.tracks.length) return;
    var next = this.state.playMode === 'shuffle'
      ? Math.floor(Math.random() * q.tracks.length)
      : (q.currentIndex + 1) % q.tracks.length;
    q.currentIndex = next;
    this.state.currentTrack = clone(q.tracks[next]);
    this.state.duration = this.state.currentTrack.duration || 0;
    this.state.position = 0;
    this.state.isPlaying = true;
  };

  NewMusicShell.prototype._skipPrev = function () {
    var q = this.state.queue;
    if (!q.tracks.length) return;
    if (this.state.position > 3) {
      this.state.position = 0;
      return;
    }
    var prev = (q.currentIndex - 1 + q.tracks.length) % q.tracks.length;
    q.currentIndex = prev;
    this.state.currentTrack = clone(q.tracks[prev]);
    this.state.duration = this.state.currentTrack.duration || 0;
    this.state.position = 0;
  };

  NewMusicShell.prototype._runSearch = function (query) {
    var q = (query || '').trim().toLowerCase();
    if (!q) {
      this.state.searchResults = { local: [], netease: [], entities: { artists: [], albums: [], playlists: [] } };
      this.state.searchSuggestions = buildSearchSuggestions('', this.state.searchHistory, this.mock.tracks, this.mock.playlists);
      this.state.searchSelectedIndex = 0;
      this.render();
      return;
    }
    var local = [];
    var netease = [];
    this.mock.tracks.forEach(function (t) {
      var hay = (t.title + ' ' + t.artist + ' ' + (t.album || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return;
      if (t.source === 'netease') netease.push(clone(t)); else local.push(clone(t));
    });
    var all = local.concat(netease);
    this.state.searchResults = {
      local: local,
      netease: netease,
      entities: buildSearchEntities(q, all, this.mock.playlists)
    };
    this.state.searchSuggestions = buildSearchSuggestions(q, this.state.searchHistory, all, this.mock.playlists);
    this.state.searchSelectedIndex = 0;
    this.recordSearchHistory(query);
    this.render();
  };

  NewMusicShell.prototype._bindGlobal = function () {
    var self = this;
    document.addEventListener('click', function (e) {
      self._recordBottomClickProbe(e, 'capture-before-entry-check');
      if (self._isBottomLeftPlayerEntryClick(e)) {
        self._openImmersiveFromPlayerCover(e);
        return;
      }
      if (!self.root || !self.root.contains(e.target)) return;
      if (self._isPlayerCoverEntryClick(e)) {
        self._openImmersiveFromPlayerCover(e);
      }
    }, true);

    document.addEventListener('click', function (e) {
      self._recordBottomClickProbe(e, 'bubble-before-entry-check');
      if (!self.root || !self.root.contains(e.target)) return;
      var target = e.target;
      var coverButton = target && target.closest ? target.closest('.mb-player__cover-btn') : null;
      if (coverButton && self.root.contains(coverButton)) {
        self._openImmersiveFromPlayerCover(e);
        return;
      }

      if (self.state.view !== 'immersive-player') return;
      var actionEl = e.target && e.target.closest ? e.target.closest('[data-cache-action]') : null;
      if (!actionEl || !self.root.contains(actionEl)) return;
      var action = actionEl.getAttribute('data-cache-action');
      if (!action) return;

      if (action === 'rename') {
        e.preventDefault();
        self._startImmersiveCacheRename(
          actionEl.getAttribute('data-cache-path') || '',
          actionEl.getAttribute('data-cache-name') || ''
        );
      } else if (action === 'rename-cancel') {
        e.preventDefault();
        self._cancelImmersiveCacheRename();
      } else if (action === 'delete') {
        var deletePath = actionEl.getAttribute('data-cache-path') || '';
        if (deletePath && self.adapter && typeof self.adapter.deleteImmersiveCachedVideo === 'function') {
          e.preventDefault();
          self.adapter.deleteImmersiveCachedVideo(deletePath);
        }
      }
    });

    document.addEventListener('submit', function (e) {
      if (self.state.view !== 'immersive-player') return;
      if (!self.root || !self.root.contains(e.target)) return;
      var form = e.target && e.target.closest ? e.target.closest('form[data-cache-action="rename-submit"]') : null;
      if (!form || !self.root.contains(form)) return;
      e.preventDefault();
      self._submitImmersiveCacheRename(form.getAttribute('data-cache-path') || '');
    });

    document.addEventListener('mousedown', function (e) {
      if (self.state.playlistContextMenu && self.state.playlistContextMenu.open) {
        var playlistMenu = e.target && e.target.closest ? e.target.closest('.mb-playlist-context-menu') : null;
        if (!playlistMenu || !self.root || !self.root.contains(playlistMenu)) {
          self.state.playlistContextMenu.open = false;
          self.render();
          return;
        }
      }

      if (self.state.neteaseMenuOpen) {
        var neteaseMenu = e.target && e.target.closest ? e.target.closest('.mb-netease-account') : null;
        if (!neteaseMenu || !self.root || !self.root.contains(neteaseMenu)) {
          self.state.neteaseMenuOpen = false;
          self.render();
          return;
        }
      }

      if (!self.state.searchFocused) return;
      var top = self._topbarEl;
      if (top && !top.contains(e.target)) {
        self.state.searchFocused = false;
        self.render();
      }
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA';

      if (self.state.confirmDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          self._closeConfirm(false);
        }
        if (e.code === 'Space') {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape' && self.state.playlistContextMenu && self.state.playlistContextMenu.open) {
        self.state.playlistContextMenu.open = false;
        self.render();
        return;
      }

      if (e.key === 'Escape' && self.state.neteaseMenuOpen) {
        self.state.neteaseMenuOpen = false;
        self.render();
        return;
      }

      if (e.key === 'Escape' && self.state.searchFocused) {
        self.state.searchFocused = false;
        if (self._searchInput) self._searchInput.blur();
        self.render();
        return;
      }

      if (e.key === 'Escape' && self.state.view === 'immersive-player') {
        e.preventDefault();
        if (self.state.immersiveStylePanelOpen) {
          self.state.immersiveStylePanelOpen = false;
          self.render();
          return;
        }
        self.goBack();
        return;
      }

      if (typing) {
        self._handleSearchKeydown(e);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (self.state.isPlaying) self.onPause(); else self.onResume();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        self.state.searchFocused = true;
        self.render();
        if (self._searchInput) self._searchInput.focus();
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        if (self.adapter && typeof self.adapter.previousTrack === 'function') self.adapter.previousTrack();
        else { self._skipPrev(); self.render(); }
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        if (self.adapter && typeof self.adapter.nextTrack === 'function') self.adapter.nextTrack();
        else { self._skipNext(); self.render(); }
      }
    });
  };

  NewMusicShell.prototype._isPlayerCoverEntryClick = function (event) {
    if (!event || this.state.view === 'immersive-player') return false;
    var target = event.target;
    var coverButton = target && target.closest ? target.closest('.mb-player__cover-btn') : null;
    if (coverButton && this.root.contains(coverButton)) return true;

    if (!(event instanceof MouseEvent)) return false;
    var current = this.root.querySelector('.mb-player__current');
    var cover = this.root.querySelector('.mb-player__cover-btn');
    if (!current || !cover || !current.contains(target)) return false;
    if (target && target.closest && target.closest('.mb-player__like')) return false;

    var currentRect = current.getBoundingClientRect();
    var coverRect = cover.getBoundingClientRect();
    var hotZoneRight = Math.max(coverRect.right + 10, currentRect.left + 78);
    var withinCoverHotZone = event.clientX >= currentRect.left
      && event.clientX <= hotZoneRight
      && event.clientY >= currentRect.top
      && event.clientY <= currentRect.bottom;

    if (withinCoverHotZone) {
      global.__auraluxImmersiveEntryProbe = Object.assign(global.__auraluxImmersiveEntryProbe || {}, {
        hotzone: 'playerbar-cover',
        hotzoneTargetClass: target && target.className ? String(target.className) : '',
        hotzoneX: event.clientX,
        hotzoneY: event.clientY,
        timestamp: Date.now()
      });
    }

    return withinCoverHotZone;
  };

  NewMusicShell.prototype._isBottomLeftPlayerEntryClick = function (event) {
    if (!(event instanceof MouseEvent) || this.state.view === 'immersive-player') return false;
    var target = event.target instanceof Element ? event.target : null;
    if (target && target.closest && target.closest('.mb-player__like, #player .like-button, #player #like-btn')) {
      return false;
    }

    var player = this.root && this.root.querySelector ? this.root.querySelector('.mb-player') : null;
    var current = this.root && this.root.querySelector ? this.root.querySelector('.mb-player__current') : null;
    var rect = current ? current.getBoundingClientRect() : (player ? player.getBoundingClientRect() : null);
    if (!rect || !rect.width || !rect.height) {
      return false;
    }

    var left = rect.left;
    var right = current ? Math.min(rect.right, rect.left + Math.max(220, rect.width)) : Math.min(rect.right, rect.left + 360);
    var top = rect.top;
    var bottom = rect.bottom;
    var inPlayerCurrent = event.clientX >= left
      && event.clientX <= right
      && event.clientY >= top
      && event.clientY <= bottom;

    if (!inPlayerCurrent) return false;

    global.__auraluxImmersiveEntryProbe = Object.assign(global.__auraluxImmersiveEntryProbe || {}, {
      hotzone: 'bottom-left-player-coordinate',
      hotzoneX: event.clientX,
      hotzoneY: event.clientY,
      timestamp: Date.now()
    });
    return true;
  };

  NewMusicShell.prototype._startImmersiveCacheRename = function (cachePath, currentName) {
    if (!cachePath) return;
    if (this.state.immersiveCacheEditPath === cachePath) return;
    this.state.immersiveCacheEditPath = cachePath;
    this.state.immersiveCacheEditName = currentName || '';
    this.render();
  };

  NewMusicShell.prototype._cancelImmersiveCacheRename = function () {
    if (!this.state.immersiveCacheEditPath && !this.state.immersiveCacheEditName) return;
    this.state.immersiveCacheEditPath = '';
    this.state.immersiveCacheEditName = '';
    this.render();
  };

  NewMusicShell.prototype._submitImmersiveCacheRename = function (cachePath) {
    var nextName = (this.state.immersiveCacheEditName || '').trim();
    if (!cachePath || !nextName) return;
    this.state.immersiveCacheEditPath = '';
    this.state.immersiveCacheEditName = '';
    this.render();
    if (this.adapter && typeof this.adapter.renameImmersiveCachedVideo === 'function') {
      return this.adapter.renameImmersiveCachedVideo(cachePath, nextName);
    }
  };

  NewMusicShell.prototype._handleSearchKeydown = function (e) {
    if (!this.state.searchFocused) return;
    var filtered = applySearchFilter(this.state.searchResults, this.state.searchFilter);
    var flat = (filtered.local || []).concat(filtered.netease || []);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length) {
        this.state.searchSelectedIndex = (this.state.searchSelectedIndex + 1) % flat.length;
        this.render();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) {
        this.state.searchSelectedIndex = (this.state.searchSelectedIndex - 1 + flat.length) % flat.length;
        this.render();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat.length && this.state.searchSelectedIndex >= 0) {
        this.onPlayTrack(flat[this.state.searchSelectedIndex]);
      } else if (this.state.searchQuery.trim()) {
        this.recordSearchHistory(this.state.searchQuery);
        this.state.view = 'search';
        this.state.searchFocused = false;
        if (this._searchInput) this._searchInput.blur();
        this.render();
      }
    }
  };

  NewMusicShell.prototype._pushHistory = function (view, playlistId) {
    var current = this._history[this._historyIndex];
    var next = { view: view, activePlaylistId: playlistId || null };
    if (current && current.view === next.view && current.activePlaylistId === next.activePlaylistId) {
      this._syncHistoryFlags();
      return;
    }

    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(next);
    this._historyIndex = this._history.length - 1;
    this._syncHistoryFlags();
  };

  NewMusicShell.prototype._syncHistoryFlags = function () {
    this.state.canGoBack = this._historyIndex > 0;
    this.state.canGoForward = this._historyIndex < this._history.length - 1;
  };

  NewMusicShell.prototype.goBack = function () {
    if (this._historyIndex <= 0) return;
    this._historyIndex -= 1;
    this._applyHistoryEntry(this._history[this._historyIndex]);
  };

  NewMusicShell.prototype.goForward = function () {
    if (this._historyIndex >= this._history.length - 1) return;
    this._historyIndex += 1;
    this._applyHistoryEntry(this._history[this._historyIndex]);
  };

  NewMusicShell.prototype._applyHistoryEntry = function (entry) {
    if (!entry) return;
    this._syncHistoryFlags();

    if (this.adapter) {
      if (entry.view === 'immersive-player' && typeof this.adapter.openImmersivePlayer === 'function') {
        return this.adapter.openImmersivePlayer(true);
      }
      if (entry.view === 'home' && typeof this.adapter.openHomeView === 'function') return this.adapter.openHomeView(true);
      if (entry.view === 'library' && typeof this.adapter.openLibraryView === 'function') return this.adapter.openLibraryView(true);
      if (entry.view === 'recent' && typeof this.adapter.openRecentView === 'function') return this.adapter.openRecentView(true);
      if (entry.view === 'favorites' && typeof this.adapter.openFavoritesView === 'function') return this.adapter.openFavoritesView(true);
      if (entry.view === 'settings' && typeof this.adapter.openSettings === 'function') return this.adapter.openSettings(true);
      if (entry.view === 'migration-dashboard' && typeof this.adapter.openMigrationDashboard === 'function') return this.adapter.openMigrationDashboard(true);
      if (entry.view === 'playlist' && entry.activePlaylistId && typeof this.adapter.openPlaylist === 'function') {
        return this.adapter.openPlaylist(entry.activePlaylistId, true);
      }
    }

    this.state.view = entry.view;
    this.state.activePlaylistId = entry.view === 'playlist' ? entry.activePlaylistId : null;
    this.render();
  };

  NewMusicShell.prototype.render = function () {
    var s = this.state;
    var self = this;
    if (this._immersivePerf) this._immersivePerf.markRender();
    this._immersiveDomCache = null;
    this._immersiveLastActive = -1;
    this._immersiveLastWordKey = '';
    this.root.className = 'ui-next-shell';
    this.root.classList.toggle('with-queue', s.queueOpen);
    this.root.classList.toggle('is-immersive', s.view === 'immersive-player');

    if (s.view === 'immersive-player') {
      var immersiveDialog = s.confirmDialog ? this._renderConfirmDialog(s.confirmDialog) : null;
      var preservedVideo = this._detachReusableImmersiveVideo();
      clear(this.root, [
        this._renderImmersivePlayer(),
        immersiveDialog
      ]);
      this._restoreReusableImmersiveVideo(preservedVideo);
      this._topbarEl = null;
      this._searchInput = null;
      this._focusImmersiveCacheEditInput();
      this._scheduleImmersiveProgressUpdate();
      return;
    }

    if (this._immersiveSmoothFrame) {
      cancelAnimationFrame(this._immersiveSmoothFrame);
      this._immersiveSmoothFrame = 0;
    }

    var sidebar = Sidebar({
      state: s,
      playlists: this.mock.playlists,
      onNav: function (view) {
        self._pushHistory(view, null);
        if (self.adapter) {
          if (view === 'home' && typeof self.adapter.openHomeView === 'function') return self.adapter.openHomeView();
          if (view === 'library' && typeof self.adapter.openLibraryView === 'function') return self.adapter.openLibraryView();
          if (view === 'recent' && typeof self.adapter.openRecentView === 'function') return self.adapter.openRecentView();
          if (view === 'favorites' && typeof self.adapter.openFavoritesView === 'function') return self.adapter.openFavoritesView();
          if (view === 'settings' && typeof self.adapter.openSettings === 'function') return self.adapter.openSettings();
          if (view === 'migration-dashboard' && typeof self.adapter.openMigrationDashboard === 'function') return self.adapter.openMigrationDashboard();
        }
        s.view = view;
        if (view !== 'playlist') s.activePlaylistId = null;
        self.render();
      },
      onOpenPlaylist: function (id) { self.onOpenPlaylist(id); },
      onOpenPlaylistContextMenu: function (playlist, x, y) { self.openPlaylistContextMenu(playlist, x, y); },
      onCreatePlaylist: function () {
        if (self.adapter && typeof self.adapter.createPlaylist === 'function') self.adapter.createPlaylist();
      },
      onDeletePlaylist: function (id) {
        if (self.adapter && typeof self.adapter.deletePlaylist === 'function') self.adapter.deletePlaylist(id);
      },
      onImport: function () {
        if (self.adapter && typeof self.adapter.importNeteasePlaylist === 'function') {
          self.adapter.importNeteasePlaylist();
        }
      }
    });

    var topbar = TopSearch({
      query: s.searchQuery,
      focused: s.searchFocused,
      results: s.searchResults,
      filters: s.searchFilters,
      activeFilter: s.searchFilter,
      history: s.searchHistory,
      suggestions: s.searchSuggestions,
      selectedIndex: s.searchSelectedIndex,
      neteaseStatus: s.neteaseStatus,
      neteaseAvatarUrl: s.neteaseAvatarUrl,
      neteaseNickname: s.neteaseNickname,
      neteaseLastSyncText: s.neteaseLastSyncText,
      neteaseSyncStatus: s.neteaseSyncStatus,
      neteaseAssetMigrationRunning: s.neteaseAssetMigrationRunning,
      neteaseAccountCenter: s.neteaseAccountCenter,
      neteaseMenuOpen: s.neteaseMenuOpen,
      canGoBack: s.canGoBack,
      canGoForward: s.canGoForward,
      onBack: function () { self.goBack(); },
      onForward: function () { self.goForward(); },
      onInput: function (v) {
        s.searchQuery = v;
        s.searchSelectedIndex = 0;
        self.onSearch(v);
      },
      onFocus: function () { s.searchFocused = true; self.render(); },
      onSelectTrack: function (t) { self.onPlayTrack(t); },
      onAddToPlaylist: function (t) { self.onAddToPlaylist(t); },
      onToggleLike: function (t) { self.onToggleLike(t); },
      onOpenPlaylist: function (id) { self.onOpenPlaylist(id); },
      onSelectFilter: function (filter) { self.onSearchFilter(filter); },
      onSelectSuggestion: function (term) { self.onSelectSearchTerm(term); },
      onSelectHistory: function (term) { self.onSelectSearchTerm(term); },
      onKeyDown: function (e) { self._handleSearchKeydown(e); },
      onSettingsClick: function () {
        self._pushHistory('settings', null);
        if (self.adapter && typeof self.adapter.openSettings === 'function') self.adapter.openSettings();
      },
      onMinimize: function () {
        if (self.adapter && typeof self.adapter.minimizeWindow === 'function') self.adapter.minimizeWindow();
      },
      onMaximize: function () {
        if (self.adapter && typeof self.adapter.toggleMaximizeWindow === 'function') self.adapter.toggleMaximizeWindow();
      },
      onClose: function () {
        if (self.adapter && typeof self.adapter.closeWindow === 'function') self.adapter.closeWindow();
      },
      onToggleNetEaseMenu: function () { self.toggleNetEaseMenu(); },
      onRetryNetEaseSync: function () {
        s.neteaseMenuOpen = false;
        if (self.adapter && typeof self.adapter.retryNetEaseAccountSync === 'function') self.adapter.retryNetEaseAccountSync();
        self.render();
      },
      onOpenNetEaseLogin: function () {
        s.neteaseMenuOpen = false;
        if (self.adapter && typeof self.adapter.openNetEaseLogin === 'function') self.adapter.openNetEaseLogin();
        self.render();
      },
      onMigrateAllNetEaseAssets: function () {
        s.neteaseMenuOpen = false;
        if (self.adapter && typeof self.adapter.migrateAllNetEaseAssets === 'function') self.adapter.migrateAllNetEaseAssets();
        self.render();
      },
      onOpenMigrationDashboard: function () {
        s.neteaseMenuOpen = false;
        if (self.adapter && typeof self.adapter.openMigrationDashboard === 'function') self.adapter.openMigrationDashboard();
        self.render();
      },
      onCopyMigrationDiagnostics: function () {
        s.neteaseMenuOpen = false;
        self.onCopyMigrationDiagnostics();
      }
    });

    var content = this._renderContent();

    var player = PlayerBar({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      position: s.position,
      volume: s.volume,
      muted: s.muted,
      playMode: s.playMode,
      queueCount: s.queue.tracks.length,
      queueOpen: s.queueOpen,
      playbackCacheState: s.playbackCacheState || null,
      onPrev: function () {
        if (self.adapter && typeof self.adapter.previousTrack === 'function') return self.adapter.previousTrack();
        self._skipPrev(); self.render();
      },
      onPlayPause: function () { if (s.isPlaying) self.onPause(); else self.onResume(); },
      onNext: function () {
        if (self.adapter && typeof self.adapter.nextTrack === 'function') return self.adapter.nextTrack();
        self._skipNext(); self.render();
      },
      onSeek: function (ratio, dragging) { self.onSeek(ratio, dragging); },
      onVolume: function (ratio) { self.onVolumeChange(ratio); },
      onToggleMute: function () {
        if (self.adapter && typeof self.adapter.toggleMute === 'function') return self.adapter.toggleMute();
        s.muted = !s.muted; self.render();
      },
      desktopLyricsEnabled: !s.settings || s.settings.desktopLyrics !== false,
      onToggleDesktopLyrics: function () {
        if (self.adapter && typeof self.adapter.toggleDesktopLyrics === 'function') return self.adapter.toggleDesktopLyrics();
      },
      onCyclePlayMode: function () {
        if (self.adapter && typeof self.adapter.togglePlayMode === 'function') return self.adapter.togglePlayMode();
        var order = ['sequence', 'repeat-one', 'shuffle'];
        s.playMode = order[(order.indexOf(s.playMode) + 1) % order.length];
        self.render();
      },
      onToggleQueue: function () { s.queueOpen = !s.queueOpen; self.render(); },
      onToggleLike: function (t) { self.onToggleLike(t); },
      onOpenImmersivePlayer: function (e) { self._openImmersiveFromPlayerCover(e); }
    });

    var queue = s.queueOpen ? QueuePanel({
      queue: s.queue,
      onSelect: function (i) {
        if (self.adapter && typeof self.adapter.playQueueIndex === 'function') return self.adapter.playQueueIndex(i);
        s.queue.currentIndex = i;
        s.currentTrack = clone(s.queue.tracks[i]);
        s.duration = s.currentTrack.duration || 0;
        s.position = 0;
        s.isPlaying = true;
        self._ensureTicking();
        self.render();
      },
      onRemove: function (i) {
        if (self.adapter && typeof self.adapter.removeQueueIndex === 'function') return self.adapter.removeQueueIndex(i);
        if (s.queue.tracks.length <= 1) return;
        s.queue.tracks.splice(i, 1);
        if (i <= s.queue.currentIndex) s.queue.currentIndex = Math.max(0, s.queue.currentIndex - 1);
        self.render();
      },
      onClear: function () {
        if (self.adapter && typeof self.adapter.clearQueue === 'function') return self.adapter.clearQueue();
        var cur = s.queue.tracks[s.queue.currentIndex];
        s.queue.tracks = cur ? [clone(cur)] : [];
        s.queue.currentIndex = 0;
        self.render();
      },
      onClose: function () { self.onCloseQueue(); }
    }) : null;

    var playlistContextMenu = s.playlistContextMenu && s.playlistContextMenu.open
      ? this._renderPlaylistContextMenu(s.playlistContextMenu)
      : null;
    var confirmDialog = s.confirmDialog ? this._renderConfirmDialog(s.confirmDialog) : null;

    clear(this.root, [
      withRole(sidebar, 'mb-sidebar'),
      withRole(topbar, 'mb-topbar'),
      wrapContent(content),
      queue ? withRole(queue, 'mb-queue') : null,
      withRole(player, 'mb-player'),
      playlistContextMenu,
      confirmDialog
    ]);

    this._topbarEl = this.root.querySelector('.mb-topbar');
    this._searchInput = this.root.querySelector('.mb-search__input');
    if (s.searchFocused && this._searchInput && document.activeElement !== this._searchInput) {
      var v = s.searchQuery;
      this._searchInput.focus();
      try { this._searchInput.setSelectionRange(v.length, v.length); } catch (_) {}
    }
  };

  NewMusicShell.prototype._detachReusableImmersiveVideo = function () {
    var video = this.root.querySelector('.mb-immersive__bg-video');
    if (!video || !video.parentNode) return null;
    var src = video.currentSrc || video.src || '';
    if (!src) return null;
    var currentTime = video.currentTime || 0;
    var paused = video.paused;
    video.parentNode.removeChild(video);
    return { node: video, src: src, currentTime: currentTime, paused: paused };
  };

  NewMusicShell.prototype._restoreReusableImmersiveVideo = function (preserved) {
    if (!preserved || !preserved.node) return;
    var nextVideo = this.root.querySelector('.mb-immersive__bg-video');
    if (!nextVideo || !nextVideo.parentNode) return;
    var nextSrc = nextVideo.currentSrc || nextVideo.src || '';
    if (!nextSrc || nextSrc !== preserved.src) return;

    var parent = nextVideo.parentNode;
    parent.replaceChild(preserved.node, nextVideo);
    if (Number.isFinite(preserved.currentTime)) {
      try {
        preserved.node.currentTime = preserved.currentTime;
      } catch (error) {
        // Some codecs reject seek while metadata is not ready; keeping the node still avoids reload.
      }
    }
    if (!preserved.paused) {
      var playResult = preserved.node.play();
      if (playResult && typeof playResult.catch === 'function') playResult.catch(function () {});
    }
  };

  NewMusicShell.prototype._renderConfirmDialog = function (dialog) {
    var self = this;
    var panel = h('div', {
      class: 'mb-confirm',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'mb-confirm-title'
    }, [
      h('div', { class: 'mb-confirm__mark' + (dialog.danger ? ' is-danger' : '') }, dialog.danger ? '!' : '?'),
      h('div', { class: 'mb-confirm__body' }, [
        h('div', { class: 'mb-confirm__title', id: 'mb-confirm-title' }, dialog.title),
        h('div', { class: 'mb-confirm__message' }, dialog.message),
        h('div', { class: 'mb-confirm__actions' }, [
          h('button', {
            class: 'mb-btn mb-btn--ghost',
            type: 'button',
            onclick: function () { self._closeConfirm(false); }
          }, dialog.cancelText),
          h('button', {
            class: 'mb-btn mb-btn--primary' + (dialog.danger ? ' mb-btn--danger' : ''),
            type: 'button',
            onclick: function () { self._closeConfirm(true); }
          }, dialog.confirmText)
        ])
      ])
    ]);

    var backdrop = h('div', {
      class: 'mb-confirm-backdrop',
      onclick: function (event) {
        if (event.target === backdrop) self._closeConfirm(false);
      }
    }, panel);

    setTimeout(function () {
      var first = backdrop.querySelector('.mb-btn--ghost');
      if (first) first.focus();
    }, 0);

    return backdrop;
  };

  NewMusicShell.prototype._renderPlaylistContextMenu = function (menu) {
    var self = this;
    return h('div', {
      class: 'mb-playlist-context-menu',
      role: 'menu',
      style: { left: menu.x + 'px', top: menu.y + 'px' },
      onclick: function (event) { event.stopPropagation(); }
    }, [
      h('div', { class: 'mb-playlist-context-menu__title ellipsis' }, menu.playlistName || '歌单'),
      h('button', {
        class: 'mb-playlist-context-menu__item',
        type: 'button',
        role: 'menuitem',
        onclick: function () { self.renamePlaylistFromContextMenu(menu.playlistId); }
      }, [
        h('span', { class: 'mb-playlist-context-menu__icon' }, '改'),
        h('span', {}, '重命名')
      ]),
      h('button', {
        class: 'mb-playlist-context-menu__item is-danger',
        type: 'button',
        role: 'menuitem',
        onclick: function () { self.deletePlaylistFromContextMenu(menu.playlistId); }
      }, [
        h('span', { class: 'mb-playlist-context-menu__icon', html: MBIcons.trash(14) }),
        h('span', {}, '删除')
      ])
    ]);
  };

  NewMusicShell.prototype._renderContent = function () {
    var s = this.state;
    var self = this;

    if (s.view === 'immersive-player') {
      return this._renderImmersivePlayer();
    }

    if (s.view === 'playlist' && s.activePlaylistId) {
      var pl = this.mock.playlistById(s.activePlaylistId);
      var plTracks = this.mock.tracksForPlaylist(s.activePlaylistId).map(function (t) {
        var live = self.mock.byId(t.id);
        return live ? clone(live) : t;
      });
      if (s.offlineFilter) {
        plTracks = plTracks.filter(function (t) { return t.offlinePlayable; });
      }
      return PlaylistView({
        playlist: pl,
        tracks: plTracks,
        offlineFilter: s.offlineFilter,
        currentTrackId: s.currentTrack && s.currentTrack.id,
        isPlaying: s.isPlaying,
        syncing: s.syncing,
        onPlayAll: function () {
          if (!plTracks.length) return;
          if (self.adapter && typeof self.adapter.playTracks === 'function') return self.adapter.playTracks(plTracks, false);
          s.queue.tracks = plTracks.map(clone);
          s.queue.currentIndex = 0;
          self._setCurrent(plTracks[0]);
          s.isPlaying = true;
          s.position = 0;
          self._ensureTicking();
          self.render();
        },
        onShuffle: function () {
          if (!plTracks.length) return;
          if (self.adapter && typeof self.adapter.playTracks === 'function') return self.adapter.playTracks(plTracks, true);
          var shuffled = plTracks.slice().sort(function () { return Math.random() - 0.5; });
          s.queue.tracks = shuffled.map(clone);
          s.queue.currentIndex = 0;
          self._setCurrent(shuffled[0]);
          s.playMode = 'shuffle';
          s.isPlaying = true;
          s.position = 0;
          self._ensureTicking();
          self.render();
        },
        onRefresh: function () { self.onRefreshPlaylist(s.activePlaylistId); },
        onToggleOfflineFilter: function () { self.toggleOfflinePlayableFilter(); },
        onPlayTrack: function (t) { self.onPlayTrack(t); },
        onToggleLike: function (t) { self.onToggleLike(t); },
        onAddToPlaylist: function (t) { self.onAddToPlaylist(t); },
        onDeleteTrackFile: function (t) { self.onDeleteTrackFile(t); },
        onCorrectLocalMatch: function (t) { self.onCorrectLocalMatch(t); }
      });
    }

    if (s.view === 'search') {
      return this._renderTrackList('\u641c\u7d22', s.searchResults, s.searchQuery);
    }

    if (s.view === 'library' || s.view === 'recent' || s.view === 'favorites') {
      var titleMap = { library: '\u6211\u7684\u97f3\u4e50', recent: '\u6700\u8fd1\u64ad\u653e', favorites: '\u6211\u7684\u6536\u85cf' };
      var list = s.viewTracks || [];
      return this._renderTrackList(titleMap[s.view] || '闊充箰', {
        local: list.filter(function (t) { return t.source !== 'netease'; }),
        netease: list.filter(function (t) { return t.source === 'netease'; })
      }, '');
    }

    if (s.view === 'settings') return this._renderSettingsView();
    if (s.view === 'migration-dashboard') return this._renderMigrationDashboard();

    var home = HomeView({
      recent: s.homeRecent || recentTracks(this.mock),
      recommended: s.homeRecommended || this.mock.playlists.filter(function (p) { return p.source === 'local'; }),
      netease: s.homeNetEase || this.mock.playlists.filter(function (p) { return p.source === 'netease'; }),
      favorites: s.homeFavorites || this.mock.tracks.filter(function (t) { return t.liked; }),
      onPlayTrack: function (t) { self.onPlayTrack(t); },
      onOpenPlaylist: function (id) { self.onOpenPlaylist(id); }
    });
    home.classList.add('mb-home-with-onboarding');
    var onboarding = this._renderMigrationOnboarding();
    if (onboarding) home.insertBefore(onboarding, home.firstChild);
    return home;
  };

  NewMusicShell.prototype._renderMigrationOnboarding = function () {
    var state = this.state.migrationOnboarding || {};
    if (state.completed) return null;

    var self = this;
    return h('section', { class: 'mb-onboarding', 'aria-label': '网易云迁移引导' }, [
      h('div', { class: 'mb-onboarding__copy' }, [
        h('span', { class: 'mb-onboarding__eyebrow' }, '首次迁移'),
        h('h2', { class: 'mb-onboarding__title' }, '把网易云资产搬进 Auralux'),
        h('p', { class: 'mb-onboarding__desc' }, '迁移我喜欢、创建歌单、收藏歌单和最近播放；导入前会保留结果记录，不会静默覆盖本地曲库。')
      ]),
      h('div', { class: 'mb-onboarding__choice' }, [
        h('span', { class: 'mb-onboarding__choice-title' }, '建议顺序'),
        h('span', {}, '1. 登录网易云'),
        h('span', {}, '2. 迁移歌单和我喜欢'),
        h('span', {}, '3. 检查同步状态和失败清单')
      ]),
      h('div', { class: 'mb-onboarding__actions' }, [
        h('button', {
          class: 'mb-btn mb-btn--primary',
          type: 'button',
          onclick: function () { self.startMigrationOnboardingLogin(); }
        }, '登录网易云'),
        h('button', {
          class: 'mb-btn mb-btn--ghost',
          type: 'button',
          onclick: function () { self.startMigrationOnboardingLocalImport(); }
        }, '先导入本地音乐'),
        h('button', {
          class: 'mb-btn mb-btn--ghost',
          type: 'button',
          onclick: function () { self.openMigrationOnboardingDashboard(); }
        }, '查看迁移状态'),
        h('button', {
          class: 'mb-onboarding__skip',
          type: 'button',
          onclick: function () { self.dismissMigrationOnboarding(); }
        }, '暂时跳过')
      ])
    ]);
  };

  NewMusicShell.prototype._renderTrackList = function (title, results, query) {
    var self = this;
    return SearchResultsView({
      title: title,
      query: query,
      results: results,
      searchFilter: this.state.searchFilter,
      currentTrackId: this.state.currentTrack && this.state.currentTrack.id,
      isPlaying: this.state.isPlaying,
      onPlayTrack: function (t) { self.onPlayTrack(t); },
      onToggleLike: function (t) { self.onToggleLike(t); },
      onAddToPlaylist: function (t) { self.onAddToPlaylist(t); },
      onOpenPlaylist: function (id) { self.onOpenPlaylist(id); },
      onDeleteTrackFile: function (t) { self.onDeleteTrackFile(t); }
    });
  };

  NewMusicShell.prototype._renderImmersivePlayer = function () {
    var self = this;
    var s = this.state;
    if (!ImmersivePlayerView) {
      return h('div', { class: 'mb-empty' }, '\u6c89\u6d78\u64ad\u653e\u7ec4\u4ef6\u672a\u52a0\u8f7d');
    }

    return ImmersivePlayerView({
      track: s.currentTrack,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      volume: s.volume,
      muted: s.muted,
      playMode: s.playMode,
      lyrics: s.immersiveLyrics || [],
      activeLyricsIndex: this._immersiveRenderActive,
      lyricsLoading: Boolean(s.immersiveLyricsLoading),
      lyricsStatus: s.immersiveLyricsStatus || 'idle',
      lyricsError: s.immersiveLyricsError || '',
      lyricsMode: s.immersiveLyricsMode || 'standard',
      visualizerStyle: s.immersiveVisualizerStyle || 'classic',
      background: s.immersiveBackground || { type: 'cover', src: '' },
      cachedVideos: s.immersiveCachedVideos || [],
      backgroundFilter: s.immersiveBackgroundFilter || ((s.immersiveBackground && s.immersiveBackground.type === 'image') ? 'image' : 'video'),
      stylePanelOpen: Boolean(s.immersiveStylePanelOpen),
      cacheEditPath: s.immersiveCacheEditPath || '',
      cacheEditName: s.immersiveCacheEditName || '',
      onBack: function () { self.goBack(); },
      onToggleStylePanel: function () {
        s.immersiveStylePanelOpen = !s.immersiveStylePanelOpen;
        if (s.immersiveStylePanelOpen && self.adapter && typeof self.adapter.loadImmersiveCachedVideos === 'function') {
          self.adapter.loadImmersiveCachedVideos();
        }
        self.render();
      },
      onCloseStylePanel: function () {
        s.immersiveStylePanelOpen = false;
        self.render();
      },
      onPlayPause: function () { if (s.isPlaying) self.onPause(); else self.onResume(); },
      onPrev: function () {
        if (self.adapter && typeof self.adapter.previousTrack === 'function') return self.adapter.previousTrack();
        self._skipPrev(); self.render();
      },
      onNext: function () {
        if (self.adapter && typeof self.adapter.nextTrack === 'function') return self.adapter.nextTrack();
        self._skipNext(); self.render();
      },
      onSeek: function (ratio, dragging) { self.onSeek(ratio, dragging); },
      onToggleLike: function (t) { self.onToggleLike(t); },
      onRetryLyrics: function () {
        if (self.adapter && typeof self.adapter.retryCurrentLyrics === 'function') return self.adapter.retryCurrentLyrics();
      },
      onCyclePlayMode: function () {
        if (self.adapter && typeof self.adapter.togglePlayMode === 'function') return self.adapter.togglePlayMode();
        var order = ['sequence', 'repeat-one', 'shuffle'];
        s.playMode = order[(order.indexOf(s.playMode) + 1) % order.length];
        self.render();
      },
      onLyricsMode: function (mode) {
        if (self.adapter && typeof self.adapter.setImmersiveLyricsMode === 'function') return self.adapter.setImmersiveLyricsMode(mode);
        s.immersiveLyricsMode = mode;
        self.render();
      },
      onVisualizerStyle: function (style) {
        if (self.adapter && typeof self.adapter.setImmersiveVisualizerStyle === 'function') return self.adapter.setImmersiveVisualizerStyle(style);
        s.immersiveVisualizerStyle = style;
        self.render();
      },
      onVideoQuality: function (quality) {
        if (self.adapter && typeof self.adapter.setImmersiveVideoQuality === 'function') return self.adapter.setImmersiveVideoQuality(quality);
      },
      onBackgroundCover: function () {
        if (self.adapter && typeof self.adapter.useCoverImmersiveBackground === 'function') return self.adapter.useCoverImmersiveBackground();
      },
      onBackgroundImage: function () {
        s.immersiveBackgroundFilter = 'image';
        self.render();
      },
      onBackgroundVideo: function () {
        s.immersiveBackgroundFilter = 'video';
        self.render();
      },
      onBackgroundImport: function (kind) {
        if (self.adapter && typeof self.adapter.chooseImmersiveBackground === 'function') return self.adapter.chooseImmersiveBackground(kind);
      },
      onBackgroundClear: function () {
        if (self.adapter && typeof self.adapter.resetImmersiveBackground === 'function') return self.adapter.resetImmersiveBackground();
      },
      onCachedVideoSelect: function (mediaType, sourcePath, cachePath, quality, presetVersion) {
        if (self.adapter && typeof self.adapter.selectImmersiveCachedVideo === 'function') {
          return self.adapter.selectImmersiveCachedVideo(mediaType, sourcePath, cachePath, quality, presetVersion);
        }
      },
      onCachedVideoRename: function (cachePath, currentName) {
        self._startImmersiveCacheRename(cachePath, currentName);
      },
      onCachedVideoRenameInput: function (value) {
        s.immersiveCacheEditName = value;
      },
      onCachedVideoRenameCancel: function () {
        self._cancelImmersiveCacheRename();
      },
      onCachedVideoRenameSubmit: function (cachePath) {
        return self._submitImmersiveCacheRename(cachePath);
      },
      onCachedVideoDelete: function (cachePath) {
        if (self.adapter && typeof self.adapter.deleteImmersiveCachedVideo === 'function') {
          return self.adapter.deleteImmersiveCachedVideo(cachePath);
        }
      }
    });
  };

  NewMusicShell.prototype.onToggleMigrationReportFailures = function (reportId) {
    var dashboard = this.state.migrationDashboard || {};
    var expanded = dashboard.expandedReportIds || [];
    var exists = expanded.indexOf(reportId) >= 0;
    dashboard.expandedReportIds = exists
      ? expanded.filter(function (id) { return id !== reportId; })
      : expanded.concat(reportId);
    this.state.migrationDashboard = dashboard;
    this.render();
  };

  NewMusicShell.prototype.onRetryMigrationDashboardSync = function (playlistId) {
    if (this.adapter && typeof this.adapter.retryMigrationDashboardSync === 'function') {
      this.adapter.retryMigrationDashboardSync(playlistId);
    }
  };

  NewMusicShell.prototype.onCopyMigrationDiagnostics = function () {
    if (this.adapter && typeof this.adapter.copyMigrationDiagnostics === 'function') {
      this.adapter.copyMigrationDiagnostics();
    }
  };

  NewMusicShell.prototype._renderMigrationDashboard = function () {
    var self = this;
    var dashboard = this.state.migrationDashboard || {};
    var summary = dashboard.summary || {};
    var syncSummary = dashboard.syncSummary || {};
    var syncStates = dashboard.syncStates || [];
    var reports = dashboard.reports || [];
    var expandedReportIds = dashboard.expandedReportIds || [];

    function metric(label, value, tone) {
      return h('div', { class: 'mb-migration-metric' + (tone ? ' is-' + tone : '') }, [
        h('span', { class: 'mb-migration-metric__value numeric' }, String(value || 0)),
        h('span', { class: 'mb-migration-metric__label' }, label)
      ]);
    }

    function statusText(status) {
      if (status === 'success') return '同步成功';
      if (status === 'failed') return '同步失败';
      if (status === 'conflict') return '存在冲突';
      if (status === 'syncing') return '同步中';
      return '等待同步';
    }

    function reportRow(report) {
      var failures = report.failures || [];
      var expanded = expandedReportIds.indexOf(report.id) >= 0;
      return h('div', { class: 'mb-migration-report' }, [
        h('div', { class: 'mb-migration-report__main' }, [
          h('span', { class: 'mb-migration-report__name' }, report.playlistName || '未命名歌单'),
          h('span', { class: 'mb-migration-report__meta' }, [
            report.kindLabel || '',
            ' · ',
            report.createdAtText || '暂无记录',
            ' · ',
            report.statusLabel || report.status
          ].join(''))
        ]),
        h('div', { class: 'mb-migration-report__counts numeric' }, [
          h('span', {}, '新增 ' + (report.added || 0)),
          h('span', {}, '已存在 ' + (report.existing || 0)),
          h('span', {}, '跳过 ' + (report.skipped || 0)),
          h('span', { class: report.failed > 0 ? 'is-danger' : '' }, '失败 ' + (report.failed || 0))
        ]),
        failures.length ? h('button', {
          class: 'mb-migration-report__toggle',
          onclick: function () { self.onToggleMigrationReportFailures(report.id); }
        }, expanded ? '收起失败原因' : '查看失败原因') : null,
        expanded ? h('div', { class: 'mb-migration-report__failures' }, failures.slice(0, 8).map(function (failure) {
          return h('div', { class: 'mb-migration-report__failure' }, [
            h('span', { class: 'mb-migration-report__failure-title' }, failure.title || String(failure.songId || '未知歌曲')),
            h('span', { class: 'mb-migration-report__failure-reason' }, failure.reason || '未知原因')
          ]);
        })) : null
      ]);
    }

    function diagnosticItem(label, value, tone) {
      return h('div', { class: 'mb-migration-diagnostics__item' + (tone ? ' is-' + tone : '') }, [
        h('span', { class: 'mb-migration-diagnostics__label' }, label),
        h('span', { class: 'mb-migration-diagnostics__value' }, value || '暂无')
      ]);
    }

    return h('div', { class: 'mb-content__inner mb-migration' }, [
      h('section', { class: 'mb-section' }, [
        h('div', { class: 'mb-section__head' }, [
          h('span', { class: 'mb-section__title' }, '迁移状态'),
          h('span', { class: 'mb-section__count numeric' }, summary.lastActivityText || '暂无记录')
        ]),
        h('div', { class: 'mb-migration-overview' }, [
          metric('报告', summary.reportCount, 'info'),
          metric('完成', summary.completedCount, 'success'),
          metric('部分完成', summary.partialCount, 'warning'),
          metric('失败', summary.failedCount, 'danger'),
          metric('已撤销', summary.undoneCount, 'muted')
        ]),
        h('div', { class: 'mb-migration-totals' }, [
          metric('新增歌曲', summary.added, 'success'),
          metric('已存在', summary.existing, 'info'),
          metric('跳过', summary.skipped, 'warning'),
          metric('失败歌曲', summary.failed, 'danger'),
          metric('重复项', summary.duplicates, 'muted')
        ])
      ]),

      h('section', { class: 'mb-section' }, [
        h('div', { class: 'mb-section__head' }, [
          h('span', { class: 'mb-section__title' }, '同步状态'),
          h('span', { class: 'mb-section__count numeric' }, '可重试 ' + (syncSummary.retryable || 0))
        ]),
        syncStates.length ? h('div', { class: 'mb-migration-sync-list' }, syncStates.map(function (state) {
          return h('div', { class: 'mb-migration-sync is-' + (state.status || 'idle') }, [
            h('div', { class: 'mb-migration-sync__main' }, [
              h('span', { class: 'mb-migration-sync__name' }, state.playlistName || ('网易云歌单 ' + (state.externalId || state.playlistId))),
              h('span', { class: 'mb-migration-sync__meta' }, [
                statusText(state.status),
                state.lastActivityText ? ' · ' + state.lastActivityText : '',
                state.failureReason ? ' · ' + state.failureReason : ''
              ].join(''))
            ]),
            state.retryable ? h('button', {
              class: 'mb-settings-mini-action',
              disabled: Boolean(self.state.syncing),
              onclick: function () { self.onRetryMigrationDashboardSync(state.playlistId); }
            }, self.state.syncing ? '重试中...' : '重试') : null
          ]);
        })) : h('div', { class: 'mb-empty' }, [
          h('span', { class: 'mb-empty__title' }, '暂无同步记录'),
          h('span', { class: 'mb-empty__desc' }, '导入或同步网易云歌单后，这里会显示每个歌单的可信同步状态。')
        ])
      ]),

      h('section', { class: 'mb-section' }, [
        h('div', { class: 'mb-section__head' }, [
          h('span', { class: 'mb-section__title' }, '最近报告'),
          h('span', { class: 'mb-section__count numeric' }, String(reports.length))
        ]),
        reports.length ? h('div', { class: 'mb-migration-report-list' }, reports.map(reportRow)) : h('div', { class: 'mb-empty' }, [
          h('span', { class: 'mb-empty__title' }, '还没有迁移报告'),
          h('span', { class: 'mb-empty__desc' }, '完成网易云歌单导入或资产迁移后，这里会保留最近结果。')
        ])
      ]),

      this._renderMigrationDiagnostics(dashboard.diagnostics, diagnosticItem)
    ]);
  };

  NewMusicShell.prototype._renderMigrationDiagnostics = function (diagnostics, diagnosticItem) {
    var data = diagnostics || {};
    return h('section', { class: 'mb-section mb-migration-diagnostics' }, [
      h('div', { class: 'mb-section__head' }, [
        h('span', { class: 'mb-section__title' }, '诊断信息'),
        h('button', {
          class: 'mb-migration-diagnostics__copy',
          type: 'button',
          onclick: this.onCopyMigrationDiagnostics.bind(this)
        }, '复制诊断信息')
      ]),
      h('div', { class: 'mb-migration-diagnostics__grid' }, [
        diagnosticItem('NetEase API', data.apiStatus, data.apiStatus === '不可用' ? 'danger' : 'success'),
        diagnosticItem('登录状态', data.loginStatus, data.loginStatus && data.loginStatus.indexOf('失败') >= 0 ? 'danger' : ''),
        diagnosticItem('失败报告', String(data.failedReportCount || 0), data.failedReportCount > 0 ? 'danger' : ''),
        diagnosticItem('可重试同步', String(data.retryableSyncCount || 0), data.retryableSyncCount > 0 ? 'warning' : '')
      ]),
      h('div', { class: 'mb-migration-diagnostics__note' }, [
        h('span', {}, data.redactionNotice || '已脱敏，不包含 Cookie、二维码 key 或账号令牌。'),
        h('span', {}, '可复制给开发者，用来排查登录、API、迁移或同步失败。')
      ]),
      data.copyText ? h('pre', { class: 'mb-migration-diagnostics__text' }, data.copyText) : null
    ]);
  };

  NewMusicShell.prototype._renderSettingsView = function () {
    var self = this;
    var settings = this.state.settings || {};

    function updateSetting(key, value) {
      if (key === 'autoScanEnabled' && self.adapter && typeof self.adapter.toggleAutoScan === 'function') {
        self.adapter.toggleAutoScan(value);
        return;
      }
      if (key === 'scanFrequency' && self.adapter && typeof self.adapter.updateScanFrequency === 'function') {
        self.adapter.updateScanFrequency(value);
        return;
      }
      if (key === 'hardwareAcceleration' && self.adapter && typeof self.adapter.toggleHardwareAcceleration === 'function') {
        self.adapter.toggleHardwareAcceleration(value);
        return;
      }
      if (self.adapter && typeof self.adapter.updateSetting === 'function') {
        self.adapter.updateSetting(key, value);
        return;
      }
      self.state.settings = self.state.settings || {};
      self.state.settings[key] = value;
      self.render();
    }

    function switchInput(checked, key) {
      var input = h('input', {
        class: 'mb-settings-switch__input',
        type: 'checkbox',
        onchange: function () { updateSetting(key, input.checked); }
      });
      input.checked = Boolean(checked);
      return h('span', { class: 'mb-settings-switch' }, [
        input,
        h('span', { class: 'mb-settings-switch__track' }, [
          h('span', { class: 'mb-settings-switch__thumb' })
        ])
      ]);
    }

    function settingToggle(label, desc, checked, key) {
      return h('label', { class: 'mb-settings-row' }, [
        h('span', { class: 'mb-settings-row__copy' }, [
          h('span', { class: 'mb-settings-row__label' }, label),
          h('span', { class: 'mb-settings-row__desc' }, desc)
        ]),
        switchInput(checked, key)
      ]);
    }

    function settingSelect(label, desc, value, key, options) {
      var optionList = options || [
        { value: 'exit', label: '\u76f4\u63a5\u9000\u51fa' },
        { value: 'minimize', label: '\u6700\u5c0f\u5316\u5230\u6258\u76d8' }
      ];
      var select = h('select', {
        class: 'mb-settings-select',
        onchange: function () { updateSetting(key, select.value); }
      }, optionList.map(function (option) {
        return h('option', { value: option.value }, option.label);
      }));
      select.value = optionList.some(function (option) { return option.value === value; }) ? value : optionList[0].value;

      return h('div', { class: 'mb-settings-row' }, [
        h('span', { class: 'mb-settings-row__copy' }, [
          h('span', { class: 'mb-settings-row__label' }, label),
          h('span', { class: 'mb-settings-row__desc' }, desc)
        ]),
        select
      ]);
    }

    function settingRange(label, desc, value, key, min, max, step, suffix) {
      var input = h('input', {
        class: 'mb-settings-range',
        type: 'range',
        min: String(min),
        max: String(max),
        step: String(step),
        onchange: function () { updateSetting(key, Number(input.value)); },
        oninput: function () {
          valueNode.textContent = input.value + (suffix || '');
        }
      });
      input.value = String(value);
      var valueNode = h('span', { class: 'mb-settings-value' }, String(value) + (suffix || ''));
      return h('div', { class: 'mb-settings-row' }, [
        h('span', { class: 'mb-settings-row__copy' }, [
          h('span', { class: 'mb-settings-row__label' }, label),
          h('span', { class: 'mb-settings-row__desc' }, desc)
        ]),
        h('span', { class: 'mb-settings-control' }, [input, valueNode])
      ]);
    }

    function settingColor(label, desc, value, key) {
      var input = h('input', {
        class: 'mb-settings-color',
        type: 'color',
        onchange: function () { updateSetting(key, input.value); },
        oninput: function () { valueNode.textContent = input.value; }
      });
      input.value = value || '#335eea';
      var valueNode = h('span', { class: 'mb-settings-value' }, input.value);
      return h('div', { class: 'mb-settings-row' }, [
        h('span', { class: 'mb-settings-row__copy' }, [
          h('span', { class: 'mb-settings-row__label' }, label),
          h('span', { class: 'mb-settings-row__desc' }, desc)
        ]),
        h('span', { class: 'mb-settings-control' }, [input, valueNode])
      ]);
    }

    function pathRow(label, value, buttonLabel, handler) {
      return h('div', { class: 'mb-settings-path' }, [
        h('span', { class: 'mb-settings-path__copy' }, [
          h('span', { class: 'mb-settings-row__label' }, label),
          h('span', { class: 'mb-settings-path__value' }, value || 'Not set')
        ]),
        h('button', { class: 'mb-settings-mini-action', onclick: handler }, buttonLabel)
      ]);
    }

    function adapterAction(name) {
      return function () {
        if (self.adapter && typeof self.adapter[name] === 'function') {
          self.adapter[name].apply(self.adapter, Array.prototype.slice.call(arguments));
        }
      };
    }

    function action(label, desc, handler) {
      return h('button', { class: 'mb-settings-action', onclick: handler }, [
        h('span', { class: 'mb-settings-action__label' }, label),
        h('span', { class: 'mb-settings-action__desc' }, desc)
      ]);
    }

    return h('div', { class: 'mb-content__inner' }, [
      h('section', { class: 'mb-section' }, [
        h('div', { class: 'mb-section__head' }, [
          h('span', { class: 'mb-section__title' }, '\u8bbe\u7f6e'),
          h('span', { class: 'mb-section__count numeric' }, 'UI-NEXT')
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u64ad\u653e'),
            h('span', { class: 'mb-settings-panel__hint' }, '\u5e94\u7528\u5230\u5f53\u524d Auralux \u64ad\u653e\u903b\u8f91')
          ]),
          settingToggle('\u542f\u52a8\u540e\u81ea\u52a8\u64ad\u653e', '\u6253\u5f00\u8f6f\u4ef6\u540e\u6062\u590d\u64ad\u653e\u72b6\u6001\u65f6\u81ea\u52a8\u7ee7\u7eed\u64ad\u653e\u3002', settings.autoplay, 'autoplay'),
          settingToggle('\u8bb0\u4f4f\u64ad\u653e\u8fdb\u5ea6', '\u91cd\u542f\u540e\u4ece\u4e0a\u6b21\u6b4c\u66f2\u4f4d\u7f6e\u7ee7\u7eed\u3002', settings.rememberPosition, 'rememberPosition'),
          settingToggle('\u663e\u793a\u5c01\u9762', '\u5728\u97f3\u4e50\u5e93\u5217\u8868\u548c\u6b4c\u5355\u8be6\u60c5\u4e2d\u663e\u793a\u6b4c\u66f2\u5c01\u9762\u3002', settings.showTrackCovers, 'showTrackCovers'),
          settingToggle('\u542f\u7528\u65e0\u7f1d\u64ad\u653e', '\u5f53\u64ad\u653e\u5f15\u64ad\u652f\u6301\u65f6\uff0c\u63d0\u524d\u52a0\u8f7d\u4e0b\u4e00\u9996\u6b4c\u66f2\u4ee5\u51cf\u5c11\u95f4\u9694\u3002', settings.gaplessPlayback, 'gaplessPlayback')
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u97f3\u9891\u5f15\u64ad'),
            h('span', { class: 'mb-settings-panel__hint' }, settings.wasapiAvailable === false ? '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301 WASAPI' : 'WASAPI \u8f93\u51fa\u6a21\u5f0f')
          ]),
          settings.wasapiAvailable === false ? null : settingToggle('\u72ec\u5360\u6a21\u5f0f', '\u53ef\u7528\u65f6\u4f7f\u7528 WASAPI \u72ec\u5360\u8f93\u51fa\u3002', settings.exclusiveMode, 'exclusiveMode'),
          settings.wasapiAvailable === false || !settings.exclusiveMode ? null : settingSelect('WASAPI \u5171\u4eab\u65b9\u5f0f', '\u72ec\u5360\u6a21\u5f0f\u7531 Auralux \u63a5\u7ba1\u8bbe\u5907\uff0c\u5171\u4eab\u6a21\u5f0f\u4fdd\u7559 Windows \u6df7\u97f3\u3002', settings.wasapiShareMode, 'wasapiShareMode', [
            { value: 'exclusive', label: '\u72ec\u5360' },
            { value: 'shared', label: '\u5171\u4eab' }
          ])
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u97f3\u4e50\u6587\u4ef6\u5939'),
            h('span', { class: 'mb-settings-panel__hint' }, String((settings.musicFolders || []).length) + ' \u4e2a\u6587\u4ef6\u5939')
          ]),
          h('div', { class: 'mb-settings-folder-list' }, (settings.musicFolders || []).length ? (settings.musicFolders || []).map(function (folderPath) {
            return h('div', { class: 'mb-settings-folder' }, [
              h('span', { class: 'mb-settings-folder__path' }, folderPath),
              h('button', { class: 'mb-settings-mini-action', onclick: function () {
                if (self.adapter && typeof self.adapter.removeMusicFolder === 'function') self.adapter.removeMusicFolder(folderPath);
              } }, '\u79fb\u9664')
            ]);
          }) : h('div', { class: 'mb-settings-empty' }, '\u8fd8\u6ca1\u6709\u6dfb\u52a0\u97f3\u4e50\u6587\u4ef6\u5939\u3002')),
          h('div', { class: 'mb-settings-inline-actions' }, [
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('addMusicFolder') }, '\u6dfb\u52a0\u6587\u4ef6\u5939'),
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('addMusicFiles') }, '\u6dfb\u52a0\u97f3\u4e50\u6587\u4ef6')
          ]),
          settingToggle('\u81ea\u52a8\u626b\u63cf', '\u81ea\u52a8\u626b\u63cf\u5df2\u914d\u7f6e\u7684\u97f3\u4e50\u6587\u4ef6\u5939\u3002', settings.autoScanEnabled, 'autoScanEnabled'),
          settings.autoScanEnabled ? settingSelect('\u626b\u63cf\u9891\u7387', '\u9009\u62e9 Auralux \u626b\u63cf\u6587\u4ef6\u5939\u7684\u65f6\u673a\u3002', settings.scanFrequency, 'scanFrequency', [
            { value: 'on_startup', label: '\u542f\u52a8\u65f6' },
            { value: 'daily', label: '\u6bcf\u5929' },
            { value: 'weekly', label: '\u6bcf\u5468' },
            { value: 'manual', label: '\u624b\u52a8' }
          ]) : null
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u6b4c\u8bcd\u4e0e\u7f13\u5b58'),
            h('span', { class: 'mb-settings-panel__hint' }, settings.cacheBusy ? '\u6b63\u5728\u5904\u7406...' : '\u672c\u5730\u8d44\u6e90')
          ]),
          pathRow('\u6b4c\u8bcd\u6587\u4ef6\u5939', settings.lyricsDirectory, '\u9009\u62e9', adapterAction('chooseLyricsDirectory')),
          pathRow('\u5c01\u9762\u7f13\u5b58\u6587\u4ef6\u5939', settings.coverCacheDirectory, '\u9009\u62e9', adapterAction('chooseCoverCacheDirectory')),
          settingRange('\u6b4c\u8bcd\u9ad8\u4eae\u900f\u660e\u5ea6', '\u8c03\u6574\u5f53\u524d\u6b4c\u8bcd\u9ad8\u4eae\u5f3a\u5ea6\u3002', settings.lyricsHighlightOpacity == null ? 1 : settings.lyricsHighlightOpacity, 'lyricsHighlightOpacity', 0.2, 1, 0.05, ''),
          settingColor('\u6b4c\u8bcd\u9ad8\u4eae\u989c\u8272', '\u7528\u4e8e\u540c\u6b65\u6b4c\u8bcd\u548c\u9ad8\u4eae\u6548\u679c\u3002', settings.lyricsHighlightColor || '#335eea', 'lyricsHighlightColor'),
          h('div', { class: 'mb-settings-cache-note' }, settings.cacheDescription || '\u7f13\u5b58\u6458\u8981\u8fd8\u6ca1\u6709\u52a0\u8f7d\u3002'),
          h('div', { class: 'mb-settings-inline-actions' }, [
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('showCacheStatistics') }, settings.cacheBusy === 'stats' ? '\u52a0\u8f7d\u4e2d...' : '\u6458\u8981'),
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('validateCache') }, settings.cacheBusy === 'validate' ? '\u68c0\u67e5\u4e2d...' : '\u9a8c\u8bc1'),
            h('button', { class: 'mb-settings-mini-action is-danger', onclick: adapterAction('clearCache') }, settings.cacheBusy === 'clear' ? '\u6e05\u7406\u4e2d...' : '\u6e05\u7406'),
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('testEmbeddedLyrics') }, '\u6d4b\u8bd5\u5185\u5d4c\u6b4c\u8bcd')
          ])
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u684c\u9762\u663e\u793a'),
            h('span', { class: 'mb-settings-panel__hint' }, '\u684c\u9762\u6b4c\u8bcd\u4e0e\u8ff7\u4f60\u6a21\u5f0f')
          ]),
          settingToggle('\u684c\u9762\u6b4c\u8bcd', '\u663e\u793a\u6216\u9690\u85cf\u684c\u9762\u6b4c\u8bcd\u529f\u80fd\u3002', settings.desktopLyrics, 'desktopLyrics'),
          settingSelect('\u684c\u9762\u663e\u793a\u6a21\u5f0f', '\u9009\u62e9\u684c\u9762\u6b4c\u8bcd\u7684\u5448\u73b0\u65b9\u5f0f\u3002', settings.desktopLyricsDisplayMode, 'desktopLyricsDisplayMode', [
            { value: 'default', label: '\u666e\u901a' },
            { value: 'minimal', label: '\u6781\u7b80' },
            { value: 'karaoke', label: '\u904d\u5b57' }
          ]),
          settingSelect('\u684c\u9762\u5e03\u5c40', '\u9009\u62e9\u6b4c\u8bcd\u884c\u7684\u6392\u5217\u65b9\u5f0f\u3002', settings.desktopLyricsLayoutMode, 'desktopLyricsLayoutMode', [
            { value: 'default', label: '\u9ed8\u8ba4' },
            { value: 'single', label: '\u5355\u884c' },
            { value: 'double', label: '\u53cc\u884c' }
          ]),
          settingColor('\u684c\u9762\u4e3b\u9898\u8272', '\u684c\u9762\u6b4c\u8bcd\u7a97\u53e3\u7684\u5f3a\u8c03\u989c\u8272\u3002', settings.desktopLyricsThemeColor || '#64b5f6', 'desktopLyricsThemeColor'),
          settingColor('\u684c\u9762\u5b57\u4f53\u989c\u8272', '\u684c\u9762\u6b4c\u8bcd\u6587\u5b57\u989c\u8272\u3002', settings.desktopLyricsFontColor || '#000000', 'desktopLyricsFontColor'),
          settingRange('\u684c\u9762\u900f\u660e\u5ea6', '\u8c03\u6574\u7a97\u53e3\u900f\u660e\u5ea6\u3002', settings.desktopLyricsOpacity == null ? 0.9 : settings.desktopLyricsOpacity, 'desktopLyricsOpacity', 0.3, 1, 0.05, ''),
          settingRange('\u684c\u9762\u5b57\u53f7', '\u8c03\u6574\u684c\u9762\u6b4c\u8bcd\u6587\u5b57\u5927\u5c0f\u3002', settings.desktopLyricsFontSize || 48, 'desktopLyricsFontSize', 18, 96, 1, 'px'),
          settingColor('\u8ff7\u4f60\u6a21\u5f0f\u5b57\u4f53', '\u8ff7\u4f60\u6a21\u5f0f\u4e2d\u7684\u6587\u5b57\u989c\u8272\u3002', settings.miniModeFontColor || '#ffffff', 'miniModeFontColor'),
          settingColor('\u8ff7\u4f60\u6a21\u5f0f\u9ad8\u4eae', '\u8ff7\u4f60\u6a21\u5f0f\u4e2d\u7684\u9ad8\u4eae\u989c\u8272\u3002', settings.miniModeHighlightColor || '#335eea', 'miniModeHighlightColor'),
          settingRange('\u8ff7\u4f60\u6a21\u5f0f\u5b57\u53f7', '\u8c03\u6574\u8ff7\u4f60\u6a21\u5f0f\u6b4c\u8bcd\u5b57\u53f7\u3002', settings.miniModeFontSize || 14, 'miniModeFontSize', 10, 30, 1, 'px')
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u7cfb\u7edf'),
            h('span', { class: 'mb-settings-panel__hint' }, '\u7a97\u53e3\u4e0e\u6545\u969c\u6392\u67e5')
          ]),
          settingToggle('\u7f51\u7edc\u78c1\u76d8', '\u542f\u7528\u7f51\u7edc\u78c1\u76d8\u96c6\u6210\uff0c\u5e76\u6253\u5f00\u914d\u7f6e\u7a97\u53e3\u3002', settings.networkDriveEnabled, 'networkDriveEnabled'),
          settingToggle('\u786c\u4ef6\u52a0\u901f', '\u4fee\u6539\u540e\u53ef\u80fd\u9700\u8981\u91cd\u542f\u5e94\u7528\u3002', settings.hardwareAcceleration, 'hardwareAcceleration'),
          h('div', { class: 'mb-settings-inline-actions' }, [
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openNetworkDrive') }, '\u7f51\u7edc\u78c1\u76d8\u914d\u7f6e'),
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openUserDataFolder') }, '\u7528\u6237\u6570\u636e\u6587\u4ef6\u5939'),
            h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openDevTools') }, '\u5f00\u53d1\u8005\u5de5\u5177')
          ])
        ]),
        h('div', { class: 'mb-settings-panel' }, [
          h('div', { class: 'mb-settings-panel__head' }, [
            h('span', { class: 'mb-settings-panel__title' }, '\u7cfb\u7edf\u6258\u76d8'),
            h('span', { class: 'mb-settings-panel__hint' }, '\u4fdd\u5b58\u540e\u7acb\u5373\u540c\u6b65\u5230 Electron \u6258\u76d8')
          ]),
          settingToggle('\u542f\u7528\u7cfb\u7edf\u6258\u76d8', '\u5728\u7cfb\u7edf\u6258\u76d8\u4e2d\u4fdd\u7559 Auralux \u5165\u53e3\u3002', settings.systemTray, 'systemTray'),
          settings.systemTray === false ? null : settingSelect('\u5173\u95ed\u7a97\u53e3\u65f6', '\u9009\u62e9\u70b9\u51fb\u5173\u95ed\u6309\u94ae\u540e\u7684\u884c\u4e3a\u3002', settings.trayCloseBehavior, 'trayCloseBehavior'),
          settings.systemTray === false ? null : settingToggle('\u542f\u52a8\u65f6\u6700\u5c0f\u5316', '\u6253\u5f00\u8f6f\u4ef6\u540e\u76f4\u63a5\u8fdb\u5165\u6258\u76d8\u72b6\u6001\u3002', settings.trayStartMinimized, 'trayStartMinimized')
        ]),
        h('div', { class: 'mb-settings-grid' }, [
          action('\u7f51\u6613\u4e91\u767b\u5f55', '\u6253\u5f00\u626b\u7801\u6216\u624b\u673a\u53f7\u767b\u5f55\u7a97\u53e3', function () {
            if (self.adapter && typeof self.adapter.openNetEaseLogin === 'function') self.adapter.openNetEaseLogin();
          }),
          action('\u5bfc\u5165\u7f51\u6613\u4e91\u6b4c\u5355', '\u7c98\u8d34\u6b4c\u5355\u94fe\u63a5\u5e76\u540c\u6b65\u5230 Auralux \u6b4c\u5355', function () {
            if (self.adapter && typeof self.adapter.importNeteasePlaylist === 'function') self.adapter.importNeteasePlaylist();
          }),
          action('\u6dfb\u52a0\u672c\u5730\u97f3\u4e50', '\u9009\u62e9\u97f3\u4e50\u6587\u4ef6\u5e76\u52a0\u5165\u66f2\u5e93', function () {
            if (self.adapter && typeof self.adapter.addMusicFiles === 'function') self.adapter.addMusicFiles();
          }),
          action('\u91cd\u65b0\u6253\u5f00\u8fc1\u79fb\u5411\u5bfc', '\u91cd\u65b0\u663e\u793a\u9996\u6b21\u8fc1\u79fb\u5f15\u5bfc\u548c\u4e0b\u4e00\u6b65\u5165\u53e3', function () {
            self.resetMigrationOnboarding();
          }),
          action('\u63d2\u4ef6\u7ba1\u7406', '\u6253\u5f00\u5df2\u5b89\u88c5\u7684\u63d2\u4ef6\u548c\u6269\u5c55\u8bbe\u7f6e\u3002', adapterAction('openPluginManager')),
          action('\u68c0\u67e5\u66f4\u65b0', '\u67e5\u770b Auralux \u662f\u5426\u6709\u53ef\u7528\u66f4\u65b0\u3002', adapterAction('checkUpdates')),
          action('\u9879\u76ee\u4ed3\u5e93', '\u5728\u53ef\u7528\u65f6\u6253\u5f00 Auralux \u9879\u76ee\u9875\u9762\u3002', adapterAction('openRepository'))
        ])
      ])
    ]);
  };

  NewMusicShell.prototype._focusImmersiveCacheEditInput = function () {
    var input = this.root.querySelector('.mb-immersive__cache-edit-input');
    if (!input || input.__mbFocused) return;
    input.__mbFocused = true;
    setTimeout(function () {
      input.focus();
      if (typeof input.select === 'function') input.select();
    }, 0);
  };

  NewMusicShell.prototype._updateProgressOnly = function () {
    var cur = this.root.querySelector('.mb-player__progress .mb-player__time');
    if (cur) cur.textContent = MBUtil.formatTime(this.state.position);
    var fill = this.root.querySelector('.mb-player__progress .mb-slider__fill');
    var thumb = this.root.querySelector('.mb-player__progress .mb-slider__thumb');
    var ratio = this.state.duration > 0 ? (this.state.position / this.state.duration) : 0;
    ratio = clamp(ratio, 0, 1);
    if (fill) fill.style.width = (ratio * 100) + '%';
    if (thumb) thumb.style.left = (ratio * 100) + '%';
  };

  NewMusicShell.prototype._scheduleImmersiveProgressUpdate = function () {
    if (this.state.view !== 'immersive-player') return;
    this._syncImmersiveSmoothClock();
    this._ensureImmersiveSmoothLoop();
  };

  NewMusicShell.prototype._syncImmersiveSmoothClock = function () {
    var now = performance.now();
    this._immersiveSmoothBasePosition = Number(this.state.position) || 0;
    this._immersiveSmoothBaseTime = now;
    this._immersiveSmoothLastSync = now;
  };

  NewMusicShell.prototype._resetImmersiveVisualizerState = function () {
    this._immersiveLastSpectrum = [];
    this._immersiveLastSpectrumAt = 0;
    this._immersiveLastBarHeights = [];
  };

  NewMusicShell.prototype._getImmersiveVisualPosition = function () {
    var base = Number(this._immersiveSmoothBasePosition) || Number(this.state.position) || 0;
    if (!this.state.isPlaying || !this._immersiveSmoothBaseTime) return base;
    var duration = this.state.duration || (this.state.currentTrack && this.state.currentTrack.duration) || 0;
    var elapsed = Math.max(0, (performance.now() - this._immersiveSmoothBaseTime) / 1000);
    return duration > 0 ? clamp(base + elapsed, 0, duration) : base + elapsed;
  };

  NewMusicShell.prototype._ensureImmersiveSmoothLoop = function () {
    if (this._immersiveSmoothFrame || this.state.view !== 'immersive-player') return;
    var self = this;
    function step() {
      if (self.state.view !== 'immersive-player') {
        self._immersiveSmoothFrame = 0;
        return;
      }
      var now = performance.now();
      var smoothVideoMode = self._isImmersiveSmoothVideoMode();
      var minFrameMs = smoothVideoMode ? 33 : 0;
      if (!minFrameMs || now - self._immersiveLastVisualUpdate >= minFrameMs) {
        self._immersiveLastVisualUpdate = now;
        self._updateImmersiveProgressOnly(self._getImmersiveVisualPosition(), now);
      }
      if (self.state.isPlaying) {
        self._immersiveSmoothFrame = requestAnimationFrame(step);
      } else {
        self._immersiveSmoothFrame = 0;
      }
    }
    this._immersiveSmoothFrame = requestAnimationFrame(step);
  };

  NewMusicShell.prototype._hasImmersiveVideoBackground = function () {
    var bg = this.state.immersiveBackground || {};
    return bg.type === 'video' && Boolean(bg.src);
  };

  NewMusicShell.prototype._isImmersiveSmoothVideoMode = function () {
    var bg = this.state.immersiveBackground || {};
    return bg.type === 'video' && bg.quality === 'smooth' && Boolean(bg.src);
  };

  NewMusicShell.prototype._getImmersiveDomCache = function () {
    if (this._immersiveDomCache) return this._immersiveDomCache;
    var lyrics = this.root.querySelectorAll('.mb-immersive__lyric');
    this._immersiveDomCache = {
      currentTime: this.root.querySelector('[data-role="current-time"]'),
      waveCurrent: this.root.querySelector('[data-role="wave-current"]'),
      wave: this.root.querySelector('[data-role="immersive-wave"]'),
      seekFill: this.root.querySelector('.mb-immersive__seek-fill'),
      seekThumb: this.root.querySelector('.mb-immersive__seek-thumb'),
      bars: this.root.querySelectorAll('.mb-immersive__wave-bar'),
      pulseCore: this.root.querySelector('.mb-immersive__pulse-core'),
      lyrics: lyrics,
      lyricChars: typeof WeakMap === 'function' ? new WeakMap() : null
    };
    return this._immersiveDomCache;
  };

  NewMusicShell.prototype._getImmersiveLyricChars = function (node) {
    var cache = this._getImmersiveDomCache();
    if (cache.lyricChars) {
      var cached = cache.lyricChars.get(node);
      if (cached) return cached;
      cached = node.querySelectorAll('.mb-immersive__lyric-char');
      cache.lyricChars.set(node, cached);
      return cached;
    }
    return node.querySelectorAll('.mb-immersive__lyric-char');
  };

  NewMusicShell.prototype._updateImmersiveProgressOnly = function (visualPosition, now) {
    if (this.state.view !== 'immersive-player') return;
    if (this._immersivePerf) this._immersivePerf.markProgressUpdate();

    now = now || performance.now();
    var smoothVideoMode = this._isImmersiveSmoothVideoMode();
    var duration = this.state.duration || (this.state.currentTrack && this.state.currentTrack.duration) || 0;
    var position = typeof visualPosition === 'number' ? visualPosition : this.state.position;
    var ratio = duration > 0 ? clamp(position / duration, 0, 1) : 0;
    var cache = this._getImmersiveDomCache();
    var ratioPercent = (ratio * 100).toFixed(smoothVideoMode ? 2 : 3) + '%';
    if (Math.abs(ratio - this._immersiveLastRatio) > 0.0005) {
      this._immersiveLastRatio = ratio;
      if (cache.wave) {
        cache.wave.style.setProperty('--seek-ratio', ratio.toFixed(5));
        cache.wave.style.setProperty('--seek-percent', ratioPercent);
      }
      else {
        if (cache.seekFill) cache.seekFill.style.width = ratioPercent;
        if (cache.seekThumb) cache.seekThumb.style.left = ratioPercent;
      }
    }

    if (!smoothVideoMode || now - this._immersiveLastTextUpdate >= 250) {
      this._immersiveLastTextUpdate = now;
      var formattedTime = MBUtil.formatTime(position);
      if (cache.currentTime && cache.currentTime.textContent !== formattedTime) cache.currentTime.textContent = formattedTime;
      if (cache.waveCurrent && cache.waveCurrent.textContent !== formattedTime) cache.waveCurrent.textContent = formattedTime;
    }

    var style = this.state.immersiveVisualizerStyle || 'classic';
    var bars = cache.bars;
    var lastActive = Math.round((bars.length - 1) * ratio);
    var rawSpectrum = this.adapter && typeof this.adapter.getFrequencySpectrum === 'function'
      ? this.adapter.getFrequencySpectrum(bars.length)
      : [];
    var spectrum = this._stabilizeImmersiveSpectrum(rawSpectrum, bars.length, now);
    if (lastActive !== this._immersiveLastWaveActive || spectrum.length) {
      this._immersiveLastWaveActive = lastActive;
      var total = 0;
      var bass = 0;
      var mid = 0;
      for (var i = 0; i < bars.length; i++) {
        var value = typeof spectrum[i] === 'number' ? spectrum[i] : 0;
        var normalized = Math.min(1, Math.max(0, value));
        total += normalized;
        if (i < bars.length * 0.22) bass += normalized;
        else if (i < bars.length * 0.68) mid += normalized;
        var height = this._immersiveVisualizerHeight(style, i, bars.length, normalized, spectrum.length, now);
        height = this._smoothImmersiveBarHeight(i, height, spectrum.length, now);
        bars[i].style.height = height.toFixed(1) + '%';
        bars[i].style.setProperty('--bar-energy', normalized.toFixed(3));
        bars[i].classList.toggle('is-active', i <= lastActive);
        bars[i].classList.toggle('has-fft', spectrum.length > 0);
      }
      var average = bars.length ? total / bars.length : 0;
      var bassAverage = bars.length ? bass / Math.max(1, Math.floor(bars.length * 0.22)) : 0;
      var midAverage = bars.length ? mid / Math.max(1, Math.floor(bars.length * 0.46)) : 0;
      if (cache.wave) {
        cache.wave.style.setProperty('--pickup-energy', average.toFixed(3));
        cache.wave.style.setProperty('--pickup-bass', bassAverage.toFixed(3));
        cache.wave.style.setProperty('--pickup-mid', midAverage.toFixed(3));
      }
      if (cache.pulseCore) {
        cache.pulseCore.style.transform = 'scaleX(' + (0.42 + Math.min(1, average * 1.8)).toFixed(3) + ')';
        cache.pulseCore.style.opacity = (0.42 + Math.min(0.48, average * 0.9)).toFixed(3);
      }
      this._recordImmersiveDebugFrame({
        now: now,
        position: position,
        duration: duration,
        ratio: ratio,
        rawSpectrumLength: rawSpectrum.length || 0,
        spectrumLength: spectrum.length || 0,
        average: average,
        bassAverage: bassAverage,
        midAverage: midAverage,
        lastActive: lastActive
      });
    }

    var lyrics = this.state.immersiveLyrics || [];
    if (!lyrics.length) return;

    var active = -1;
    for (var j = 0; j < lyrics.length; j++) {
      if ((lyrics[j].time || 0) <= position) active = j;
      else break;
    }

    var activeTime = active >= 0 ? Number(lyrics[active] && lyrics[active].time) : -1;
    var nextTime = active + 1 < lyrics.length ? Number(lyrics[active + 1] && lyrics[active + 1].time) : duration;
    var lineDuration = Math.max(0.8, nextTime - activeTime);
    var lineProgress = activeTime >= 0 ? clamp((position - activeTime) / lineDuration, 0, 1) : 0;
    var rendered = cache.lyrics;
    if (!rendered.length) {
      this.render();
      return;
    }

    if (active < 0) {
      if (this._immersiveLastActive !== active || this.state.immersiveLyricsMode !== this._immersiveLastMode) {
        for (var preludeIndex = 0; preludeIndex < rendered.length; preludeIndex++) {
          var preludeNode = rendered[preludeIndex];
          preludeNode.classList.remove('is-active');
          preludeNode.classList.toggle('is-dim', Number(preludeNode.getAttribute('data-index')) > 3);
          this._resetImmersiveLyricChars(preludeNode);
        }
        this._immersiveLastActive = active;
        this._immersiveLastMode = this.state.immersiveLyricsMode;
        this._immersiveLastWordKey = '';
      }
      if (this._immersivePerf) this._immersivePerf.maybeLog(this.root);
      return;
    }

    var activeChanged = active !== this._immersiveLastActive || this.state.immersiveLyricsMode !== this._immersiveLastMode;
    if (activeChanged) this._immersiveLastWordKey = '';
    var hasActiveLine = false;
    for (var k = 0; k < rendered.length; k++) {
      var node = rendered[k];
      var lineTime = Number(node.getAttribute('data-time'));
      var lineIndex = Number(node.getAttribute('data-index'));
      var isActive = lineTime === activeTime;
      if (isActive) hasActiveLine = true;
      if (activeChanged) {
        node.classList.toggle('is-active', isActive);
        node.classList.toggle('is-dim', lineIndex >= 0 && Math.abs(lineIndex - active) > 3);
        if (this.state.immersiveLyricsMode === 'standard' && lineIndex >= 0) {
          this._positionImmersiveLyricNode(node, lineIndex - active);
        } else if (lineIndex >= 0) {
          this._positionImmersiveLyricNodeForMode(node, this.state.immersiveLyricsMode, lineIndex - active);
        }
        if (!isActive) this._resetImmersiveLyricChars(node);
      }
      if (isActive) this._updateImmersiveLyricChars(node, lineProgress, position);
    }

    if (!hasActiveLine) {
      this._refreshImmersiveLyricsWindow(active);
      return;
    }
    this._immersiveLastActive = active;
    this._immersiveLastMode = this.state.immersiveLyricsMode;
    if (this._immersivePerf) this._immersivePerf.maybeLog(this.root);
  };

  NewMusicShell.prototype._recordImmersiveDebugFrame = function (frame) {
    if (!this._isImmersiveDebugEnabled()) return;
    var globalObject = typeof window !== 'undefined' ? window : global;
    var state = globalObject.__auraluxImmersiveDebug || {
      startedAt: Date.now(),
      frames: [],
      rawEmpty: 0,
      rawNonEmpty: 0,
      spectrumEmpty: 0,
      spectrumNonEmpty: 0,
      activeChanges: 0,
      maxRatioDelta: 0,
      maxAverageDelta: 0,
      lastActive: null,
      lastRatio: null,
      lastAverage: null
    };

    var rawLength = frame.rawSpectrumLength || 0;
    var spectrumLength = frame.spectrumLength || 0;
    if (rawLength) state.rawNonEmpty += 1; else state.rawEmpty += 1;
    if (spectrumLength) state.spectrumNonEmpty += 1; else state.spectrumEmpty += 1;
    if (state.lastActive !== null && state.lastActive !== frame.lastActive) state.activeChanges += 1;
    if (state.lastRatio !== null) {
      state.maxRatioDelta = Math.max(state.maxRatioDelta, Math.abs(frame.ratio - state.lastRatio));
    }
    if (state.lastAverage !== null) {
      state.maxAverageDelta = Math.max(state.maxAverageDelta, Math.abs(frame.average - state.lastAverage));
    }

    state.lastActive = frame.lastActive;
    state.lastRatio = frame.ratio;
    state.lastAverage = frame.average;
    state.lastFrameAt = Date.now();
    state.track = this.state.currentTrack ? {
      title: this.state.currentTrack.title,
      artist: this.state.currentTrack.artist,
      source: this.state.currentTrack.source
    } : null;

    state.frames.push({
      t: Math.round(frame.now),
      pos: Number(frame.position.toFixed(3)),
      ratio: Number(frame.ratio.toFixed(5)),
      raw: rawLength,
      stable: spectrumLength,
      avg: Number(frame.average.toFixed(3)),
      bass: Number(frame.bassAverage.toFixed(3)),
      mid: Number(frame.midAverage.toFixed(3)),
      active: frame.lastActive
    });
    if (state.frames.length > 240) state.frames.splice(0, state.frames.length - 240);
    globalObject.__auraluxImmersiveDebug = state;
  };

  NewMusicShell.prototype._isImmersiveDebugEnabled = function () {
    try {
      return global.localStorage && global.localStorage.getItem('auraluxImmersiveDebug') === '1';
    } catch (_) {
      return false;
    }
  };

  NewMusicShell.prototype._stabilizeImmersiveSpectrum = function (rawSpectrum, count, now) {
    if (Array.isArray(rawSpectrum) && rawSpectrum.length) {
      this._immersiveLastSpectrum = rawSpectrum.slice(0, count);
      this._immersiveLastSpectrumAt = now || performance.now();
      return rawSpectrum;
    }

    var last = this._immersiveLastSpectrum || [];
    if (!last.length) return [];

    var age = (now || performance.now()) - (this._immersiveLastSpectrumAt || 0);
    if (age > 450) return [];

    var decay = Math.max(0, 1 - age / 450);
    return last.slice(0, count).map(function (value) {
      return Math.max(0, Math.min(1, value * decay));
    });
  };

  NewMusicShell.prototype._smoothImmersiveBarHeight = function (index, nextHeight, hasSpectrum) {
    if (!hasSpectrum) {
      this._immersiveLastBarHeights[index] = nextHeight;
      return nextHeight;
    }

    var previous = this._immersiveLastBarHeights[index];
    if (typeof previous !== 'number') {
      this._immersiveLastBarHeights[index] = nextHeight;
      return nextHeight;
    }

    var rising = nextHeight > previous;
    var alpha = rising ? 0.46 : 0.28;
    var smoothed = previous + (nextHeight - previous) * alpha;
    this._immersiveLastBarHeights[index] = smoothed;
    return smoothed;
  };

  NewMusicShell.prototype._immersiveVisualizerHeight = function (style, index, count, value, hasSpectrum, now) {
    if (!hasSpectrum) {
      var idle = Math.sin((now || 0) * 0.004 + index * 0.7) * 0.5 + 0.5;
      return style === 'pulse' ? 18 + idle * 18 : 12 + idle * 42;
    }

    if (style === 'energy') {
      var center = Math.abs((index / Math.max(1, count - 1)) - 0.5) * 2;
      var shape = 1 - Math.pow(center, 1.8) * 0.42;
      var boosted = Math.min(1, value * (index < count * 0.28 ? 1.55 : 1.15));
      return 10 + boosted * 84 * shape;
    }

    if (style === 'pulse') {
      return 12 + Math.min(1, value * 1.25) * 30;
    }

    if (style === 'orbit') {
      var orbitShape = 0.68 + Math.sin(index * 0.42) * 0.12;
      return 18 + Math.min(1, value * 1.45) * 68 * orbitShape;
    }

    return 8 + value * 92;
  };

  NewMusicShell.prototype._positionImmersiveLyricNodeForMode = function (node, mode, slot) {
    if (mode === 'wrap') {
      this._positionImmersiveWrapLyricNode(node, slot);
      return;
    }
    if (mode === 'fragments') {
      this._positionImmersiveFragmentLyricNode(node, slot);
      return;
    }
    if (mode === 'rail') {
      this._positionImmersiveRailLyricNode(node, slot);
    }
  };

  NewMusicShell.prototype._positionImmersiveWrapLyricNode = function (node, slot) {
    var distance = Math.min(Math.abs(slot), 6);
    var angle = slot * 16;
    var rad = angle * Math.PI / 180;
    var x = 94 + Math.sin(rad) * 4;
    var y = 50 + slot * 8.8;
    var opacity = distance > 5 ? 0.1 : Math.max(0.18, 1 - distance * 0.15);
    var scale = Math.max(0.82, 1 - distance * 0.045);
    node.style.setProperty('--slot-x', x.toFixed(2) + '%');
    node.style.setProperty('--slot-y', y.toFixed(2) + '%');
    node.style.setProperty('--slot-rotate', (slot * -2.6).toFixed(2) + 'deg');
    node.style.setProperty('--slot-scale', scale.toFixed(3));
    node.style.opacity = opacity.toFixed(3);
    node.style.zIndex = String(20 - distance);
  };

  NewMusicShell.prototype._positionImmersiveFragmentLyricNode = function (node, slot) {
    var map = {
      '-3': [50, 16, -4, 0.62],
      '-2': [73, 24, 3, 0.72],
      '-1': [57, 36, -2, 0.86],
      '0': [66, 50, 0, 1],
      '1': [78, 64, 2, 0.82],
      '2': [54, 77, -3, 0.68],
      '3': [76, 86, 4, 0.56],
      '4': [62, 93, 0, 0.44]
    };
    var values = map[String(slot)] || [72, 50 + slot * 12, 0, 0.35];
    node.style.setProperty('--frag-x', values[0] + '%');
    node.style.setProperty('--frag-y', values[1] + '%');
    node.style.setProperty('--frag-rotate', values[2] + 'deg');
    node.style.setProperty('--frag-scale', values[3]);
    node.style.opacity = (slot === 0 ? 1 : Math.max(0.18, values[3] * 0.78)).toFixed(3);
    node.style.zIndex = String(20 - Math.abs(slot));
  };

  NewMusicShell.prototype._positionImmersiveRailLyricNode = function (node, slot) {
    var x = 50 + slot * 18;
    var lane = slot === 0 ? 0 : (slot % 2 === 0 ? -1 : 1);
    var y = 50 + lane * 18;
    var distance = Math.min(Math.abs(slot), 3);
    node.style.setProperty('--rail-x', x + '%');
    node.style.setProperty('--rail-y', y + '%');
    node.style.setProperty('--rail-scale', (slot === 0 ? 1 : Math.max(0.72, 0.9 - distance * 0.06)).toFixed(3));
    node.style.opacity = (slot === 0 ? 1 : Math.max(0.2, 0.72 - distance * 0.15)).toFixed(3);
    node.style.zIndex = String(20 - distance);
  };

  NewMusicShell.prototype._refreshImmersiveLyricsWindow = function (active) {
    if (this._immersiveLyricsRefreshPending) return;
    this._immersiveLyricsRefreshPending = true;
    var self = this;
    requestAnimationFrame(function () {
      self._immersiveLyricsRefreshPending = false;
      if (self.state.view !== 'immersive-player') return;
      self._immersiveLastActive = active;
      self._immersiveLastWordKey = '';
      self._immersiveRenderActive = active;
      self.render();
      self._immersiveRenderActive = null;
    });
  };

  NewMusicShell.prototype._positionImmersiveLyricNode = function (node, slot) {
    var distance = Math.min(Math.abs(slot), 7);
    var radius = 360;
    var angle = Math.max(-82, Math.min(82, slot * -17));
    var rad = angle * Math.PI / 180;
    var y = Math.sin(rad) * radius;
    var z = (Math.cos(rad) - 1) * radius;
    var opacity = distance > 6 ? 0 : Math.max(0.12, 1 - distance * 0.14);
    var scale = Math.max(0.76, 1 - distance * 0.04);
    node.style.setProperty('--lyric-y', y + 'px');
    node.style.setProperty('--lyric-rotate', angle + 'deg');
    node.style.setProperty('--lyric-z', z + 'px');
    node.style.setProperty('--lyric-scale', scale.toFixed(3));
    node.style.opacity = opacity.toFixed(3);
  };

  NewMusicShell.prototype._updateImmersiveLyricChars = function (node, progress, currentTime) {
    if (this._immersivePerf) this._immersivePerf.markLyricCharUpdate();
    var chars = this._getImmersiveLyricChars(node);
    if (!chars.length) return;
    var hasTimedWords = false;
    for (var timedIndex = 0; timedIndex < chars.length; timedIndex++) {
      if (Number.isFinite(Number(chars[timedIndex].getAttribute('data-word-time')))) {
        hasTimedWords = true;
        break;
      }
    }

    if (hasTimedWords) {
      var currentTimedIndex = -1;
      for (var timed = 0; timed < chars.length; timed++) {
        var charNode = chars[timed];
        var start = Number(charNode.getAttribute('data-word-time'));
        var end = Number(charNode.getAttribute('data-word-end-time'));
        if (!Number.isFinite(end)) {
          var next = chars[timed + 1] ? Number(chars[timed + 1].getAttribute('data-word-time')) : NaN;
          end = Number.isFinite(next) ? next : start + 0.35;
        }
        if (Number.isFinite(start) && currentTime >= start && currentTime < end) {
          currentTimedIndex = timed;
          break;
        }
      }
      var timedKey = 'timed:' + currentTimedIndex;
      if (timedKey === this._immersiveLastWordKey) return;
      this._immersiveLastWordKey = timedKey;
      for (var timedApply = 0; timedApply < chars.length; timedApply++) {
        var timedNode = chars[timedApply];
        var timedStart = Number(timedNode.getAttribute('data-word-time'));
        var timedEnd = Number(timedNode.getAttribute('data-word-end-time'));
        if (!Number.isFinite(timedEnd)) {
          var timedNext = chars[timedApply + 1] ? Number(chars[timedApply + 1].getAttribute('data-word-time')) : NaN;
          timedEnd = Number.isFinite(timedNext) ? timedNext : timedStart + 0.35;
        }
        timedNode.classList.toggle('is-sung', Number.isFinite(timedStart) && currentTime >= timedEnd);
        timedNode.classList.toggle('is-current', timedApply === currentTimedIndex);
      }
      return;
    }

    var lead = Math.min(2, Math.max(0, Math.floor(chars.length * 0.08)));
    var current = Math.min(chars.length - 1, Math.max(0, Math.floor(progress * chars.length) + lead));
    var fallbackKey = 'fallback:' + current;
    if (fallbackKey === this._immersiveLastWordKey) return;
    this._immersiveLastWordKey = fallbackKey;
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.toggle('is-sung', i < current);
      chars[i].classList.toggle('is-current', i === current);
    }
  };

  NewMusicShell.prototype._resetImmersiveLyricChars = function (node) {
    var chars = node.querySelectorAll('.mb-immersive__lyric-char.is-sung, .mb-immersive__lyric-char.is-current');
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.remove('is-sung', 'is-current');
    }
  };

  NewMusicShell.prototype._updateVolumeOnly = function () {
    var volume = this.state.muted ? 0 : this.state.volume;
    var meterFill = this.root.querySelector('.mb-volume .mb-slider__fill');
    var meterThumb = this.root.querySelector('.mb-volume .mb-slider__thumb');
    if (meterFill) meterFill.style.width = (volume * 100) + '%';
    if (meterThumb) meterThumb.style.left = (volume * 100) + '%';
  };

  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  function indexOfTrack(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function withRole(node, roleClass) {
    if (node) node.classList.add(roleClass);
    return node;
  }

  function wrapContent(content) {
    var inner = h('div', { class: 'mb-content' });
    if (content) inner.appendChild(content);
    return inner;
  }

  function recentTracks(M) {
    return M.queue.tracks.slice(0, 6).map(clone);
  }

  function loadSearchHistory() {
    try {
      var raw = localStorage.getItem('auralux.search.history');
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function (item) {
        return typeof item === 'string' && item.trim().length > 0;
      }).slice(0, 10) : [];
    } catch (_) {
      return [];
    }
  }

  function saveSearchHistory(history) {
    try {
      localStorage.setItem('auralux.search.history', JSON.stringify((history || []).slice(0, 10)));
    } catch (_) {}
  }

  function loadMigrationOnboardingState() {
    try {
      var raw = localStorage.getItem('auralux.onboarding.migration');
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          completed: Boolean(parsed.completed),
          skipped: Boolean(parsed.skipped),
          completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : ''
        };
      }
    } catch (_) {}
    return { completed: false, skipped: false, completedAt: '' };
  }

  function saveMigrationOnboardingState(nextState) {
    var normalized = {
      completed: Boolean(nextState && nextState.completed),
      skipped: Boolean(nextState && nextState.skipped),
      completedAt: nextState && typeof nextState.completedAt === 'string' ? nextState.completedAt : ''
    };
    try {
      localStorage.setItem('auralux.onboarding.migration', JSON.stringify(normalized));
    } catch (_) {}
    return normalized;
  }

  function applySearchFilter(results, searchFilter) {
    var filter = searchFilter || 'all';
    var entities = results.entities || { artists: [], albums: [], playlists: [] };
    if (filter === 'songs' || filter === 'all') {
      return {
        local: results.local || [],
        netease: results.netease || [],
        entities: filter === 'all' ? entities : { artists: [], albums: [], playlists: [] }
      };
    }
    return {
      local: [],
      netease: [],
      entities: {
        artists: filter === 'artists' ? entities.artists || [] : [],
        albums: filter === 'albums' ? entities.albums || [] : [],
        playlists: filter === 'playlists' ? entities.playlists || [] : []
      }
    };
  }

  function buildSearchSuggestions(query, history, tracks, playlists) {
    var q = (query || '').trim().toLowerCase();
    var values = (history || [])
      .concat((tracks || []).map(function (track) { return track.title; }))
      .concat((tracks || []).map(function (track) { return track.artist; }))
      .concat((tracks || []).map(function (track) { return track.album || ''; }))
      .concat((playlists || []).map(function (playlist) { return playlist.name; }));
    return uniqueSearchValues(values).filter(function (value) {
      var lower = value.toLowerCase();
      return (!q || lower.indexOf(q) !== -1) && lower !== q;
    }).slice(0, 8);
  }

  function buildSearchEntities(query, tracks, playlists) {
    var q = (query || '').trim().toLowerCase();
    var artists = {};
    var albums = {};
    (tracks || []).forEach(function (track) {
      if (matchesSearchValue(track.artist, q)) {
        var artistKey = track.source + ':artist:' + track.artist.toLowerCase();
        if (!artists[artistKey]) {
          artists[artistKey] = {
            id: artistKey,
            type: 'artist',
            title: track.artist,
            subtitle: track.source === 'netease' ? '\u7f51\u6613\u4e91\u6b4c\u624b' : '\u672c\u5730\u6b4c\u624b',
            source: track.source,
            cover: track.cover
          };
        }
      }
      if (matchesSearchValue(track.album, q)) {
        var albumKey = track.source + ':album:' + track.album.toLowerCase();
        if (!albums[albumKey]) {
          albums[albumKey] = {
            id: albumKey,
            type: 'album',
            title: track.album,
            subtitle: track.artist || '',
            source: track.source,
            cover: track.cover
          };
        }
      }
    });

    return {
      artists: Object.keys(artists).map(function (key) { return artists[key]; }).slice(0, 8),
      albums: Object.keys(albums).map(function (key) { return albums[key]; }).slice(0, 8),
      playlists: (playlists || []).filter(function (playlist) {
        return matchesSearchValue(playlist.name, q);
      }).slice(0, 8).map(function (playlist) {
        return {
          id: 'playlist:' + playlist.id,
          type: 'playlist',
          title: playlist.name,
          subtitle: String(playlist.trackCount || (playlist.trackIds || []).length || 0) + ' \u9996\u6b4c',
          source: playlist.source || 'local',
          cover: playlist.cover,
          playlistId: playlist.id
        };
      })
    };
  }

  function matchesSearchValue(value, query) {
    return Boolean(query && value && String(value).toLowerCase().indexOf(query) !== -1);
  }

  function uniqueSearchValues(values) {
    var seen = {};
    return (values || []).map(function (value) {
      return String(value || '').trim();
    }).filter(Boolean).filter(function (value) {
      var key = value.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  global.NewMusicShell = NewMusicShell;
})(window);
