(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;
  var TrackRow = global.MBTrackRow;
  var SourceBadge = global.MBSourceBadge;
  var TRACKLIST_INITIAL_RENDER_LIMIT = 80;
  var TRACKLIST_RENDER_STEP = 80;

  function totalDuration(tracks) {
    var seconds = tracks.reduce(function (sum, t) { return sum + (t.duration || 0); }, 0);
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? (hours + 'h ' + minutes + 'm') : (minutes + 'm');
  }

  function PlaylistView(o) {
    var p = o.playlist;
    var canSync = p.source === 'netease';
    var cacheSummary = buildCacheSummary(o.tracks || []);
    var openState = o.openState || { status: 'idle', message: '' };
    var isOpening = openState.status === 'loading';
    var hasOpenError = openState.status === 'error';
    var hasTracks = (o.tracks || []).length > 0;
    var actionsDisabled = isOpening || hasOpenError || !hasTracks;

    var header = h('div', { class: 'mb-pl-header' }, [
      cover(p.cover, 'mb-pl-header__cover'),
      h('div', { class: 'mb-pl-header__info' }, [
        h('div', { class: 'mb-pl-header__src-row' }, [
          SourceBadge(p.source),
          canSync && p.updatedAt ? h('span', { class: 'mb-section__more', style: { margin: 0 } }, '\u5df2\u540c\u6b65\u0020\u00b7\u0020' + p.updatedAt) : null
        ]),
        h('h1', { class: 'mb-pl-header__title ellipsis' }, p.name),
        h('p', { class: 'mb-pl-header__desc' }, p.description || ''),
        h('div', { class: 'mb-pl-header__meta' }, [
          h('span', { class: 'numeric' }, p.trackCount + ' \u9996'),
          h('span', {}, '\u00b7'),
          h('span', { class: 'numeric' }, totalDuration(o.tracks)),
          h('span', {}, '\u00b7'),
          h('span', {}, p.source === 'netease' ? ('\u66f4\u65b0\u4e8e ' + (p.updatedAt || '-')) : ('\u521b\u5efa\u4e8e ' + (p.updatedAt || '-')))
        ]),
        h('div', { class: 'mb-pl-cache-summary' }, [
          cacheSummaryItem('\u79bb\u7ebf', cacheSummary.offlinePlayable, cacheSummary.total),
          cacheSummaryItem('\u5c01\u9762', cacheSummary.coverCached, cacheSummary.total),
          cacheSummaryItem('\u6b4c\u8bcd', cacheSummary.lyricsCached, cacheSummary.total)
        ]),
        h('div', { class: 'mb-pl-header__actions' }, [
          h('button', { class: 'mb-btn mb-btn--primary', 'data-action': 'play-all', onclick: o.onPlayAll, disabled: actionsDisabled }, [
            iconSpan(MBIcons.play(16)), '\u64ad\u653e\u5168\u90e8'
          ]),
          h('button', { class: 'mb-btn mb-btn--ghost', 'data-action': 'shuffle', onclick: o.onShuffle, disabled: actionsDisabled }, [
            iconSpan(MBIcons.shuffle(16)), '\u968f\u673a\u64ad\u653e'
          ]),
          h('button', {
            class: 'mb-btn mb-btn--ghost' + (o.offlineFilter ? ' is-active' : ''),
            'data-action': 'offline-filter',
            onclick: o.onToggleOfflineFilter,
            disabled: isOpening || hasOpenError,
            title: '\u53ea\u663e\u793a\u5df2\u7f13\u5b58\u6216\u5df2\u5339\u914d\u672c\u5730\u6587\u4ef6\u7684\u66f2\u76ee'
          }, [
            iconSpan(MBIcons.importIcon(16)), '\u79bb\u7ebf\u53ef\u64ad'
          ]),
          canSync && !isOpening && !hasOpenError ? h('button', {
            class: 'mb-btn mb-btn--ghost' + (o.syncing ? ' is-loading' : ''),
            onclick: o.onRefresh,
            disabled: o.syncing,
            title: '\u4ece\u7f51\u6613\u4e91\u5237\u65b0\u672c\u6b4c\u5355'
          }, [
            iconSpan(MBIcons.refresh(16)),
            o.syncing ? '\u540c\u6b65\u4e2d' : '\u5237\u65b0'
          ]) : null
        ])
      ])
    ]);

    var thead = h('div', { class: 'mb-tracklist__head' }, [
      h('span', {}, '#'),
      h('span', {}, '\u5c01\u9762'),
      h('span', {}, '\u6807\u9898'),
      h('span', {}, '\u4e13\u8f91'),
      h('span', {}, ''),
      h('span', { style: { textAlign: 'right' } }, '\u65f6\u957f'),
      h('span', { style: { textAlign: 'right' } }, '\u6765\u6e90')
    ]);

    var rows = progressiveTrackRows(o.tracks || [], {
      currentTrackId: o.currentTrackId,
      isPlaying: o.isPlaying,
      onPlayTrack: o.onPlayTrack,
      onToggleLike: o.onToggleLike,
      onAddToQueue: o.onAddToQueue,
      onOpenSongDetail: o.onOpenSongDetail,
      onDeleteTrackFile: o.onDeleteTrackFile,
      onCorrectLocalMatch: o.onCorrectLocalMatch
    });

    return h('div', { class: 'mb-content__inner' }, [
      header,
      playlistStatus(openState, o),
      hasTracks ? h('div', { class: 'mb-tracklist' }, [thead].concat(rows)) : playlistEmptyState(openState, o)
    ]);
  }

  function playlistStatus(openState, o) {
    if (!openState || (openState.status !== 'loading' && openState.status !== 'error')) {
      return null;
    }
    if (openState.status === 'loading') {
      return h('div', { class: 'mb-pl-status is-loading' }, [
        h('div', { class: 'mb-pl-status__spinner', 'aria-hidden': 'true' }),
        h('div', { class: 'mb-pl-status__copy' }, [
          h('strong', {}, '\u6b63\u5728\u52a0\u8f7d\u8fdc\u7a0b\u6b4c\u5355'),
          h('span', {}, openState.message || '\u66f2\u76ee\u52a0\u8f7d\u5b8c\u6210\u540e\u53ef\u76f4\u63a5\u64ad\u653e\uff0c\u4e0d\u4f1a\u81ea\u52a8\u5bfc\u5165\u672c\u5730\u6b4c\u5355\u3002')
        ])
      ]);
    }
    return h('div', { class: 'mb-pl-status is-error' }, [
      h('div', { class: 'mb-pl-status__mark', 'aria-hidden': 'true' }, '!'),
      h('div', { class: 'mb-pl-status__copy' }, [
        h('strong', {}, '\u8fdc\u7a0b\u6b4c\u5355\u52a0\u8f7d\u5931\u8d25'),
        h('span', {}, openState.message || '\u7f51\u6613\u4e91\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u53ef\u91cd\u8bd5\u6216\u5148\u8fd4\u56de\u9996\u9875\u3002')
      ]),
      h('div', { class: 'mb-pl-status__actions' }, [
        h('button', { class: 'mb-btn mb-btn--primary', type: 'button', 'data-action': 'retry-open', onclick: o.onRetryOpen }, '\u91cd\u8bd5'),
        h('button', { class: 'mb-btn mb-btn--ghost', type: 'button', 'data-action': 'back-from-open-error', onclick: o.onBackFromOpenError }, '\u8fd4\u56de')
      ])
    ]);
  }

  function playlistEmptyState(openState, o) {
    if (openState && (openState.status === 'loading' || openState.status === 'error')) {
      return null;
    }
    var title = o.offlineFilter
      ? '\u79bb\u7ebf\u53ef\u64ad\u66f2\u76ee\u4e3a\u7a7a'
      : '\u6b4c\u5355\u6682\u65f6\u6ca1\u6709\u66f2\u76ee';
    var desc = o.offlineFilter
      ? '\u53d6\u6d88\u79bb\u7ebf\u7b5b\u9009\u540e\u53ef\u67e5\u770b\u672a\u7f13\u5b58\u6216\u672a\u5339\u914d\u7684\u66f2\u76ee\u3002'
      : '\u8fd9\u4e2a\u6b4c\u5355\u8fd8\u6ca1\u6709\u53ef\u64ad\u653e\u7684\u66f2\u76ee\u3002';
    return h('div', { class: 'mb-pl-empty' }, [
      h('div', { class: 'mb-pl-empty__title' }, title),
      h('div', { class: 'mb-pl-empty__desc' }, desc)
    ]);
  }

  function createTrackRow(t, i, options) {
    return TrackRow({
      track: t,
      index: i + 1,
      isCurrent: options.currentTrackId === t.id,
      isPlaying: options.isPlaying && options.currentTrackId === t.id,
      onPlay: options.onPlayTrack,
      onToggleLike: options.onToggleLike,
      onAddToQueue: options.onAddToQueue,
      onOpenSongDetail: options.onOpenSongDetail,
      onDeleteTrackFile: options.onDeleteTrackFile,
      onCorrectLocalMatch: options.onCorrectLocalMatch
    });
  }

  function progressiveTrackRows(tracks, options) {
    var rows = [];
    var renderedCount = 0;

    function renderRows(from, to) {
      var nextRows = [];
      for (var i = from; i < to; i++) {
        nextRows.push(createTrackRow(tracks[i], i, options));
      }
      renderedCount = Math.max(renderedCount, to);
      return nextRows;
    }

    rows = renderRows(0, Math.min(TRACKLIST_INITIAL_RENDER_LIMIT, tracks.length));
    if (renderedCount < tracks.length) {
      rows.push(loadMoreButton(function (button) {
        var list = button.closest('.mb-tracklist');
        if (!list) return;
        var from = renderedCount;
        var to = Math.min(from + TRACKLIST_RENDER_STEP, tracks.length);
        renderRows(from, to).forEach(function (row) {
          list.insertBefore(row, button);
        });
        if (renderedCount >= tracks.length) {
          button.remove();
        } else {
          button.replaceChildren('\u52a0\u8f7d\u66f4\u591a ' + (tracks.length - renderedCount) + ' \u9996');
        }
      }, tracks.length - renderedCount));
    }
    return rows;
  }

  function loadMoreButton(onClick, remaining) {
    return h('button', {
      class: 'mb-tracklist__load-more',
      type: 'button',
      onclick: function (event) {
        event.preventDefault();
        event.stopPropagation();
        onClick(event.currentTarget);
      }
    }, '\u52a0\u8f7d\u66f4\u591a ' + remaining + ' \u9996');
  }

  function buildCacheSummary(tracks) {
    return tracks.reduce(function (summary, track) {
      summary.total += 1;
      if (track.offlinePlayable) summary.offlinePlayable += 1;
      if (track.coverCacheStatus && track.coverCacheStatus.indexOf('\u5df2\u7f13\u5b58') >= 0) summary.coverCached += 1;
      if (track.lyricsCacheStatus && track.lyricsCacheStatus.indexOf('\u5df2\u7f13\u5b58') >= 0) summary.lyricsCached += 1;
      return summary;
    }, {
      total: 0,
      offlinePlayable: 0,
      coverCached: 0,
      lyricsCached: 0
    });
  }

  function cacheSummaryItem(label, value, total) {
    return h('span', { class: 'mb-pl-cache-summary__item' }, [
      h('span', { class: 'mb-pl-cache-summary__label' }, label),
      h('span', { class: 'mb-pl-cache-summary__value numeric' }, String(value || 0) + '/' + String(total || 0))
    ]);
  }

  function iconSpan(svg) {
    return h('span', { html: svg });
  }

  global.MBPlaylistView = PlaylistView;
})(window);
