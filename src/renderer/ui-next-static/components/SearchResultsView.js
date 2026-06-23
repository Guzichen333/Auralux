(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var TrackRow = global.MBTrackRow;
  var SourceBadge = global.MBSourceBadge;
  var TRACKLIST_INITIAL_RENDER_LIMIT = 80;
  var TRACKLIST_RENDER_STEP = 80;

  function SearchResultsView(o) {
    var filtered = filterResults(o.results || { local: [], netease: [] }, o.searchFilter);
    var r = filtered;
    var entities = r.entities || { artists: [], albums: [], playlists: [] };
    var total = r.local.length + r.netease.length
      + (entities.artists || []).length
      + (entities.albums || []).length
      + (entities.playlists || []).length;
    var title = o.title || '\u641c\u7d22';

    var head = h('div', { class: 'mb-search-results__head' }, [
      h('span', { class: 'mb-search-results__title' }, title),
      h('span', { class: 'mb-section__count numeric' }, total + ' \u4e2a\u7ed3\u679c' + (o.query ? ' \u00b7 \u5173\u952e\u8bcd' : '')),
      o.query ? h('span', { class: 'mb-search-results__kw' }, '"' + o.query + '"') : null
    ]);

    if (total === 0) {
      return h('div', { class: 'mb-content__inner' }, [head, emptyState()]);
    }

    return h('div', { class: 'mb-content__inner' }, [
      head,
      group('\u672c\u5730\u97f3\u4e50', r.local, o),
      group('\u7f51\u6613\u4e91\u97f3\u4e50', r.netease, o),
      entityGroup('\u6b4c\u624b', entities.artists || [], o.onOpenPlaylist),
      entityGroup('\u4e13\u8f91', entities.albums || [], o.onOpenPlaylist),
      entityGroup('\u6b4c\u5355', entities.playlists || [], o.onOpenPlaylist)
    ]);
  }

  function filterResults(results, searchFilter) {
    var filter = searchFilter || 'all';
    var entities = results.entities || { artists: [], albums: [], playlists: [] };
    if (filter === 'all') return results;
    if (filter === 'songs') {
      return {
        local: results.local || [],
        netease: results.netease || [],
        entities: { artists: [], albums: [], playlists: [] }
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

  function group(title, list, o) {
    if (!list.length) return null;
    var thead = h('div', { class: 'mb-tracklist__head' }, [
      h('span', {}, '#'),
      h('span', {}, '\u5c01\u9762'),
      h('span', {}, '\u6807\u9898'),
      h('span', {}, '\u4e13\u8f91'),
      h('span', {}, ''),
      h('span', { style: { textAlign: 'right' } }, '\u65f6\u957f'),
      h('span', { style: { textAlign: 'right' } }, '\u6765\u6e90')
    ]);
    var rows = progressiveTrackRows(list, {
      currentTrackId: o.currentTrackId,
      isPlaying: o.isPlaying,
      onPlayTrack: o.onPlayTrack,
      onToggleLike: o.onToggleLike,
      onAddToQueue: o.onAddToQueue,
      onOpenSongDetail: o.onOpenSongDetail,
      onDeleteTrackFile: o.onDeleteTrackFile
    });
    return h('section', { class: 'mb-section' }, [
      h('div', { class: 'mb-section__head' }, [
        h('span', { class: 'mb-section__title' }, title),
        h('span', { class: 'mb-section__count numeric' }, String(list.length))
      ]),
      h('div', { class: 'mb-tracklist' }, [thead].concat(rows))
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
      onDeleteTrackFile: options.onDeleteTrackFile
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
          button.replaceChildren('加载更多 ' + (tracks.length - renderedCount) + ' 首');
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
    }, '加载更多 ' + remaining + ' 首');
  }

  function entityGroup(title, list, onOpenPlaylist) {
    if (!list.length) return null;
    return h('section', { class: 'mb-section' }, [
      h('div', { class: 'mb-section__head' }, [
        h('span', { class: 'mb-section__title' }, title),
        h('span', { class: 'mb-section__count numeric' }, String(list.length))
      ]),
      h('div', { class: 'mb-search-entity-grid' }, list.map(function (item) {
        return h('div', { class: 'mb-search-entity' }, [
          cover(item.cover, 'mb-cover--xs'),
          h('div', { class: 'mb-row__titles' }, [
            h('div', { class: 'mb-row__title ellipsis' }, item.title),
            h('div', { class: 'mb-row__artist ellipsis' }, item.subtitle)
          ]),
          SourceBadge(item.source),
          item.playlistId ? openEntityButton(item, onOpenPlaylist) : null
        ]);
      }))
    ]);
  }

  function openEntityButton(item, onOpenPlaylist) {
    return h('button', {
      class: 'mb-search-entity__open',
      type: 'button',
      title: '\u6253\u5f00',
      onclick: function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (item.playlistId && onOpenPlaylist) onOpenPlaylist(item.playlistId);
      }
    }, '\u6253\u5f00');
  }

  function emptyState() {
    return h('div', { class: 'mb-empty' }, [
      h('div', { class: 'mb-empty__icon', html: MBIcons.emptyMusic(40) }),
      h('div', { class: 'mb-empty__title' }, '\u6ca1\u6709\u627e\u5230\u6b4c\u66f2'),
      h('div', { class: 'mb-empty__desc' }, '\u6362\u4e2a\u5173\u952e\u8bcd\uff0c\u6216\u786e\u8ba4\u672c\u5730\u66f2\u5e93\u548c\u7f51\u6613\u4e91\u670d\u52a1\u72b6\u6001')
    ]);
  }

  global.MBSearchResultsView = SearchResultsView;
})(window);
