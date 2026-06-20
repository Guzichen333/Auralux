(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;
  var SourceBadge = global.MBSourceBadge;

  function Equalizer(playing) {
    return h('span', { class: 'mb-eq' + (playing ? '' : ' paused') }, [h('span'), h('span'), h('span')]);
  }

  function QueuePanel(o) {
    var q = o.queue;
    var total = q.tracks.reduce(function (sum, t) { return sum + (t.duration || 0); }, 0);

    var items = q.tracks.map(function (t, i) {
      var isCurrent = i === q.currentIndex;
      return h('div', {
        class: 'mb-queue-item' + (isCurrent ? ' is-current' : ''),
        onclick: function () { o.onSelect(i); }
      }, [
        cover(t.cover, 'mb-cover--xs'),
        h('div', { class: 'mb-row__titles' }, [
          h('div', { class: 'mb-row__title' }, [
            isCurrent ? Equalizer(true) : null,
            h('span', { class: 'ellipsis' }, t.title)
          ]),
          h('div', { class: 'mb-row__artist ellipsis' }, t.artist)
        ]),
        SourceBadge(t.source),
        h('button', {
          class: 'mb-queue-item__remove',
          title: '从队列移除',
          onclick: function (e) {
            e.stopPropagation();
            o.onRemove(i);
          }
        }, iconSpan(MBIcons.close(14)))
      ]);
    });

    return h('aside', { class: 'mb-queue' }, [
      h('div', { class: 'mb-queue__head' }, [
        h('span', { class: 'mb-queue__title' }, '播放队列'),
        h('span', { class: 'mb-queue__count numeric' }, q.tracks.length + ' 首'),
        h('button', { class: 'mb-queue__clear', onclick: o.onClear, title: '清空队列' }, '清空'),
        h('button', { class: 'mb-icon-btn', title: '关闭队列', onclick: o.onClose, html: MBIcons.close(18) })
      ]),
      h('div', { class: 'mb-queue__list' }, items),
      h('div', { class: 'mb-queue__foot' }, [
        h('span', { html: MBIcons.clock(14) }),
        h('span', { class: 'numeric' }, '累计 ' + fmt(total))
      ])
    ]);
  }

  function iconSpan(svg) {
    return h('span', { html: svg });
  }

  global.MBQueuePanel = QueuePanel;
})(window);
