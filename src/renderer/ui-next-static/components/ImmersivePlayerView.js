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
      class: 'mb-immersive mb-immersive--' + mode + ' mb-immersive--quality-' + quality + (background && background.type === 'video' && bgSrc ? ' has-video-bg' : ''),
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

  function renderBackground(background, bgSrc, track) {
    var media = null;
    if (background && background.type === 'video' && bgSrc) {
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
        h('div', { class: 'mb-immersive__style-label' }, '\u6b4c\u8bcd\u6392\u5e03'),
        renderModeSwitch(mode, o.onLyricsMode)
      ]),
      h('div', { class: 'mb-immersive__style-section' }, [
        h('div', { class: 'mb-immersive__style-label' }, '\u62fe\u97f3\u6837\u5f0f'),
        renderVisualizerSwitch(o.visualizerStyle || 'classic', o.onVisualizerStyle)
      ]),
      h('div', { class: 'mb-immersive__style-section' }, [
        h('div', { class: 'mb-immersive__style-label' }, '\u80cc\u666f'),
        renderBackgroundActions(o),
        status !== 'idle' && statusText ? h('span', {
          class: 'mb-immersive__bg-status mb-immersive__bg-status--' + status
        }, statusText) : null,
        renderCachedVideos(o, background, quality)
      ])
    ]);
  }

  function renderBackgroundActions(o) {
    var filter = o.backgroundFilter || 'video';
    var background = o.background || {};
    var importing = Boolean(background.importBusy);
    return h('div', { class: 'mb-immersive__bg-actions' }, [
      h('div', { class: 'mb-immersive__bg-buttons' }, [
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
        h('button', { class: 'mb-immersive__style-chip', type: 'button', disabled: importing, onclick: o.onBackgroundCover }, '\u5c01\u9762'),
        h('button', { class: 'mb-immersive__style-chip', type: 'button', disabled: importing, onclick: o.onBackgroundClear }, '\u6e05\u9664')
      ])
    ]);
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
    var count = style === 'energy' ? 32 : (style === 'pulse' ? 18 : (style === 'orbit' ? 40 : (compact ? 48 : 84)));
    var bars = [];
    for (var i = 0; i < count; i++) {
      var wave = Math.sin(i * 0.47) * 0.5 + Math.sin(i * 0.13 + 1.6) * 0.5;
      var height = 20 + Math.abs(wave) * 54 + ((i % 7) * 2);
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
      'aria-label': '\u62fe\u97f3\u5668',
      style: {
        '--seek-ratio': ratio.toFixed(5),
        '--seek-percent': (ratio * 100).toFixed(2) + '%',
        '--pickup-energy': '0',
        '--pickup-bass': '0',
        '--pickup-mid': '0'
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
    function down(e) {
      activeTarget = e.currentTarget || bars || seekTrack;
      activeRect = activeTarget.getBoundingClientRect();
      dragging = true;
      setDraggingClass(true);
      onSeek(ratioFromEvent(e, activeTarget), true);
      window.addEventListener('mousemove', move);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('mouseup', up);
      window.addEventListener('touchend', up);
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      onSeek(ratioFromEvent(e), true);
      e.preventDefault();
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      setDraggingClass(false);
      onSeek(currentRatio, false);
      activeTarget = null;
      activeRect = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    }
    [bars, seekTrack].forEach(function (target) {
      if (!target) return;
      target.addEventListener('mousedown', down);
      target.addEventListener('touchstart', down, { passive: false });
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
