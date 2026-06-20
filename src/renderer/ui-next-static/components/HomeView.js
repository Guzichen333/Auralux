(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var SourceBadge = global.MBSourceBadge;

  function albumCard(item, onClick) {
    var coverNode = cover(item.cover);
    coverNode.appendChild(h('div', { class: 'mb-cover__play', html: MBIcons.miniPlay(16) }));
    return h('div', { class: 'mb-album-card', onclick: onClick }, [
      coverNode,
      h('div', { class: 'mb-album-card__title ellipsis' }, item.name || item.title),
      h('div', { class: 'mb-album-card__meta ellipsis' }, [
        SourceBadge(item.source),
        h('span', { class: 'ellipsis' }, item.trackCount != null ? (item.trackCount + ' \u9996') : (item.artist || ''))
      ])
    ]);
  }

  function recentRow(t, onPlay) {
    return h('div', { class: 'mb-track-row-compact', onclick: function () { onPlay(t); } }, [
      cover(t.cover, 'mb-cover--xs'),
      h('div', { class: 'mb-row__titles' }, [
        h('div', { class: 'mb-row__title ellipsis' }, t.title),
        h('div', { class: 'mb-row__artist ellipsis' }, t.artist)
      ]),
      SourceBadge(t.source)
    ]);
  }

  function HomeView(o) {
    return h('div', { class: 'mb-content__inner' }, [
      section('\u6700\u8fd1\u64ad\u653e', o.recent.length, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
        o.recent.slice(0, 6).map(function (t) { return recentRow(t, o.onPlayTrack); })
      )),
      section('\u672c\u5730\u6b4c\u5355', o.recommended.length, cards(o.recommended, o.onOpenPlaylist)),
      section('\u7f51\u6613\u4e91\u540c\u6b65\u6b4c\u5355', o.netease.length, cards(o.netease, o.onOpenPlaylist)),
      section('\u6211\u7684\u6536\u85cf', o.favorites.length, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
        o.favorites.slice(0, 6).map(function (t) { return recentRow(t, o.onPlayTrack); })
      ))
    ]);
  }

  function section(title, count, body) {
    return h('section', { class: 'mb-section' }, [
      h('div', { class: 'mb-section__head' }, [
        h('span', { class: 'mb-section__title' }, title),
        h('span', { class: 'mb-section__count numeric' }, String(count))
      ]),
      body
    ]);
  }

  function cards(items, onClick) {
    return h('div', { class: 'mb-row-cards' }, items.map(function (it) {
      return albumCard(it, function () { onClick(it.id || it); });
    }));
  }

  global.MBHomeView = HomeView;
})(window);
