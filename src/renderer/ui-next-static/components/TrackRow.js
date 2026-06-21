(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;

  function iconEl(svg, cls) {
    return h('span', { class: cls || '', html: svg });
  }

  function SourceBadge(source) {
    var isNetease = source === 'netease';
    return h('span', { class: 'mb-src-badge ' + (isNetease ? 'mb-src-badge--netease' : 'mb-src-badge--local') }, [
      h('span', { class: 'mb-src-dot ' + (isNetease ? 'mb-src-dot--netease' : 'mb-src-dot--local') }),
      isNetease ? '\u7f51\u6613\u4e91' : '\u672c\u5730'
    ]);
  }
  global.MBSourceBadge = SourceBadge;

  function Equalizer(playing) {
    return h('span', { class: 'mb-eq' + (playing ? '' : ' paused') }, [
      h('span'), h('span'), h('span')
    ]);
  }

  function canDeleteFromDisk(track, opts) {
    if (!opts.onDeleteTrackFile || track.source !== 'local') return false;
    if (!track.filePath) return false;
    return String(track.filePath).indexOf('netease://') !== 0;
  }

  function TrackRow(opts) {
    var t = opts.track;
    var statusItems = [
      t.offlineStatusLabel || (t.offlinePlayable ? '\u79bb\u7ebf\u53ef\u64ad' : ''),
      t.coverCacheStatus || '',
      t.lyricsCacheStatus || '',
      t.source === 'netease' ? (t.localMatchLabel || '') : ''
    ].filter(Boolean);
    return h('div', {
      class: 'mb-track-row' + (opts.isCurrent ? ' is-current' : ''),
      'data-id': t.id,
      onclick: function (e) {
        if (e.target.closest('.mb-track-row__action')) return;
        opts.onPlay && opts.onPlay(t);
      },
      ondblclick: function (e) {
        if (e.target.closest('.mb-track-row__action')) return;
        opts.onPlay && opts.onPlay(t);
      }
    }, [
      h('div', { class: 'mb-track-row__index' }, [
        opts.isCurrent
          ? Equalizer(opts.isPlaying)
          : h('span', {}, [
              h('span', { class: 'num' }, String(opts.index)),
              h('span', { class: 'play-ico', html: MBIcons.miniPlay(14) })
            ])
      ]),
      cover(t.cover, 'mb-cover--xs'),
      h('div', { class: 'mb-track-row__titles' }, [
        h('div', { class: 'mb-track-row__title ellipsis' }, [
          h('span', { class: 'ellipsis' }, t.title),
          t.isVip ? h('span', { class: 'mb-src-badge mb-src-badge--netease', title: 'VIP' }, 'VIP') : null
        ]),
        h('div', { class: 'mb-track-row__artist ellipsis' }, t.artist)
      ]),
      h('div', { class: 'mb-track-row__album ellipsis' }, t.album || '-'),
      h('div', { class: 'mb-track-row__status' }, statusItems.map(function (label) {
        return h('span', {
          class: 'mb-track-row__status-chip' + (label.indexOf('\u5f85') >= 0 || label.indexOf('\u672a') >= 0 || label.indexOf('\u4ec5') >= 0 ? ' is-muted' : '')
        }, label);
      })),
      h('div', { class: 'mb-track-row__duration numeric' }, fmt(t.duration)),
      h('div', { class: 'mb-track-row__src' }, [
        SourceBadge(t.source),
        opts.onAddToQueue ? h('button', {
          class: 'mb-track-row__action mb-track-row__add',
          title: '\u6dfb\u52a0\u5230\u64ad\u653e\u961f\u5217',
          onclick: function (e) {
            e.stopPropagation();
            opts.onAddToQueue(t);
          }
        }, iconEl(MBIcons.plus(16))) : null,
        opts.onToggleLike ? h('button', {
          class: 'mb-track-row__action mb-track-row__like' + (t.liked ? ' is-liked' : ''),
          title: t.liked ? '\u53d6\u6d88\u6536\u85cf' : '\u6536\u85cf',
          onclick: function (e) {
            e.stopPropagation();
            opts.onToggleLike(t);
          }
        }, iconEl(t.liked ? MBIcons.heartFilled(16) : MBIcons.heart(16))) : null,
        canDeleteFromDisk(t, opts) ? h('button', {
          class: 'mb-track-row__action mb-track-row__delete',
          title: '\u4ece\u78c1\u76d8\u5220\u9664',
          onclick: function (e) {
            e.stopPropagation();
            opts.onDeleteTrackFile(t);
          }
        }, iconEl(MBIcons.trash(16))) : null,
        t.source === 'netease' && opts.onCorrectLocalMatch ? h('button', {
          class: 'mb-track-row__action mb-track-row__match',
          title: '\u7ea0\u6b63\u672c\u5730\u5339\u914d',
          onclick: function (e) {
            e.stopPropagation();
            opts.onCorrectLocalMatch(t);
          }
        }, iconEl(MBIcons.importIcon(16))) : null
      ])
    ]);
  }

  global.MBTrackRow = TrackRow;
})(window);
