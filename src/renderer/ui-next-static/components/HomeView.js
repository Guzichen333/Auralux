(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var SourceBadge = global.MBSourceBadge;

  function albumCard(item, onClick) {
    var coverNode = cover(item.cover);
    coverNode.appendChild(h('div', { class: 'mb-cover__play', html: MBIcons.miniPlay(16) }));
    return h('button', {
      class: 'mb-album-card',
      type: 'button',
      'data-action': 'open-playlist',
      'data-playlist-id': String(item.id || ''),
      'aria-label': playlistOpenLabel(item),
      onclick: onClick
    }, [
      coverNode,
      h('div', { class: 'mb-album-card__title ellipsis' }, item.name || item.title),
      h('div', { class: 'mb-album-card__source ellipsis' }, [
        SourceBadge(item.source),
        h('span', { class: 'ellipsis' }, playlistMetaLabel(item))
      ]),
      h('div', { class: 'mb-album-card__stats ellipsis' }, playlistStatsLabel(item))
    ]);
  }

  function playlistOpenLabel(item) {
    return '打开歌单 ' + ((item && (item.name || item.title)) || '未命名歌单');
  }

  function playlistMetaLabel(item) {
    if (item && item.externalType === 'recommendation') return '网易云推荐';
    if (item && item.externalType === 'created') return '网易云创建';
    if (item && item.externalType === 'subscribed') return '网易云收藏';
    return item && item.artist ? item.artist : '本地歌单';
  }

  function playlistStatsLabel(item) {
    var parts = [];
    if (item && item.playCount) parts.push(formatPlayCount(item.playCount) + '播放');
    if (item && item.trackCount != null) parts.push(item.trackCount + ' 首');
    return parts.length ? parts.join(' · ') : '打开后加载歌曲';
  }

  function formatPlayCount(value) {
    var count = Number(value || 0);
    if (!Number.isFinite(count) || count <= 0) return '0';
    if (count >= 100000000) return trimFixed(count / 100000000) + '亿';
    if (count >= 10000) return trimFixed(count / 10000) + '万';
    return String(Math.round(count));
  }

  function trimFixed(value) {
    return value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
  }

  function recentRow(t, onPlay) {
    return h('button', {
      class: 'mb-track-row-compact',
      type: 'button',
      'aria-label': '\u64ad\u653e ' + ((t && t.title) || ''),
      onclick: function () { onPlay(t); }
    }, [
      cover(t.cover, 'mb-cover--xs'),
      h('div', { class: 'mb-row__titles' }, [
        h('div', { class: 'mb-row__title ellipsis' }, t.title),
        h('div', { class: 'mb-row__artist ellipsis' }, t.artist)
      ]),
      SourceBadge(t.source)
    ]);
  }

  function HomeView(o) {
    var daily = o.dailyDesktop || buildFallbackDaily(o);
    return h('div', { class: 'mb-content__inner' }, [
      h('section', { class: 'mb-daily-desktop' }, [
        h('div', { class: 'mb-daily-desktop__primary' }, [
          heroTrack(daily.continueTrack, o.onPlayTrack),
          insightCards(daily, o)
        ]),
        h('div', { class: 'mb-daily-desktop__discovery' }, [
          trackRail('今日推荐', daily.dailyRecommendations, o.onPlayTrack),
          playlistRail('网易云推荐歌单', o.netease, o.onOpenPlaylist, 'netease')
        ]),
        trackRail('最近沉迷', daily.recentlyObsessed, o.onPlayTrack),
        syncPanel(daily.syncSummary, o.onOpenMigrationDashboard)
      ]),
      section('本地歌单', o.recommended.length, cards(o.recommended, o.onOpenPlaylist)),
      section('我的收藏', o.favorites.length, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
        o.favorites.slice(0, 6).map(function (t) { return recentRow(t, o.onPlayTrack); })
      ))
    ]);
  }

  function buildFallbackDaily(o) {
    var recent = o.recent || [];
    var favorites = o.favorites || [];
    var recommended = (o.recommended || []).reduce(function (tracks, item) {
      return tracks.concat(item && item.tracks ? item.tracks : []);
    }, []);
    var dailyRecommendations = uniqueTracks([].concat(favorites, recent, recommended)).slice(0, 12);
    var recentlyObsessed = uniqueTracks([].concat(recent, favorites)).slice(0, 8);

    return {
      continueTrack: recent[0] || favorites[0] || dailyRecommendations[0] || null,
      dailyRecommendations: dailyRecommendations,
      recentlyObsessed: recentlyObsessed,
      syncSummary: {
        statusText: '等待同步',
        detailText: '网易云资产同步状态会在这里汇总',
        actionText: '查看同步动态',
        warningCount: 0
      },
      insights: [
        { label: '最近播放', value: String(recent.length) },
        { label: '我的收藏', value: String(favorites.length) },
        { label: '今日推荐', value: String(dailyRecommendations.length) }
      ]
    };
  }

  function heroTrack(track, onPlay) {
    if (!track) {
      return h('div', { class: 'mb-daily-hero is-empty' }, [
        h('div', { class: 'mb-daily-hero__label' }, '继续听'),
        h('div', { class: 'mb-daily-hero__empty' }, '导入本地音乐或登录网易云后，这里会恢复上一次的播放线索')
      ]);
    }

    return h('button', {
      class: 'mb-daily-hero',
      type: 'button',
      onclick: function () { onPlay(track); }
    }, [
      cover(track.cover, 'mb-daily-hero__cover'),
      h('div', { class: 'mb-daily-hero__body' }, [
        h('div', { class: 'mb-daily-hero__label' }, '继续听'),
        h('div', { class: 'mb-daily-hero__title ellipsis' }, track.title || '未知歌曲'),
        h('div', { class: 'mb-daily-hero__artist ellipsis' }, track.artist || '未知歌手'),
        h('div', { class: 'mb-daily-hero__meta' }, [
          SourceBadge(track.source),
          track.offlinePlayable ? h('span', { class: 'mb-daily-chip is-ready' }, '离线可听') : null,
          track.liked ? h('span', { class: 'mb-daily-chip' }, '已收藏') : null
        ].filter(Boolean))
      ]),
      h('span', { class: 'mb-daily-hero__play', html: MBIcons.miniPlay(16), 'aria-hidden': 'true' })
    ]);
  }

  function insightCards(daily, o) {
    var insights = (daily && daily.insights ? daily.insights : []).slice(0, 3);
    while (insights.length < 3) {
      insights.push({ label: 'Auralux', value: '--' });
    }

    return h('div', { class: 'mb-daily-insights' }, insights.map(function (item, index) {
      var clickable = index === 0 && typeof o.onOpenMigrationDashboard === 'function';
      var attrs = { class: 'mb-daily-insight is-tone-' + ((index % 3) + 1) };
      if (clickable) {
        attrs.type = 'button';
        attrs.onclick = o.onOpenMigrationDashboard;
      }
      return h(clickable ? 'button' : 'div', attrs, [
        h('span', { class: 'mb-daily-insight__icon', 'aria-hidden': 'true' }),
        h('span', { class: 'mb-daily-insight__value ellipsis' }, item.value || '--'),
        h('span', { class: 'mb-daily-insight__label ellipsis' }, item.label || '')
      ]);
    }));
  }

  function trackRail(title, tracks, onPlay) {
    var items = (tracks || []).slice(0, 8);
    return h('div', { class: 'mb-daily-rail' }, [
      h('div', { class: 'mb-daily-rail__head' }, [
        h('span', { class: 'mb-daily-rail__title' }, title),
        h('span', { class: 'mb-daily-rail__count numeric' }, String(items.length))
      ]),
      items.length
        ? h('div', { class: 'mb-daily-rail__tracks' }, items.map(function (track) {
          return dailyTrack(track, onPlay);
        }))
        : emptyRailState('暂无歌曲', '播放或收藏几首歌后，这里会给出可直接开听的推荐')
    ]);
  }

  function playlistRail(title, playlists, onOpenPlaylist, kind) {
    var items = (playlists || []).slice(0, 8);
    return h('div', { class: 'mb-playlist-rail', 'data-rail-kind': kind || 'playlist' }, [
      h('div', { class: 'mb-daily-rail__head' }, [
        h('span', { class: 'mb-daily-rail__title' }, title),
        h('span', { class: 'mb-daily-rail__count numeric' }, String(items.length))
      ]),
      items.length
        ? cards(items, onOpenPlaylist)
        : emptyRailState('暂无歌单', '网易云推荐暂未返回，请确认远程播放代理和登录状态')
    ]);
  }

  function dailyTrack(track, onPlay) {
    return h('button', {
      class: 'mb-daily-track',
      type: 'button',
      onclick: function () { onPlay(track); }
    }, [
      cover(track.cover, 'mb-cover--xs'),
      h('span', { class: 'mb-daily-track__copy' }, [
        h('span', { class: 'mb-daily-track__title ellipsis' }, track.title || '未知歌曲'),
        h('span', { class: 'mb-daily-track__artist ellipsis' }, track.artist || '未知歌手')
      ]),
      SourceBadge(track.source)
    ]);
  }

  function emptyRailState(title, detail) {
    return h('div', { class: 'mb-daily-rail__empty-state', role: 'status' }, [
      h('span', { class: 'mb-daily-rail__empty-title' }, title),
      h('span', { class: 'mb-daily-rail__empty-detail' }, detail)
    ]);
  }

  function syncPanel(summary, onOpenMigrationDashboard) {
    var data = summary || {};
    var className = 'mb-daily-sync' + (data.warningCount > 0 ? ' is-warning' : '');
    var attrs = { class: className };
    if (typeof onOpenMigrationDashboard === 'function') {
      attrs.type = 'button';
      attrs.onclick = onOpenMigrationDashboard;
    }
    return h(typeof onOpenMigrationDashboard === 'function' ? 'button' : 'div', attrs, [
      h('div', { class: 'mb-daily-sync__label' }, '同步动态'),
      h('div', { class: 'mb-daily-sync__status ellipsis' }, data.statusText || '等待同步'),
      h('div', { class: 'mb-daily-sync__detail' }, data.detailText || '网易云资产同步状态会在这里汇总'),
      h('div', { class: 'mb-daily-sync__action' }, data.actionText || '查看同步动态')
    ]);
  }

  function uniqueTracks(tracks) {
    var seen = {};
    return (tracks || []).filter(function (track) {
      var key = track && (track.id || track.filePath || track.title);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
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
