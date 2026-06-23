/* =====================================================================
   ui-next/components/PlayerBar.js — 底部常驻播放器
   ---------------------------------------------------------------------
   左：封面 + 歌名 + 歌手 + 喜欢
   中：上一首 / 播放暂停 / 下一首 + 进度条
   右：播放模式 + 队列按钮（带角标）+ 音量（滑块）
   ===================================================================== */
(function (global) {
  'use strict';
  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;
  var clamp = MBUtil.clamp;
  var SourceBadge = global.MBSourceBadge;

  /** 一个可拖动的 slider（进度 / 音量复用）。返回 { root, setRatio, bindDrag }。 */
  function slider(opts) {
    var fill = h('div', { class: 'mb-slider__fill' });
    var buffer = opts.buffered != null ? h('div', { class: 'mb-slider__buffer' }) : null;
    var thumb = h('div', { class: 'mb-slider__thumb' });
    var track = h('div', { class: 'mb-slider__track' }, [buffer, fill].filter(Boolean));
    var root = h('div', { class: 'mb-slider' + (opts.variant ? ' mb-slider--' + opts.variant : '') }, [track, thumb]);
    var currentRatio = 0;

    function applyRatio(ratio) {
      ratio = clamp(ratio, 0, 1);
      currentRatio = ratio;
      fill.style.width = (ratio * 100) + '%';
      if (buffer) buffer.style.width = (ratio * 100) + '%';
      thumb.style.left = (ratio * 100) + '%';
    }
    applyRatio(opts.value != null ? opts.value : 0);

    // 拖动 / 点击
    var dragging = false;
    function ratioFromEvent(e) {
      var rect = root.getBoundingClientRect();
      if (!rect.width || rect.width < 2) return currentRatio;
      var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    }
    function onDown(e) {
      dragging = true;
      root.classList.add('is-dragging');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
      var r = ratioFromEvent(e);
      applyRatio(r);
      opts.onChange && opts.onChange(r, true);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      var r = ratioFromEvent(e);
      applyRatio(r);
      opts.onChange && opts.onChange(r, true);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      opts.onChange && opts.onChange(currentRatio, false);
      opts.onCommit && opts.onCommit(currentRatio);
    }
    root.addEventListener('mousedown', onDown);
    root.addEventListener('touchstart', onDown, { passive: false });

    return { root: root, applyRatio: applyRatio };
  }

  /**
   * @param {Object} o
   * @param {import('../types').Track|null} o.currentTrack
   * @param {boolean} o.isPlaying
   * @param {number} o.position
   * @param {number} o.volume          0~1
   * @param {boolean} o.muted
   * @param {import('../types').PlayMode} o.playMode
   * @param {number} o.queueCount
   * @param {boolean} o.queueOpen
   * @param {Function} o.onPrev / o.onPlayPause / o.onNext
   * @param {Function} o.onSeek        (ratio, dragging) => void
   * @param {Function} o.onVolume      (ratio) => void
   * @param {Function} o.onToggleMute
   * @param {Function} o.onCyclePlayMode
   * @param {Function} o.onToggleQueue
   * @param {Function} o.onToggleLike
   */
  function PlayerBar(o) {
    var t = o.currentTrack;
    var duration = t ? t.duration : 0;
    var progressRatio = duration > 0 ? clamp(o.position / duration, 0, 1) : 0;
    var playerTheme = o.playerTheme === 'sonic-topography' ? 'sonic-topography' : 'default';
    var sourceLabel = t
      ? (t.sourceStatusLabel || (t.source === 'netease' ? '\u7f51\u6613\u4e91' : '\u672c\u5730\u97f3\u9891'))
      : '\u672c\u5730\u97f3\u9891';
    var themeLabel = playerTheme === 'sonic-topography' ? 'Sonic Topography' : 'Auralux';
    var terrain = playerTheme === 'sonic-topography' ? renderSonicTerrain() : null;

    // 进度条
    var progress = slider({
      value: progressRatio,
      variant: 'progress',
      onChange: function (ratio, dragging) {
        // 拖动时实时更新当前时间显示（乐观）
        var pos = ratio * duration;
        timeElCur.textContent = fmt(pos);
        if (dragging) o.onSeek(ratio, true);
      },
      onCommit: function (ratio) {
        o.onSeek(ratio, false);
      }
    });
    var timeElCur = h('span', { class: 'mb-player__time numeric' }, fmt(o.position));

    // 音量条
    var volume = slider({
      value: o.muted ? 0 : o.volume,
      variant: 'volume',
      onChange: function (ratio) { o.onVolume(ratio); }
    });

    var playModeIcon = o.playMode === 'repeat-one' ? MBIcons.repeatOne(18)
      : o.playMode === 'shuffle' ? MBIcons.shuffle(18)
      : MBIcons.sequence(18);
    var playModeTitle = o.playMode === 'repeat-one' ? '单曲循环' : (o.playMode === 'shuffle' ? '随机播放' : '顺序播放');

    // 左：当前曲目
    var openImmersiveFromCurrent = function (e) {
      var target = e && e.target;
      if (target && target.closest && target.closest('.mb-player__like')) return;
      if (o.onOpenImmersivePlayer) o.onOpenImmersivePlayer(e);
    };

    var current = h('div', {
      class: 'mb-player__current',
      title: '\u6253\u5f00\u6c89\u6d78\u64ad\u653e\u9875',
      onclick: openImmersiveFromCurrent
    }, t ? [
      h('button', {
        class: 'mb-player__cover-btn',
        type: 'button',
        title: '\u6253\u5f00\u6c89\u6d78\u64ad\u653e\u9875',
        onclick: function (e) { o.onOpenImmersivePlayer && o.onOpenImmersivePlayer(e); }
      }, cover(t.cover, 'mb-player__cover')),
      h('div', { class: 'mb-player__titles' }, [
        h('div', { class: 'mb-player__title' }, [
          h('span', { class: 'ellipsis' }, t.title),
          SourceBadge(t.source)
        ]),
        h('div', { class: 'mb-player__artist ellipsis' }, t.artist),
        h('div', { class: 'mb-player__source-line' }, [
          h('span', {}, sourceLabel),
          h('span', { class: 'mb-player__theme-dot' }, '\u2022'),
          h('span', {}, themeLabel)
        ]),
        h('div', { class: 'mb-player__status' }, [
          h('span', { class: 'mb-player__status-chip' }, t.sourceStatusLabel || (t.source === 'netease' ? '\u7f51\u6613\u4e91' : '\u672c\u5730')),
          h('span', { class: 'mb-player__status-chip' }, t.cacheStatusLabel || (o.playbackCacheState && o.playbackCacheState.cacheStatusLabel) || '')
        ].filter(function (node) { return node && node.textContent !== ''; }))
      ]),
      h('button', {
        class: 'mb-player__like' + (t.liked ? ' is-liked' : ''),
        title: t.liked ? '取消喜欢' : '喜欢',
        onclick: function (e) {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          o.onToggleLike(t);
        }
      }, iconSpan(t.liked ? MBIcons.heartFilled(18) : MBIcons.heart(18))),
      o.onOpenSongDetail ? h('button', {
        class: 'mb-player__detail',
        title: '\u6b4c\u66f2\u8be6\u60c5',
        onclick: function (e) {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          o.onOpenSongDetail(t);
        }
      }, iconSpan(MBIcons.lyrics(18))) : null
    ] : [
      h('button', {
        class: 'mb-player__cover-btn',
        type: 'button',
        title: '\u6253\u5f00\u6c89\u6d78\u64ad\u653e\u9875',
        onclick: function (e) { o.onOpenImmersivePlayer && o.onOpenImmersivePlayer(e); }
      }, cover(null, 'mb-player__cover')),
      h('div', { class: 'mb-player__titles' }, [
        h('div', { class: 'mb-player__title' }, '未在播放'),
        h('div', { class: 'mb-player__artist' }, '选择一首歌曲开始')
      ])
    ]);

    // 中：控制 + 进度
    var center = h('div', { class: 'mb-player__center' }, [
      h('div', { class: 'mb-player__controls' }, [
        h('button', { class: 'mb-icon-btn', title: '上一首', onclick: o.onPrev, html: MBIcons.prev(20) }),
        h('button', {
          class: 'mb-player__play',
          title: o.isPlaying ? '暂停' : '播放',
          onclick: o.onPlayPause
        }, iconSpan(o.isPlaying ? MBIcons.pause(18) : MBIcons.play(18))),
        h('button', { class: 'mb-icon-btn', title: '下一首', onclick: o.onNext, html: MBIcons.next(20) })
      ]),
      h('div', { class: 'mb-player__progress' }, [
        timeElCur,
        progress.root,
        h('span', { class: 'mb-player__time numeric' }, fmt(duration))
      ])
    ]);

    // 右：辅助
    var extras = h('div', { class: 'mb-player__extras' }, [
      h('button', {
        class: 'mb-icon-btn' + (o.playMode !== 'sequence' ? ' is-active' : ''),
        title: playModeTitle,
        onclick: o.onCyclePlayMode,
        html: playModeIcon
      }),
      h('button', {
        class: 'mb-icon-btn' + (o.muted ? ' is-active' : ''),
        title: o.muted ? '取消静音' : '静音',
        onclick: o.onToggleMute,
        html: o.muted ? MBIcons.volumeMute(18) : MBIcons.volume(18)
      }),
      o.desktopLyricsEnabled ? h('button', {
        class: 'mb-icon-btn',
        title: '\u684c\u9762\u6b4c\u8bcd',
        onclick: o.onToggleDesktopLyrics,
        html: MBIcons.lyrics(18)
      }) : null,
      h('div', { class: 'mb-volume' }, [volume.root]),
      h('button', {
        class: 'mb-icon-btn mb-queue-btn' + (o.queueOpen ? ' is-active' : ''),
        title: '播放队列',
        onclick: o.onToggleQueue
      }, [
        h('span', { html: MBIcons.queue(18) }),
        o.queueCount > 0 ? h('span', { class: 'mb-queue-btn__badge numeric' }, String(o.queueCount)) : null
      ])
    ]);

    return h('footer', {
      class: 'mb-player' + (playerTheme === 'sonic-topography' ? ' mb-player--sonic-topography' : ''),
      'data-player-theme': playerTheme
    }, [terrain, current, center, extras]);
  }

  function renderSonicTerrain() {
    var tiles = [];
    var cols = 28;
    var rows = 6;
    var total = cols * rows;
    var centerX = (cols - 1) / 2;
    var centerY = (rows - 1) / 2;

    for (var i = 0; i < total; i++) {
      var x = i % cols;
      var y = Math.floor(i / cols);
      var dx = Math.abs(x - centerX) / centerX;
      var dy = Math.abs(y - centerY) / Math.max(1, centerY);
      var distance = Math.sqrt(dx * dx + dy * dy);
      var region = x < cols * 0.24 ? 'bass' : (x < cols * 0.68 ? 'mid' : 'air');
      var seed = ((x * 17 + y * 31) % 23) / 23;
      tiles.push(h('span', {
        class: 'mb-player__sonic-tile',
        'data-sonic-region': region,
        'data-sonic-index': String(i),
        style: {
          '--sonic-x': String(x),
          '--sonic-y': String(y),
          '--sonic-distance': distance.toFixed(3),
          '--sonic-seed': seed.toFixed(3),
          '--sonic-height': '0',
          '--sonic-glow': '0'
        }
      }));
    }

    return h('div', {
      class: 'mb-player__sonic-terrain',
      'aria-hidden': 'true',
      'data-sonic-terrain': 'true'
    }, [
      h('div', { class: 'mb-player__sonic-grid' }, tiles)
    ]);
  }

  function iconSpan(svg) { return h('span', { html: svg }); }

  global.MBPlayerBar = PlayerBar;
})(window);
