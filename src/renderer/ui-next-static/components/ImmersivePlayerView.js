(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var fmt = MBUtil.formatTime;
  var clamp = MBUtil.clamp;

  var MODE_LABELS = {
    standard: '\u7eb5\u5411',
    wrap: '\u73af\u7ed5',
    fragments: '\u788e\u7247',
    rail: '\u8f68\u9053'
  };

  var VISUALIZER_LABELS = {
    classic: '\u7ec6\u67f1',
    energy: '\u97f3\u6d6a',
    pulse: '\u5149\u5e26',
    orbit: '\u73af\u5f62'
  };

  var PICKUP_VISUALIZER_BINS = {
    classic: 54,
    energy: 41,
    pulse: 27,
    orbit: 54
  };

  var SONIC_RESPONSE_PRESET_OPTIONS = [
    { id: 'balanced', name: '均衡聆听', note: '默认动态，什么歌都稳' },
    { id: 'bass-pulse', name: '低频律动', note: '鼓点和低音更有推力' },
    { id: 'vocal-flow', name: '人声流线', note: '旋律和人声更顺' },
    { id: 'neon-energy', name: '电子霓虹', note: '瞬态更快，高频更亮' },
    { id: 'nocturne', name: '夜间柔光', note: '柔和少闪，深夜耐听' }
  ];

  function ImmersivePlayerView(o) {
    var track = o.track || null;
    var duration = o.duration || (track && track.duration) || 0;
    var ratio = duration > 0 ? clamp((o.position || 0) / duration, 0, 1) : 0;
    var lyrics = Array.isArray(o.lyrics) ? o.lyrics : [];
    var activeIndex = Number.isFinite(Number(o.activeLyricsIndex))
      ? Math.max(0, Math.min(lyrics.length - 1, Number(o.activeLyricsIndex)))
      : activeLyricIndex(lyrics, o.position || 0);
    var background = o.background || { type: 'cover', src: '' };
    var mode = o.lyricsMode || 'standard';
    var visualizerStyle = o.visualizerStyle || 'classic';
    var bgSrc = resolveBackgroundSrc(background, track);
    var quality = background.quality || 'quality';

    var root = h('section', {
      class: 'mb-immersive mb-immersive--' + mode + ' mb-immersive--quality-' + quality + (background && background.type === 'video' && bgSrc ? ' has-video-bg' : '') + (background && background.type === 'sonic-topography' ? ' has-sonic-bg mb-immersive--sonic-theme' : ''),
      'data-lyrics-mode': mode,
      'data-visualizer-style': visualizerStyle
    });

    root.appendChild(renderBackground(background, bgSrc, track));

    root.appendChild(h('div', { class: 'mb-immersive__top' }, [
      h('button', {
        class: 'mb-immersive__back mb-icon-btn',
        type: 'button',
        title: '\u8fd4\u56de',
        onclick: o.onBack
      }, h('span', { html: MBIcons.back(20) })),
      h('div', { class: 'mb-immersive__brand' }, [
        h('span', { class: 'mb-immersive__kicker' }, 'Auralux'),
        h('span', { class: 'mb-immersive__view-title' }, '\u6c89\u6d78\u64ad\u653e')
      ]),
      h('button', {
        class: 'mb-immersive__style-trigger',
        type: 'button',
        title: '\u64ad\u653e\u5668\u6837\u5f0f',
        onclick: o.onToggleStylePanel
      }, [
        h('span', { class: 'mb-immersive__style-trigger-dot' }),
        h('span', {}, '\u64ad\u653e\u5668\u6837\u5f0f')
      ])
    ]));

    if (o.stylePanelOpen) {
      root.appendChild(renderStylePanel(o, mode));
    }

    if (!track) {
      root.appendChild(h('div', { class: 'mb-immersive__empty' }, [
        h('div', { class: 'mb-empty__icon', html: MBIcons.emptyMusic(56) }),
        h('div', { class: 'mb-empty__title' }, '\u6682\u65e0\u6b63\u5728\u64ad\u653e\u7684\u6b4c\u66f2'),
        h('div', { class: 'mb-empty__desc' }, '\u64ad\u653e\u4efb\u610f\u6b4c\u66f2\u540e\u518d\u8fdb\u5165\u6c89\u6d78\u9875')
      ]));
      return root;
    }

    if (background && background.type === 'sonic-topography') {
      root.appendChild(renderSonicTopographyTheme(o, track, lyrics, activeIndex, ratio, duration));
      return root;
    }

    root.appendChild(h('div', { class: 'mb-immersive__stage' }, [
      h('div', { class: 'mb-immersive__left' }, [
        h('div', { class: 'mb-immersive__visual' }, [
          h('div', {
            class: 'mb-immersive__disc',
            style: {'--disc-cover': safeMediaSrc(track.cover) ? 'url("' + safeMediaSrc(track.cover).replace(/"/g, '\\"') + '")' : 'none'}
          }, [
            h('div', { class: 'mb-immersive__disc-ring' }),
            h('div', { class: 'mb-immersive__disc-hole' })
          ]),
          h('div', { class: 'mb-immersive__cover-wrap' }, [
            cover(track.cover, 'mb-immersive__cover'),
            h('div', { class: 'mb-immersive__cover-text' }, [
              h('div', { class: 'mb-immersive__cover-title' }, track.title || '\u672a\u77e5\u6b4c\u66f2'),
              h('div', { class: 'mb-immersive__cover-artist' }, track.artist || '\u672a\u77e5\u6b4c\u624b')
            ])
          ]),
          h('div', { class: 'mb-immersive__glow' })
        ]),
        h('div', { class: 'mb-immersive__trackline' }, [
          h('button', {
            class: 'mb-immersive__heart' + (track.liked ? ' is-active' : ''),
            title: track.liked ? '\u53d6\u6d88\u559c\u6b22' : '\u559c\u6b22',
            onclick: function () { o.onToggleLike && o.onToggleLike(track); },
            html: track.liked ? MBIcons.heartFilled(28) : MBIcons.heart(28)
          }),
          h('div', { class: 'mb-immersive__trackcopy' }, [
            h('div', { class: 'mb-immersive__song' }, track.title || '\u672a\u77e5\u6b4c\u66f2'),
            h('div', { class: 'mb-immersive__singer' }, track.artist || '\u672a\u77e5\u6b4c\u624b')
          ])
        ]),
        renderWaveform(ratio, duration, o.position || 0, o.onSeek, background && background.type === 'video', visualizerStyle),
        h('div', { class: 'mb-immersive__controls' }, [
          h('button', {
            class: 'mb-icon-btn' + (o.playMode === 'shuffle' ? ' is-active' : ''),
            title: '\u968f\u673a\u64ad\u653e',
            onclick: o.onCyclePlayMode,
            html: MBIcons.shuffle(22)
          }),
          h('button', { class: 'mb-icon-btn', title: '\u4e0a\u4e00\u9996', onclick: o.onPrev, html: MBIcons.prev(24) }),
          h('button', {
            class: 'mb-immersive__play',
            title: o.isPlaying ? '\u6682\u505c' : '\u64ad\u653e',
            onclick: o.onPlayPause
          }, h('span', { html: o.isPlaying ? MBIcons.pause(30) : MBIcons.play(30) })),
          h('button', { class: 'mb-icon-btn', title: '\u4e0b\u4e00\u9996', onclick: o.onNext, html: MBIcons.next(24) }),
          h('button', {
            class: 'mb-icon-btn' + (o.playMode !== 'sequence' ? ' is-active' : ''),
            title: '\u64ad\u653e\u6a21\u5f0f',
            onclick: o.onCyclePlayMode,
            html: MBIcons.repeatOne(22)
          })
        ])
      ]),
      h('div', { class: 'mb-immersive__main' }, [
        h('div', { class: 'mb-immersive__meta' }, [
          h('div', { class: 'mb-immersive__source' }, track.source === 'netease' ? '\u7f51\u6613\u4e91' : '\u672c\u5730\u97f3\u4e50'),
          h('h1', { class: 'mb-immersive__title' }, track.title || '\u672a\u77e5\u6b4c\u66f2'),
          h('div', { class: 'mb-immersive__artist' }, track.artist || '\u672a\u77e5\u6b4c\u624b')
        ]),
        renderLyrics(mode, lyrics, activeIndex, o.lyricsLoading, o.lyricsStatus, o.lyricsError, o.onRetryLyrics)
      ])
    ]));

    return root;
  }

  function renderSonicTopographyTheme(o, track, lyrics, activeIndex, ratio, duration) {
    return h('div', { class: 'mb-immersive__sonic-theme', 'data-sonic-theme': 'true' }, [
      h('div', { class: 'mb-immersive__sonic-brand' }, [
        h('span', { class: 'mb-immersive__sonic-brand-main' }, 'AURALUX.'),
        h('span', { class: 'mb-immersive__sonic-brand-sub' }, 'SONIC TOPOGRAPHY')
      ]),
      h('section', { class: 'mb-immersive__sonic-player', 'aria-label': '\u58f0\u573a\u5730\u5f62\u64ad\u653e\u5668' }, [
        h('div', { class: 'mb-immersive__sonic-player-top' }, [
          h('div', { class: 'mb-immersive__sonic-demo' }, track.source === 'netease' ? 'NETEASE' : 'LOCAL AUDIO'),
          h('div', { class: 'mb-immersive__sonic-actions' }, [
            h('button', {
              class: 'mb-immersive__sonic-theme-btn',
              type: 'button',
              title: '\u5207\u6362\u58f0\u573a\u914d\u8272',
              onclick: o.onCycleSonicTheme,
              html: MBIcons.palette(15)
            }),
            h('button', {
              class: 'mb-immersive__sonic-queue' + (o.queueOpen ? ' is-active' : ''),
              type: 'button',
              title: '\u64ad\u653e\u961f\u5217',
              onclick: o.onToggleQueue
            }, [
              h('span', { html: MBIcons.queue(15) }),
              o.queueCount > 0 ? h('span', { class: 'mb-immersive__sonic-queue-badge numeric' }, String(o.queueCount)) : null
            ]),
            h('button', {
              class: 'mb-immersive__sonic-like' + (track.liked ? ' is-active' : ''),
              title: track.liked ? '\u53d6\u6d88\u559c\u6b22' : '\u559c\u6b22',
              onclick: function () { o.onToggleLike && o.onToggleLike(track); },
              html: track.liked ? MBIcons.heartFilled(16) : MBIcons.heart(16)
            })
          ])
        ]),
        h('div', { class: 'mb-immersive__sonic-track' }, [
          h('div', { class: 'mb-immersive__sonic-title' }, track.title || '\u672a\u77e5\u6b4c\u66f2'),
          h('div', { class: 'mb-immersive__sonic-artist' }, track.artist || '\u672a\u77e5\u6b4c\u624b')
        ]),
        h('div', { class: 'mb-immersive__sonic-meta' }, [
          h('span', {}, track.source === 'netease' ? '\u7f51\u6613\u4e91' : '\u672c\u5730\u97f3\u4e50'),
          h('span', { 'data-sonic-theme-name': 'true' }, o.sonicThemeName || 'Nocturnal')
        ]),
        renderSonicSeek(ratio, duration, o.position || 0, o.onSeek),
        h('div', { class: 'mb-immersive__sonic-controls' }, [
          h('button', { class: 'mb-immersive__sonic-icon', title: '\u4e0a\u4e00\u9996', onclick: o.onPrev, html: MBIcons.prev(15) }),
          h('button', {
            class: 'mb-immersive__sonic-play',
            title: o.isPlaying ? '\u6682\u505c' : '\u64ad\u653e',
            onclick: o.onPlayPause,
            html: o.isPlaying ? MBIcons.pause(18) : MBIcons.play(18)
          }),
          h('button', { class: 'mb-immersive__sonic-icon', title: '\u4e0b\u4e00\u9996', onclick: o.onNext, html: MBIcons.next(15) }),
          h('button', {
            class: 'mb-immersive__sonic-icon' + (o.playMode !== 'sequence' ? ' is-active' : ''),
            title: '\u64ad\u653e\u6a21\u5f0f',
            onclick: o.onCyclePlayMode,
            html: modeIcon(o.playMode)
          })
        ])
      ]),
      h('div', { class: 'mb-immersive__sonic-lyrics' }, [
        renderSonicLyrics(lyrics, activeIndex, o.lyricsLoading, o.lyricsStatus, o.lyricsError, o.onRetryLyrics)
      ])
    ]);
  }

  function renderSonicSeek(ratio, duration, position, onSeek) {
    var root = h('div', {
      class: 'mb-immersive__sonic-seek',
      'data-role': 'immersive-wave',
      style: {
        '--seek-ratio': ratio.toFixed(5),
        '--seek-percent': (ratio * 100).toFixed(2) + '%'
      }
    }, [
      h('div', { class: 'mb-immersive__seek-track mb-immersive__sonic-seek-track', title: '\u64ad\u653e\u65f6\u95f4\u8f74\uff0c\u53ef\u62d6\u52a8\u8df3\u8f6c' }, [
        h('div', { class: 'mb-immersive__seek-fill' }),
        h('div', { class: 'mb-immersive__seek-thumb' })
      ]),
      h('div', { class: 'mb-immersive__sonic-times' }, [
        h('span', { class: 'numeric', 'data-role': 'wave-current' }, fmt(position)),
        h('span', { class: 'numeric', 'data-role': 'wave-duration' }, fmt(duration))
      ])
    ]);
    bindSeek(root, onSeek, ratio);
    return root;
  }

  function renderSonicLyrics(lyrics, activeIndex, loading, lyricsStatus, lyricsError, onRetryLyrics) {
    if (loading) {
      return h('div', { class: 'mb-immersive__sonic-lyrics-empty' }, '\u6b4c\u8bcd\u52a0\u8f7d\u4e2d...');
    }
    if (!lyrics.length) {
      var message = lyricsStatus === 'error'
        ? (lyricsError || '\u6b4c\u8bcd\u52a0\u8f7d\u5931\u8d25')
        : '\u6682\u65e0\u6b4c\u8bcd';
      return h('div', { class: 'mb-immersive__sonic-lyrics-empty' }, [
        h('span', {}, message),
        h('button', {
          class: 'mb-immersive__lyrics-action',
          type: 'button',
          onclick: onRetryLyrics
        }, '\u91cd\u65b0\u5339\u914d\u6b4c\u8bcd')
      ]);
    }

    return h('div', { class: 'mb-immersive__lyrics mb-immersive__lyrics--sonic', 'data-role': 'immersive-lyrics' },
      lyricWindow(lyrics, activeIndex, 4, 7).map(function (entry) {
        var slot = entry.index - activeIndex;
        return lyricLine(entry.line, entry.index, activeIndex, {
          style: sonicLyricStyle(slot)
        });
      }));
  }

  function sonicLyricStyle(slot) {
    var distance = Math.min(Math.abs(slot), 7);
    return {
      '--sonic-lyric-y': (50 + slot * 11) + '%',
      '--sonic-lyric-z': (-Math.abs(slot) * 18) + 'px',
      '--sonic-lyric-scale': (slot === 0 ? 1.08 : Math.max(0.72, 0.94 - distance * 0.045)).toFixed(3),
      opacity: (slot === 0 ? 1 : Math.max(0.16, 0.62 - distance * 0.075)).toFixed(3),
      zIndex: String(30 - distance)
    };
  }

  function renderBackground(background, bgSrc, track) {
    var media = null;
    if (background && background.type === 'sonic-topography') {
      media = renderSonicTopographyBackground();
    } else if (background && background.type === 'video' && bgSrc) {
      media = h('video', {
        class: 'mb-immersive__bg-video',
        src: bgSrc,
        autoplay: true,
        muted: true,
        loop: true,
        playsinline: true,
        preload: 'auto',
        onerror: function () { handleBackgroundError(background, track); }
      });
    } else if (bgSrc) {
      media = h('img', {
        class: 'mb-immersive__bg-image',
        src: bgSrc,
        alt: '',
        onerror: function () { handleBackgroundError(background, track); }
      });
    }

    return h('div', { class: 'mb-immersive__bg' }, [
      media,
      !media && track ? cover(track.cover, 'mb-immersive__bg-fallback') : null,
      h('div', { class: 'mb-immersive__shade' }),
      background && background.type === 'video' ? null : h('div', { class: 'mb-immersive__grain' })
    ]);
  }

  function renderSonicTopographyBackground() {
    return h('div', { class: 'mb-immersive__sonic-bg', 'aria-hidden': 'true' }, [
      h('canvas', {
        class: 'mb-immersive__sonic-canvas',
        'data-sonic-topography-canvas': 'true'
      })
    ]);
  }

  function renderModeSwitch(mode, onMode) {
    var modes = ['standard', 'wrap', 'fragments', 'rail'];
    return h('div', { class: 'mb-immersive__modes', role: 'tablist' }, modes.map(function (item) {
      return h('button', {
        class: 'mb-immersive__mode' + (item === mode ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': item === mode ? 'true' : 'false',
        onclick: function () { onMode && onMode(item); }
      }, MODE_LABELS[item]);
    }));
  }

  function renderVisualizerSwitch(style, onStyle) {
    var styles = ['classic', 'energy', 'pulse', 'orbit'];
    return h('div', { class: 'mb-immersive__modes mb-immersive__visualizer-modes', role: 'tablist' }, styles.map(function (item) {
      return h('button', {
        class: 'mb-immersive__mode' + (item === style ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': item === style ? 'true' : 'false',
        onclick: function () { onStyle && onStyle(item); }
      }, VISUALIZER_LABELS[item]);
    }));
  }

  function renderStylePanel(o, mode) {
    var background = o.background || {};
    var status = background.status || 'idle';
    var statusText = background.statusText || '';
    var quality = background.quality || 'quality';
    var panelMode = o.backgroundPanelMode === 'sonic' ? 'sonic' : 'regular';
    return h('aside', { class: 'mb-immersive__style-panel' }, [
      h('div', { class: 'mb-immersive__style-head' }, [
        h('div', {}, [
          h('div', { class: 'mb-immersive__style-kicker' }, '\u64ad\u653e\u5668'),
          h('div', { class: 'mb-immersive__style-title' }, '\u6837\u5f0f\u8bbe\u7f6e')
        ]),
        h('button', {
          class: 'mb-icon-btn mb-immersive__style-close',
          type: 'button',
          title: '\u5173\u95ed',
          onclick: o.onCloseStylePanel,
          html: MBIcons.close(18)
        })
      ]),
      h('div', { class: 'mb-immersive__style-section' }, [
        h('div', { class: 'mb-immersive__style-label' }, '\u64ad\u653e\u5668\u4e3b\u9898'),
        renderBackgroundPanelSwitch(panelMode, o.onBackgroundPanelMode)
      ]),
      panelMode === 'regular' ? [
        h('div', { class: 'mb-immersive__style-section' }, [
          h('div', { class: 'mb-immersive__style-label' }, '\u6b4c\u8bcd\u6392\u5e03'),
          renderModeSwitch(mode, o.onLyricsMode)
        ]),
        h('div', { class: 'mb-immersive__style-section' }, [
          h('div', { class: 'mb-immersive__style-label' }, '\u62fe\u97f3\u6837\u5f0f'),
          renderVisualizerSwitch(o.visualizerStyle || 'classic', o.onVisualizerStyle)
        ]),
        h('div', { class: 'mb-immersive__style-section' }, [
          h('div', { class: 'mb-immersive__style-label' }, '\u80cc\u666f'),
          renderRegularBackgroundActions(o),
          status !== 'idle' && statusText ? h('span', {
            class: 'mb-immersive__bg-status mb-immersive__bg-status--' + status
          }, statusText) : null,
          renderCachedVideos(o, background, quality)
        ])
      ] : null,
      panelMode === 'sonic' ? h('div', { class: 'mb-immersive__style-section' }, [
        h('div', { class: 'mb-immersive__style-label' }, '\u58f0\u6ce2\u5730\u5f62'),
        renderSonicBackgroundActions(o)
      ]) : null
    ]);
  }

  function renderBackgroundPanelSwitch(panelMode, onBackgroundPanelMode) {
    return h('div', { class: 'mb-immersive__bg-tabs', role: 'tablist' }, [
      h('button', {
        class: 'mb-immersive__bg-tab' + (panelMode === 'regular' ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': panelMode === 'regular' ? 'true' : 'false',
        onclick: function () { onBackgroundPanelMode && onBackgroundPanelMode('regular'); }
      }, '\u5e38\u89c4'),
      h('button', {
        class: 'mb-immersive__bg-tab' + (panelMode === 'sonic' ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': panelMode === 'sonic' ? 'true' : 'false',
        onclick: function () { onBackgroundPanelMode && onBackgroundPanelMode('sonic'); }
      }, '\u58f0\u6ce2')
    ]);
  }

  function renderRegularBackgroundActions(o) {
    var filter = o.backgroundFilter || 'video';
    var background = o.background || {};
    var importing = Boolean(background.importBusy);
    return h('div', { class: 'mb-immersive__bg-actions' }, [
      h('div', { class: 'mb-immersive__bg-buttons' }, [
        h('button', { class: 'mb-immersive__style-chip' + (background.type === 'cover' ? ' is-active' : ''), type: 'button', disabled: importing, onclick: o.onBackgroundCover }, '\u5c01\u9762'),
        h('button', { class: 'mb-immersive__style-chip' + (filter === 'image' ? ' is-active' : ''), type: 'button', disabled: importing, onclick: o.onBackgroundImage }, '\u56fe\u7247'),
        h('button', { class: 'mb-immersive__style-chip' + (filter === 'video' ? ' is-active' : ''), type: 'button', disabled: importing, onclick: o.onBackgroundVideo }, '\u89c6\u9891'),
        h('button', {
          class: 'mb-immersive__style-chip mb-immersive__style-chip--primary' + (importing ? ' is-busy' : ''),
          type: 'button',
          disabled: importing,
          'data-immersive-action': 'import-background',
          'data-background-kind': filter,
          onclick: function (event) {
            event.preventDefault();
            event.stopPropagation();
            o.onBackgroundImport && o.onBackgroundImport(filter);
          }
        }, importing ? '\u5bfc\u5165\u4e2d' : '\u5bfc\u5165'),
        h('button', { class: 'mb-immersive__style-chip', type: 'button', disabled: importing, onclick: o.onBackgroundClear }, '\u6e05\u9664')
      ])
    ]);
  }

  function renderSonicBackgroundActions(o) {
    var background = o.background || {};
    var active = background.type === 'sonic-topography';
    return h('div', { class: 'mb-immersive__bg-actions mb-immersive__bg-actions--sonic' }, [
      h('div', { class: 'mb-immersive__bg-buttons' }, [
        h('button', {
          class: 'mb-immersive__style-chip mb-immersive__style-chip--primary' + (active ? ' is-active' : ''),
          type: 'button',
          onclick: o.onBackgroundSonicTopography
        }, active ? '\u58f0\u573a\u5730\u5f62\u5df2\u542f\u7528' : '\u542f\u7528\u58f0\u573a\u5730\u5f62'),
        h('button', {
          class: 'mb-immersive__style-chip mb-immersive__style-chip--palette',
          type: 'button',
          title: '\u5207\u6362\u58f0\u6ce2\u914d\u8272',
          onclick: o.onCycleSonicTheme
        }, [
          h('span', { html: MBIcons.palette(14) }),
          h('span', { 'data-sonic-theme-name': 'true' }, o.sonicThemeName || 'Nocturnal')
        ])
      ]),
      renderSonicDebugPanel(o)
    ]);
  }

  function renderSonicDebugPanel(o) {
    var snapshot = o.sonicDebugSnapshot || {};
    var audio = snapshot.audio || {};
    var spectrum = snapshot.spectrum || {};
    var responseProfile = snapshot.responseProfile || {};
    var responsePreset = snapshot.responsePreset || o.sonicResponsePreset || {};
    var release = snapshot.release || {};
    var lastTrigger = snapshot.lastTrigger || {};

    return h('div', { class: 'mb-immersive__sonic-debug' }, [
      h('div', { class: 'mb-immersive__sonic-debug-head' }, [
        h('div', { class: 'mb-immersive__sonic-debug-copy' }, [
          h('span', { class: 'mb-immersive__sonic-debug-kicker' }, 'Sonic Tuning'),
          h('span', { class: 'mb-immersive__sonic-debug-title' }, '\u89c2\u6d4b\u4e0e\u8c03\u6821')
        ]),
        h('button', {
          class: 'mb-immersive__style-chip',
          type: 'button',
          onclick: o.onSonicResetTuning
        }, '\u6062\u590d\u9ed8\u8ba4')
      ]),
      renderSonicPresetSelector(responsePreset, o),
      h('div', { class: 'mb-immersive__sonic-debug-grid' }, [
        renderSonicDebugMetric('\u80fd\u91cf', formatSonicDebugNumber(audio.energy), '\u573a\u666f\u603b\u9a71\u52a8'),
        renderSonicDebugMetric('\u4eae\u5ea6', formatSonicDebugNumber(audio.brightness), '\u9ad8\u9891\u5149\u611f'),
        renderSonicDebugMetric('\u987a\u6ed1', formatSonicDebugNumber(audio.smoothness), '\u62ac\u5347\u566a\u70b9'),
        renderSonicDebugMetric('\u5bc6\u5ea6', formatSonicDebugNumber(audio.density), '\u6fc0\u6d3b\u9891\u5e26')
      ]),
      h('div', { class: 'mb-immersive__sonic-debug-grid' }, [
        renderSonicDebugMetric('\u9891\u8c31\u6765\u6e90', formatSonicSpectrumSource(spectrum), spectrum.isFallback ? '\u5f85\u673a\u515c\u5e95' : '\u64ad\u653e\u94fe\u8def'),
        renderSonicDebugMetric('\u5cf0\u503c', formatSonicDebugNumber(spectrum.max), spectrum.hasSignal ? '\u6709\u4fe1\u53f7' : '\u65e0\u4fe1\u53f7'),
        renderSonicDebugMetric('\u975e\u96f6', String(Math.round(spectrum.nonZeroBins || 0)), '\u9891\u70b9\u6570'),
        renderSonicDebugMetric('\u957f\u5ea6', String(Math.round(spectrum.length || 0)), 'bins')
      ]),
      h('div', { class: 'mb-immersive__sonic-debug-grid' }, [
        renderSonicDebugMetric('\u4f4e\u9891\u8df3\u52a8', formatSonicDebugNumber(responseProfile.lowMotion), '\u9f13\u70b9\u4e0e\u4f4e\u97f3'),
        renderSonicDebugMetric('\u4e2d\u9891\u8d77\u4f0f', formatSonicDebugNumber(responseProfile.midMotion), '\u4eba\u58f0\u4e0e\u4e3b\u65cb\u5f8b'),
        renderSonicDebugMetric('\u9ad8\u9891\u95ea\u70c1', formatSonicDebugNumber(responseProfile.highMotion), '\u9563\u7247\u4e0e\u7a7a\u6c14\u611f'),
        renderSonicDebugMetric('\u52a8\u6001\u8303\u56f4', formatSonicDebugNumber(responseProfile.dynamicRange), formatSonicTuningReadiness(responseProfile))
      ]),
      h('div', { class: 'mb-immersive__sonic-debug-release' }, [
        renderSonicDebugMetric('\u91ca\u653e\u5c3e\u8ff9', formatSonicDebugNumber(release.time, 2) + 's', release.active ? '\u5f53\u524d\u751f\u6548\u4e2d' : '\u7b49\u5f85\u89e6\u53d1'),
        renderSonicDebugMetric('\u6700\u8fd1\u89e6\u53d1', lastTrigger.action || 'None', formatSonicTriggerSource(lastTrigger)),
        renderSonicRangeControl('\u5c3e\u8ff9\u65f6\u957f', release.time, 0.4, 4, 0.05, 's', o.onSonicReleaseTime)
      ]),
      renderSonicTriggerPanel('Pulse', '\u6ce2\u8109', snapshot.pulseTrigger || {}, snapshot.frequencyScale || {}, o),
      renderSonicTriggerPanel('Meteor', '\u6d41\u661f', snapshot.meteorTrigger || {}, snapshot.frequencyScale || {}, o)
    ]);
  }

  function renderSonicPresetSelector(responsePreset, o) {
    var currentId = (responsePreset && responsePreset.id) || (o.sonicResponsePreset && o.sonicResponsePreset.id) || 'balanced';
    return h('div', { class: 'mb-immersive__sonic-preset-panel', 'data-sonic-response-preset': currentId }, [
      h('div', { class: 'mb-immersive__sonic-preset-head' }, [
        h('span', { class: 'mb-immersive__sonic-debug-section-title' }, '动态预设'),
        h('span', { class: 'mb-immersive__sonic-debug-section-note' }, (responsePreset && responsePreset.name) || '均衡聆听')
      ]),
      h('div', { class: 'mb-immersive__sonic-preset-list' }, SONIC_RESPONSE_PRESET_OPTIONS.map(function (preset) {
        var active = preset.id === currentId;
        return h('button', {
          class: 'mb-immersive__sonic-preset-chip' + (active ? ' is-active' : ''),
          type: 'button',
          'aria-pressed': active ? 'true' : 'false',
          onclick: function () {
            o.onSonicResponsePreset && o.onSonicResponsePreset(preset.id);
          }
        }, [
          h('span', { class: 'mb-immersive__sonic-preset-name' }, preset.name),
          h('span', { class: 'mb-immersive__sonic-preset-note' }, preset.note)
        ]);
      }))
    ]);
  }

  function renderSonicTriggerPanel(triggerName, title, trigger, frequencyScale, o) {
    var config = trigger.config || {};
    var range = Array.isArray(trigger.range) ? trigger.range : [0, 0];
    var rangeHz = triggerName === 'Meteor' ? frequencyScale.meteorRangeHz : frequencyScale.pulseRangeHz;
    return h('div', { class: 'mb-immersive__sonic-debug-section' }, [
      h('div', { class: 'mb-immersive__sonic-debug-section-head' }, [
        h('span', { class: 'mb-immersive__sonic-debug-section-title' }, title),
        h('span', { class: 'mb-immersive__sonic-debug-section-note' }, '\u9891\u5e26 ' + range[0] + ' - ' + range[1] + ' \u00b7 \u7ea6 ' + formatSonicFrequencyRangeHz(rangeHz))
      ]),
      h('div', { class: 'mb-immersive__sonic-debug-grid mb-immersive__sonic-debug-grid--trigger' }, [
        renderSonicDebugMetric('\u89e6\u53d1\u80fd\u91cf', formatSonicDebugNumber(trigger.energy), '\u5f53\u524d\u6ce2\u5f62'),
        renderSonicDebugMetric('\u95e8\u69db', formatSonicDebugNumber(trigger.threshold), '\u81ea\u9002\u5e94\u9608\u503c'),
        renderSonicDebugMetric('\u51b7\u5374', String(Math.round(trigger.cooldown || 0)), '\u5e27'),
        renderSonicDebugMetric('\u4f59\u91cf', String(Math.round(trigger.hold || 0)), '\u5269\u4f59\u5e27')
      ]),
      renderSonicModeSwitch(triggerName, config.mode || 'Auto Beat', o),
      renderSonicRangeControl('\u7075\u654f\u5ea6', config.sensitivity, 0, 1, 0.01, '', function (value) {
        o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'sensitivity', value);
      }),
      renderSonicRangeControl('\u9608\u503c', config.threshold, 0, 1, 0.01, '', function (value) {
        o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'threshold', value);
      }),
      renderSonicRangeControl('\u51b2\u51fb\u5f3a\u5ea6', config.pulseStrength, 0.05, 1, 0.01, '', function (value) {
        o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'pulseStrength', value);
      }),
      renderSonicRangeControl('\u51b7\u5374\u5e27', trigger.cooldown, 0, 360, 1, '', function (value) {
        o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'cooldown', value);
      }),
      (config.mode || 'Auto Beat') === 'Manual' ? renderSonicRangeControl('\u76ee\u6807\u9891\u70b9', config.freqIndex >= 0 ? config.freqIndex : Math.round((range[0] + range[1]) / 2), 0, 511, 1, function (value) {
        return ' \u00b7 \u7ea6 ' + formatSonicFrequencyHz(sonicFrequencyForBinFromScale(value, frequencyScale));
      }, function (value) {
        o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'freqIndex', value);
      }) : null,
      h('div', { class: 'mb-immersive__sonic-debug-band-grid' }, [
        renderSonicRangeControl('\u8d77\u59cb\u9891\u5e26', config.bandStart, 0, 511, 1, '', function (value) {
          o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'bandStart', value);
        }),
        renderSonicRangeControl('\u7ec8\u6b62\u9891\u5e26', config.bandEnd, 0, 511, 1, '', function (value) {
          o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'bandEnd', value);
        })
      ])
    ]);
  }

  function renderSonicModeSwitch(triggerName, mode, o) {
    var current = mode === 'Manual' ? 'Manual' : 'Auto Beat';
    return h('div', { class: 'mb-immersive__sonic-debug-mode', role: 'tablist' }, ['Auto Beat', 'Manual'].map(function (item) {
      return h('button', {
        class: 'mb-immersive__sonic-debug-mode-chip' + (item === current ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': item === current ? 'true' : 'false',
        onclick: function () {
          o.onSonicTriggerControl && o.onSonicTriggerControl(triggerName, 'mode', item);
        }
      }, item);
    }));
  }

  function renderSonicDebugMetric(label, value, note) {
    return h('div', { class: 'mb-immersive__sonic-debug-metric' }, [
      h('span', { class: 'mb-immersive__sonic-debug-metric-label' }, label),
      h('span', { class: 'mb-immersive__sonic-debug-metric-value numeric' }, value),
      h('span', { class: 'mb-immersive__sonic-debug-metric-note' }, note)
    ]);
  }

  function formatSonicTriggerSource(trigger) {
    if (!trigger || !trigger.action || trigger.action === 'None') return '\u6682\u65e0\u89e6\u53d1';
    var source = trigger.source === 'rule' ? '\u89c4\u5219\u5c42' : (trigger.source === 'fallback' ? '\u515c\u5e95' : trigger.source || '\u672a\u77e5');
    var age = Number(trigger.ageMs);
    var ageText = Number.isFinite(age) && age >= 0 ? (age / 1000).toFixed(1) + 's' : '--';
    return source + ' / ' + ageText + ' / ' + formatSonicDebugNumber(trigger.strength, 2);
  }

  function formatSonicSpectrumSource(spectrum) {
    if (!spectrum || !spectrum.source || spectrum.source === 'empty') return '\u7a7a';
    if (spectrum.source === 'fallback') return '\u5f85\u673a';
    if (spectrum.source === 'live') return spectrum.hasSignal ? '\u5b9e\u65f6' : '\u5b9e\u65f6\u00b7\u65e0\u4fe1\u53f7';
    return String(spectrum.source);
  }

  function formatSonicTuningReadiness(profile) {
    if (!profile || !profile.tuningReady) return '\u7b49\u5f85\u771f\u6b4c\u4fe1\u53f7';
    var dominant = profile.dominantBand === 'low' ? '\u4f4e\u9891\u4e3b\u5bfc' : (profile.dominantBand === 'mid' ? '\u4e2d\u9891\u4e3b\u5bfc' : '\u9ad8\u9891\u4e3b\u5bfc');
    return '\u53ef\u7528\u4e8e\u8c03\u53c2 / ' + dominant;
  }

  function sonicFrequencyForBinFromScale(bin, frequencyScale) {
    var scale = frequencyScale || {};
    var minHz = Math.max(1, Number(scale.minHz) || 20);
    var maxHz = Math.max(minHz * 1.01, Number(scale.maxHz) || 20000);
    var binCount = Math.max(1, Number(scale.binCount) || 512);
    var ratio = Math.max(0, Math.min(1, Number(bin) / binCount));

    return minHz * Math.pow(maxHz / minHz, ratio);
  }

  function formatSonicFrequencyHz(value) {
    var hz = Number(value);
    if (!Number.isFinite(hz) || hz <= 0) return '-- Hz';
    if (hz >= 1000) return (hz / 1000).toFixed(hz >= 10000 ? 1 : 2) + ' kHz';
    return Math.round(hz) + ' Hz';
  }

  function formatSonicFrequencyRangeHz(range) {
    if (!Array.isArray(range) || range.length < 2) return '-- Hz';
    return formatSonicFrequencyHz(range[0]) + ' - ' + formatSonicFrequencyHz(range[1]);
  }

  function renderSonicRangeControl(label, value, min, max, step, suffix, onChange) {
    var normalized = Number.isFinite(Number(value)) ? Number(value) : min;
    var decimals = Math.max(0, String(step).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0);
    var formatSuffix = function (nextValue) {
      return typeof suffix === 'function' ? suffix(Number(nextValue)) : (suffix || '');
    };
    var input = h('input', {
      class: 'mb-immersive__sonic-debug-range-input',
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
      onchange: function () {
        onChange && onChange(Number(input.value));
      },
      oninput: function () {
        valueNode.textContent = formatSonicDebugNumber(input.value, decimals) + formatSuffix(input.value);
      }
    });
    input.value = String(normalized);
    var valueNode = h('span', { class: 'mb-immersive__sonic-debug-range-value numeric' }, formatSonicDebugNumber(normalized, decimals) + formatSuffix(normalized));
    return h('label', { class: 'mb-immersive__sonic-debug-range' }, [
      h('span', { class: 'mb-immersive__sonic-debug-range-label' }, label),
      h('span', { class: 'mb-immersive__sonic-debug-range-control' }, [input, valueNode])
    ]);
  }

  function formatSonicDebugNumber(value, digits) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    return numeric.toFixed(Number.isFinite(Number(digits)) ? Number(digits) : 3);
  }

  function renderCachedVideos(o, background, currentQuality) {
    var filter = o.backgroundFilter || 'video';
    var items = dedupeCachedVideos(o.cachedVideos || []).filter(function (item) {
      return (item.mediaType || 'video') === filter;
    });
    return h('div', { class: 'mb-immersive__cache' }, [
      h('div', { class: 'mb-immersive__cache-head' }, [
        h('span', {}, filter === 'image' ? '\u5df2\u5bfc\u5165\u56fe\u7247' : '\u5df2\u5bfc\u5165\u89c6\u9891'),
        items.length ? h('span', {}, String(items.length)) : null
      ]),
      items.length ? h('div', { class: 'mb-immersive__cache-list' }, items.map(function (item) {
        return renderCachedVideoItem(item, background, currentQuality, o);
      })) : h('div', { class: 'mb-immersive__cache-empty' }, filter === 'image' ? '\u6682\u65e0\u5bfc\u5165\u56fe\u7247' : '\u6682\u65e0\u5bfc\u5165\u89c6\u9891')
    ]);
  }

  function renderCachedVideoItem(item, background, currentQuality, o) {
    var activeSrc = background && (background.type === 'video' || background.type === 'image') ? (background.src || '') : '';
    var previewPath = item.previewPath || '';
    if (!previewPath && item.qualities && item.qualities.length) {
      previewPath = item.qualities.filter(function (quality) { return quality.previewPath; })[0]?.previewPath || '';
    }
    var firstQuality = item.qualities[0];
    var editing = firstQuality && o.cacheEditPath === firstQuality.cachePath;
    return h('div', { class: 'mb-immersive__cache-item' }, [
      h('button', {
        class: 'mb-immersive__cache-preview',
        type: 'button',
        title: '\u9009\u62e9\u8fd9\u4e2a\u80cc\u666f',
        onclick: function () {
          if (firstQuality) {
            o.onCachedVideoSelect && o.onCachedVideoSelect(item.mediaType || 'video', item.sourcePath, firstQuality.cachePath, firstQuality.quality, firstQuality.presetVersion);
          }
        }
      }, previewPath
        ? h('img', { src: toMediaSrc(previewPath), alt: '' })
        : h('span', {}, item.mediaType === 'image' ? '\u56fe\u7247' : '\u89c6\u9891')),
      h('div', { class: 'mb-immersive__cache-body' }, [
        h('div', { class: 'mb-immersive__cache-main' }, [
          editing ? h('form', {
            class: 'mb-immersive__cache-title-row mb-immersive__cache-edit-row',
            'data-cache-action': 'rename-submit',
            'data-cache-path': firstQuality.cachePath,
            onsubmit: function (event) {
              event.preventDefault();
              o.onCachedVideoRenameSubmit && o.onCachedVideoRenameSubmit(firstQuality.cachePath);
            }
          }, [
            h('input', {
              class: 'mb-immersive__cache-edit-input',
              type: 'text',
              value: o.cacheEditName || '',
              maxlength: '80',
              autofocus: true,
              oninput: function (event) {
                o.onCachedVideoRenameInput && o.onCachedVideoRenameInput(event.target.value);
              },
              onkeydown: function (event) {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  o.onCachedVideoRenameCancel && o.onCachedVideoRenameCancel();
                }
              }
            }),
            h('span', { class: 'mb-immersive__cache-item-actions' }, [
              h('button', { class: 'mb-immersive__cache-action', type: 'submit', title: '\u4fdd\u5b58', 'data-cache-action': 'rename-submit', 'data-cache-path': firstQuality.cachePath }, '\u5b58'),
              h('button', {
                class: 'mb-immersive__cache-action',
                type: 'button',
                title: '\u53d6\u6d88',
                'data-cache-action': 'rename-cancel',
                onclick: function (event) {
                  event.preventDefault();
                  o.onCachedVideoRenameCancel && o.onCachedVideoRenameCancel();
                }
              }, '\u53d6')
            ])
          ]) : h('div', { class: 'mb-immersive__cache-title-row' }, [
            h('button', {
              class: 'mb-immersive__cache-name',
              type: 'button',
              title: '\u6539\u540d',
              'data-cache-action': 'rename',
              'data-cache-path': firstQuality ? firstQuality.cachePath : '',
              'data-cache-name': item.sourceName || fileNameFromPath(item.sourcePath),
              onclick: function () {
                if (firstQuality) onSelectNameEdit(item, firstQuality.cachePath);
              }
            }, item.sourceName || fileNameFromPath(item.sourcePath)),
            firstQuality ? h('span', { class: 'mb-immersive__cache-item-actions' }, [
              h('button', {
                class: 'mb-immersive__cache-action',
                type: 'button',
                title: '\u6539\u540d',
                'data-cache-action': 'rename',
                'data-cache-path': firstQuality.cachePath,
                'data-cache-name': item.sourceName || fileNameFromPath(item.sourcePath),
                onclick: function (event) {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectNameEdit(item, firstQuality.cachePath);
                }
              }, '\u6539\u540d'),
              h('button', {
                class: 'mb-immersive__cache-action is-danger',
                type: 'button',
                title: '\u5220\u9664\u8fd9\u4e00\u7ec4\u7f13\u5b58',
                'data-cache-action': 'delete',
                'data-cache-path': firstQuality.cachePath,
                onclick: function (event) {
                  event.preventDefault();
                  event.stopPropagation();
                  o.onCachedVideoDelete && o.onCachedVideoDelete(firstQuality.cachePath);
                }
              }, '\u5220')
            ]) : null
          ]),
          h('div', { class: 'mb-immersive__cache-meta' }, formatBytes(item.sourceSize) + ' / ' + formatCacheDate(item.sourceMtimeMs))
        ]),
        h('div', { class: 'mb-immersive__cache-qualities' }, renderCacheQualityButtons(item, activeSrc, currentQuality, background, o))
      ])
    ]);

    function onSelectNameEdit(cacheItem, cachePath) {
      o.onCachedVideoRename && o.onCachedVideoRename(cachePath, cacheItem.sourceName || fileNameFromPath(cacheItem.sourcePath));
    }
  }

  function renderCacheQualityButtons(item, activeSrc, currentQuality, background, o) {
    var qualities = Array.isArray(item.qualities) ? item.qualities : [];
    var ordered = item.mediaType === 'image'
      ? ['source']
      : ['source', 'smooth', 'quality'];
    return ordered.map(function (qualityName) {
      var quality = qualities.filter(function (entry) { return entry.quality === qualityName; })[0];
      var pending = !quality || !quality.cachePath;
      var active = !pending && (activeSrc === quality.cachePath || (currentQuality === quality.quality && background && background.originalSrc === item.sourcePath));
      return h('span', { class: 'mb-immersive__cache-quality-group' + (pending ? ' is-pending' : '') }, [
        h('button', {
          class: 'mb-immersive__cache-quality' + (active ? ' is-active' : '') + (pending ? ' is-pending' : ''),
          type: 'button',
          disabled: pending,
          title: pending ? qualityLabel(qualityName) + ' \u751f\u6210\u4e2d' : qualityLabel(quality.quality) + ' / ' + formatBytes(quality.cacheSize),
          onclick: function () {
            if (!pending) {
              o.onCachedVideoSelect && o.onCachedVideoSelect(item.mediaType || 'video', item.sourcePath, quality.cachePath, quality.quality, quality.presetVersion);
            }
          }
        }, pending ? qualityLabel(qualityName) + '\u00b7\u751f\u6210\u4e2d' : qualityLabel(quality.quality)),
      ]);
    });
  }

  function dedupeCachedVideos(items) {
    var bySource = {};
    items.forEach(function (item) {
      if (!item || !item.sourcePath || !Array.isArray(item.qualities)) return;
      var key = item.sourcePath + '|' + item.sourceSize + '|' + item.sourceMtimeMs;
      if (!bySource[key]) {
        bySource[key] = {
          mediaType: item.mediaType || 'video',
          sourcePath: item.sourcePath,
          sourceName: item.sourceName,
          sourceSize: item.sourceSize || 0,
          sourceMtimeMs: item.sourceMtimeMs || 0,
          previewPath: item.previewPath || '',
          qualities: []
        };
      }
      item.qualities.forEach(function (quality) {
        if (!quality || !quality.cachePath) return;
        var existing = bySource[key].qualities.filter(function (entry) {
          return entry.quality === quality.quality || entry.cachePath === quality.cachePath;
        })[0];
        if (!existing || (quality.createdAt || 0) > (existing.createdAt || 0)) {
          bySource[key].qualities = bySource[key].qualities.filter(function (entry) {
            return entry.quality !== quality.quality && entry.cachePath !== quality.cachePath;
          });
          bySource[key].qualities.push(quality);
          if (!bySource[key].previewPath && quality.previewPath) {
            bySource[key].previewPath = quality.previewPath;
          }
        }
      });
    });
    return Object.keys(bySource).map(function (key) {
      var item = bySource[key];
      item.qualities.sort(function (a, b) { return qualityOrder(a.quality) - qualityOrder(b.quality); });
      return item;
    }).filter(function (item) {
      return item.qualities.length > 0;
    }).sort(function (a, b) {
      return latestCacheTime(b) - latestCacheTime(a);
    });
  }

  function latestCacheTime(item) {
    return Math.max.apply(null, item.qualities.map(function (quality) { return quality.createdAt || 0; }));
  }

  function qualityOrder(quality) {
    if (quality === 'source') return 0;
    if (quality === 'smooth') return 1;
    if (quality === 'quality') return 2;
    return 3;
  }

  function qualityLabel(quality) {
    if (quality === 'source') return '\u539f\u7247';
    if (quality === 'smooth') return '\u6d41\u7545';
    if (quality === 'quality') return '\u9ad8\u8d28';
    return '\u80cc\u666f';
  }

  function fileNameFromPath(filePath) {
    return String(filePath || '').split(/[\\/]/).pop() || '\u672a\u547d\u540d\u89c6\u9891';
  }

  function formatBytes(value) {
    var size = Number(value) || 0;
    if (size <= 0) return '\u672a\u77e5\u5927\u5c0f';
    if (size >= 1024 * 1024 * 1024) return (size / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(size / 1024)) + ' KB';
  }

  function formatCacheDate(value) {
    var time = Number(value) || 0;
    if (!time) return '\u65f6\u95f4\u672a\u77e5';
    var date = new Date(time);
    if (Number.isNaN(date.getTime())) return '\u65f6\u95f4\u672a\u77e5';
    return String(date.getFullYear()) + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function renderLyrics(mode, lyrics, activeIndex, loading, lyricsStatus, lyricsError, onRetryLyrics) {
    if (loading) {
      return h('div', { class: 'mb-immersive__lyrics is-loading' }, '\u6b4c\u8bcd\u52a0\u8f7d\u4e2d...');
    }
    if (!lyrics.length) {
      var message = lyricsStatus === 'error'
        ? (lyricsError || '\u6b4c\u8bcd\u52a0\u8f7d\u5931\u8d25')
        : '\u6682\u65e0\u6b4c\u8bcd';
      return h('div', { class: 'mb-immersive__lyrics is-empty' }, [
        h('span', {}, message),
        h('button', {
          class: 'mb-immersive__lyrics-action',
          type: 'button',
          onclick: onRetryLyrics
        }, '重新匹配歌词')
      ]);
    }

    if (mode === 'wrap') return renderWrapLyrics(lyrics, activeIndex);
    if (mode === 'fragments') return renderFragmentLyrics(lyrics, activeIndex);
    if (mode === 'rail') return renderRailLyrics(lyrics, activeIndex);
    return renderStandardLyrics(lyrics, activeIndex);
  }

  function renderStandardLyrics(lyrics, activeIndex) {
    var start = Math.max(0, activeIndex - 10);
    var end = Math.min(lyrics.length, activeIndex + 11);
    return h('div', { class: 'mb-immersive__lyrics mb-immersive__lyrics--standard', 'data-role': 'immersive-lyrics' }, [
      h('div', { class: 'mb-immersive__lyrics-center' }),
      h('div', { class: 'mb-immersive__lyrics-track', 'data-role': 'immersive-lyrics-track' }, lyrics.slice(start, end).map(function (line, offset) {
        var index = start + offset;
        var slot = index - activeIndex;
        return lyricLine(line, index, activeIndex, {
          style: standardLyricStyle(slot)
        });
      }))
    ]);
  }

  function standardLyricStyle(slot) {
    var distance = Math.min(Math.abs(slot), 7);
    var radius = 360;
    var angle = Math.max(-82, Math.min(82, slot * -17));
    var rad = angle * Math.PI / 180;
    var y = Math.sin(rad) * radius;
    var z = (Math.cos(rad) - 1) * radius;
    var opacity = distance > 6 ? 0 : Math.max(0.12, 1 - distance * 0.14);
    var scale = Math.max(0.76, 1 - distance * 0.04);

    return {
      '--lyric-y': y + 'px',
      '--lyric-rotate': angle + 'deg',
      '--lyric-z': z + 'px',
      '--lyric-scale': scale.toFixed(3),
      opacity: opacity.toFixed(3)
    };
  }

  function renderWrapLyrics(lyrics, activeIndex) {
    return h('div', { class: 'mb-immersive__lyrics mb-immersive__lyrics--wrap', 'data-role': 'immersive-lyrics' },
      lyricWindow(lyrics, activeIndex, 5, 6).map(function (entry) {
        var slot = entry.index - activeIndex;
        return lyricLine(entry.line, entry.index, activeIndex, {
          style: wrapLyricStyle(slot)
        });
      }));
  }

  function renderFragmentLyrics(lyrics, activeIndex) {
    return h('div', { class: 'mb-immersive__lyrics mb-immersive__lyrics--fragments', 'data-role': 'immersive-lyrics' },
      lyricWindow(lyrics, activeIndex, 3, 4).map(function (entry) {
        var slot = entry.index - activeIndex;
        return lyricLine(entry.line, entry.index, activeIndex, {
          style: fragmentLyricStyle(slot)
        });
      }));
  }

  function renderRailLyrics(lyrics, activeIndex) {
    return h('div', { class: 'mb-immersive__lyrics mb-immersive__lyrics--rail', 'data-role': 'immersive-lyrics' }, [
      h('div', { class: 'mb-immersive__rail-line' }),
      lyricWindow(lyrics, activeIndex, 3, 3).map(function (entry) {
        var slot = entry.index - activeIndex;
        return lyricLine(entry.line, entry.index, activeIndex, {
          style: railLyricStyle(slot)
        });
      })
    ]);
  }

  function lyricWindow(lyrics, activeIndex, before, after) {
    var safeActive = Math.max(0, activeIndex);
    var start = Math.max(0, safeActive - before);
    var end = Math.min(lyrics.length, safeActive + after + 1);
    var entries = [];
    for (var i = start; i < end; i++) {
      entries.push({ line: lyrics[i], index: i });
    }
    return entries;
  }

  function wrapLyricStyle(slot) {
    var distance = Math.min(Math.abs(slot), 6);
    var angle = slot * 16;
    var rad = angle * Math.PI / 180;
    var x = 94 + Math.sin(rad) * 4;
    var y = 50 + slot * 8.8;
    var opacity = distance > 5 ? 0.1 : Math.max(0.18, 1 - distance * 0.15);
    var scale = Math.max(0.82, 1 - distance * 0.045);
    return {
      '--slot-x': x.toFixed(2) + '%',
      '--slot-y': y.toFixed(2) + '%',
      '--slot-rotate': (slot * -2.6).toFixed(2) + 'deg',
      '--slot-scale': scale.toFixed(3),
      opacity: opacity.toFixed(3),
      zIndex: String(20 - distance)
    };
  }

  function fragmentLyricStyle(slot) {
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
    return {
      '--frag-x': values[0] + '%',
      '--frag-y': values[1] + '%',
      '--frag-rotate': values[2] + 'deg',
      '--frag-scale': values[3],
      opacity: (slot === 0 ? 1 : Math.max(0.18, values[3] * 0.78)).toFixed(3),
      zIndex: String(20 - Math.abs(slot))
    };
  }

  function railLyricStyle(slot) {
    var x = 50 + slot * 18;
    var lane = slot === 0 ? 0 : (slot % 2 === 0 ? -1 : 1);
    var y = 50 + lane * 18;
    var distance = Math.min(Math.abs(slot), 3);
    return {
      '--rail-x': x + '%',
      '--rail-y': y + '%',
      '--rail-scale': (slot === 0 ? 1 : Math.max(0.72, 0.9 - distance * 0.06)).toFixed(3),
      opacity: (slot === 0 ? 1 : Math.max(0.2, 0.72 - distance * 0.15)).toFixed(3),
      zIndex: String(20 - distance)
    };
  }

  function lyricLine(line, index, activeIndex, extra) {
    extra = extra || {};
    var delta = Math.abs(index - activeIndex);
    var cls = 'mb-immersive__lyric';
    if (index === activeIndex) cls += ' is-active';
    if (delta > 3) cls += ' is-dim';
    return h('div', {
      class: cls,
      'data-time': line.time,
      'data-index': index,
      style: extra.style || null
    }, [
      renderLyricText(line, index === activeIndex),
      line.translation ? h('span', { class: 'mb-immersive__lyric-sub' }, line.translation) : null
    ]);
  }

  function renderLyricText(line, rich) {
    if (!rich) {
      return h('span', { class: 'mb-immersive__lyric-main' }, line.content || '');
    }

    var words = Array.isArray(line.words) && line.words.length > 0
      ? line.words
      : Array.from(line.content || '').map(function (char) {
          return { text: char };
        });

    return h('span', { class: 'mb-immersive__lyric-main' }, words.map(function (word, index) {
      var text = word && word.text != null ? String(word.text) : '';
      return h('span', {
        class: 'mb-immersive__lyric-char',
        'data-char-index': index,
        'data-word-time': typeof word.time === 'number' ? word.time : null,
        'data-word-end-time': typeof word.endTime === 'number' ? word.endTime : null
      }, text === ' ' ? '\u00a0' : text);
    }));
  }

  function renderWaveform(ratio, duration, position, onSeek, compact, visualizerStyle) {
    var style = visualizerStyle || 'classic';
    var count = pickupVisualizerBinCount(style, compact);
    var bars = [];
    for (var i = 0; i < count; i++) {
      var wave = Math.sin(i * 0.47) * 0.5 + Math.sin(i * 0.13 + 1.6) * 0.5;
      var height = style === 'pulse'
        ? 12 + Math.abs(wave) * 20 + ((i % 5) * 1)
        : style === 'energy'
          ? 18 + Math.abs(wave) * 34 + ((i % 6) * 1)
          : style === 'orbit'
            ? 16 + Math.abs(wave) * 28 + ((i % 5) * 1)
            : 18 + Math.abs(wave) * 30 + ((i % 6) * 1);
      var active = i / (count - 1) <= ratio;
      var barStyle = { height: height.toFixed(1) + '%' };
      if (style === 'orbit') {
        barStyle['--orbit-angle'] = (i * (360 / count)).toFixed(2) + 'deg';
      }
      bars.push(h('span', {
        class: 'mb-immersive__wave-bar' + (active ? ' is-active' : ''),
        style: barStyle
      }));
    }

    var root = h('div', {
      class: 'mb-immersive__wave mb-immersive__wave--' + style,
      'data-role': 'immersive-wave',
      'data-visualizer-style': style,
      'data-pickup-bin-count': String(count),
      'aria-label': '\u62fe\u97f3\u5668',
      style: {
        '--seek-ratio': ratio.toFixed(5),
        '--seek-percent': (ratio * 100).toFixed(2) + '%',
        '--pickup-energy': '0',
        '--pickup-bass': '0',
        '--pickup-mid': '0',
        '--pickup-air': '0'
      }
    }, [
      h('div', { class: 'mb-immersive__wave-bars', title: '\u62fe\u97f3\u5668\uff0c\u53ef\u62d6\u52a8\u8df3\u8f6c' }, [
        h('span', { class: 'mb-immersive__pickup-levels' }, bars),
        style === 'pulse' ? h('span', { class: 'mb-immersive__pulse-core', 'aria-hidden': 'true' }) : null,
        style === 'orbit' ? h('span', { class: 'mb-immersive__orbit-core', 'aria-hidden': 'true' }) : null,
        h('span', { class: 'mb-immersive__pickup-baseline', 'aria-hidden': 'true' })
      ]),
      h('div', { class: 'mb-immersive__seek' }, [
        h('div', { class: 'mb-immersive__seek-track', title: '\u64ad\u653e\u65f6\u95f4\u8f74\uff0c\u53ef\u62d6\u52a8\u8df3\u8f6c' }, [
          h('div', { class: 'mb-immersive__seek-fill' }),
          h('div', { class: 'mb-immersive__seek-thumb' })
        ]),
        h('div', { class: 'mb-immersive__seek-times' }, [
          h('span', { class: 'mb-immersive__wave-time numeric', 'data-role': 'wave-current' }, fmt(position)),
          h('span', { class: 'mb-immersive__wave-time numeric', 'data-role': 'wave-duration' }, fmt(duration))
        ])
      ])
    ]);

    bindSeek(root, onSeek, ratio);
    return root;
  }

  function pickupVisualizerBinCount(style, compact) {
    var base = PICKUP_VISUALIZER_BINS[style] || PICKUP_VISUALIZER_BINS.classic;
    var count = compact ? Math.max(8, Math.floor(base * 0.66)) : base;
    return Math.max(8, Math.min(54, count));
  }

  function bindSeek(root, onSeek, initialRatio) {
    var bars = root.querySelector('.mb-immersive__wave-bars');
    var seekTrack = root.querySelector('.mb-immersive__seek-track');
    if ((!bars && !seekTrack) || !onSeek) return;

    var dragging = false;
    var activeTarget = null;
    var activeRect = null;
    var currentRatio = clamp(typeof initialRatio === 'number' ? initialRatio : 0, 0, 1);
    function ratioFromEvent(e, target) {
      var source = target || activeTarget || bars || seekTrack;
      var rect = activeRect || (source && source.getBoundingClientRect ? source.getBoundingClientRect() : null);
      if (!rect || !rect.width || rect.width < 2) return currentRatio;
      var point = e.touches && e.touches[0] ? e.touches[0] : e;
      if (!point || typeof point.clientX !== 'number') return currentRatio;
      currentRatio = clamp((point.clientX - rect.left) / rect.width, 0, 1);
      return currentRatio;
    }
    function setDraggingClass(enabled) {
      if (bars) bars.classList.toggle('is-dragging', enabled);
      if (seekTrack) seekTrack.classList.toggle('is-dragging', enabled);
    }
    function updateSliderAttributes(target) {
      if (!target) return;
      target.setAttribute('role', 'slider');
      target.setAttribute('tabindex', '0');
      target.setAttribute('aria-valuemin', '0');
      target.setAttribute('aria-valuemax', '100');
      target.setAttribute('aria-valuenow', String(Math.round(currentRatio * 100)));
      target.setAttribute('aria-valuetext', Math.round(currentRatio * 100) + '%');
      target.setAttribute('aria-label', target === bars ? '\u6c89\u6d78\u62fe\u97f3\u8df3\u8f6c' : '\u6c89\u6d78\u64ad\u653e\u8fdb\u5ea6');
    }
    function updateAllSliderAttributes() {
      updateSliderAttributes(bars);
      updateSliderAttributes(seekTrack);
    }
    updateAllSliderAttributes();
    function down(e) {
      activeTarget = e.currentTarget || bars || seekTrack;
      activeRect = activeTarget.getBoundingClientRect();
      dragging = true;
      setDraggingClass(true);
      onSeek(ratioFromEvent(e, activeTarget), true);
      updateAllSliderAttributes();
      window.addEventListener('mousemove', move);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('mouseup', up);
      window.addEventListener('touchend', up);
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      onSeek(ratioFromEvent(e), true);
      updateAllSliderAttributes();
      e.preventDefault();
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      setDraggingClass(false);
      onSeek(currentRatio, false);
      activeTarget = null;
      activeRect = null;
      updateAllSliderAttributes();
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    }
    function keydown(e) {
      var handled = true;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') currentRatio -= 0.01;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') currentRatio += 0.01;
      else if (e.key === 'PageDown') currentRatio -= 0.1;
      else if (e.key === 'PageUp') currentRatio += 0.1;
      else if (e.key === 'Home') currentRatio = 0;
      else if (e.key === 'End') currentRatio = 1;
      else handled = false;
      if (!handled) return;
      currentRatio = clamp(currentRatio, 0, 1);
      updateAllSliderAttributes();
      onSeek(currentRatio, false);
      e.preventDefault();
    }
    [bars, seekTrack].forEach(function (target) {
      if (!target) return;
      target.addEventListener('mousedown', down);
      target.addEventListener('touchstart', down, { passive: false });
      target.addEventListener('keydown', keydown);
    });
  }

  function activeLyricIndex(lyrics, position) {
    if (!lyrics.length) return -1;
    var index = -1;
    for (var i = 0; i < lyrics.length; i++) {
      if ((lyrics[i].time || 0) <= position) index = i;
      else break;
    }
    return index;
  }

  function resolveBackgroundSrc(background, track) {
    if (background && background.type !== 'cover' && background.src) {
      return toMediaSrc(background.src);
    }
    return track && track.cover ? safeMediaSrc(track.cover) : '';
  }

  function toMediaSrc(value) {
    if (!value) return '';
    var src = String(value);
    if (/^(https?:|data:|blob:|file:)/i.test(src)) return src;
    var normalized = src.replace(/\\/g, '/').replace(/^\/+/, '');
    return encodeURI('file:///' + normalized);
  }

  function safeMediaSrc(value) {
    return typeof value === 'string' && value.length > 0 ? toMediaSrc(value) : '';
  }

  function handleBackgroundError(background, track) {
    if (!background || background.type === 'cover') return;
    if (typeof global.__mbImmersiveBackgroundError === 'function') {
      global.__mbImmersiveBackgroundError();
    }
    var root = document.querySelector('.mb-immersive');
    if (!root || !track || !track.cover) return;
    var bg = root.querySelector('.mb-immersive__bg');
    if (!bg) return;
    var media = bg.querySelector('.mb-immersive__bg-image, .mb-immersive__bg-video');
    if (media && media.parentNode) media.parentNode.removeChild(media);
    var img = document.createElement('img');
    img.className = 'mb-immersive__bg-image';
    img.alt = '';
    img.src = toMediaSrc(track.cover);
    bg.insertBefore(img, bg.firstChild);
  }

  function modeIcon(playMode) {
    if (playMode === 'repeat-one') return MBIcons.repeatOne(18);
    if (playMode === 'shuffle') return MBIcons.shuffle(18);
    return MBIcons.sequence(18);
  }

  global.MBImmersivePlayerView = ImmersivePlayerView;
})(window);
