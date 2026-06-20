(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;
  var TrackRow = global.MBTrackRow;
  var SourceBadge = global.MBSourceBadge;

  function totalDuration(tracks) {
    var seconds = tracks.reduce(function (sum, t) { return sum + (t.duration || 0); }, 0);
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? (hours + 'h ' + minutes + 'm') : (minutes + 'm');
  }

  function PlaylistView(o) {
    var p = o.playlist;
    var canSync = p.source === 'netease';

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
        h('div', { class: 'mb-pl-header__actions' }, [
          h('button', { class: 'mb-btn mb-btn--primary', onclick: o.onPlayAll }, [
            iconSpan(MBIcons.play(16)), '\u64ad\u653e\u5168\u90e8'
          ]),
          h('button', { class: 'mb-btn mb-btn--ghost', onclick: o.onShuffle }, [
            iconSpan(MBIcons.shuffle(16)), '\u968f\u673a\u64ad\u653e'
          ]),
          h('button', {
            class: 'mb-btn mb-btn--ghost' + (o.offlineFilter ? ' is-active' : ''),
            onclick: o.onToggleOfflineFilter,
            title: '\u53ea\u663e\u793a\u5df2\u7f13\u5b58\u6216\u5df2\u5339\u914d\u672c\u5730\u6587\u4ef6\u7684\u66f2\u76ee'
          }, [
            iconSpan(MBIcons.importIcon(16)), '\u79bb\u7ebf\u53ef\u64ad'
          ]),
          canSync ? h('button', {
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

    var rows = o.tracks.map(function (t, i) {
      return TrackRow({
        track: t,
        index: i + 1,
        isCurrent: o.currentTrackId === t.id,
        isPlaying: o.isPlaying && o.currentTrackId === t.id,
        onPlay: o.onPlayTrack,
        onToggleLike: o.onToggleLike,
        onAddToPlaylist: o.onAddToPlaylist,
        onDeleteTrackFile: o.onDeleteTrackFile,
        onCorrectLocalMatch: o.onCorrectLocalMatch
      });
    });

    return h('div', { class: 'mb-content__inner' }, [
      header,
      h('div', { class: 'mb-tracklist' }, [thead].concat(rows))
    ]);
  }

  function iconSpan(svg) {
    return h('span', { html: svg });
  }

  global.MBPlaylistView = PlaylistView;
})(window);
