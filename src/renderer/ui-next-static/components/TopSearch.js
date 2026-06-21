(function (global) {
  'use strict';

  var h = MBUtil.h;
  var cover = MBUtil.cover;
  var SourceBadge = global.MBSourceBadge;

  function TopSearch(o) {
    var r = o.results || { local: [], netease: [] };
    var filtered = applySearchFilter(r, o.activeFilter);
    var flat = (filtered.local || []).concat(filtered.netease || []);
    var hasQuery = Boolean(o.query && o.query.trim().length > 0);
    var showPanel = o.focused && (hasQuery || (o.history || []).length > 0);

    var box = h('div', { class: 'mb-search__box' + (o.focused ? ' is-focused' : '') }, [
      h('span', { class: 'mb-search__ico', html: MBIcons.search(16) }),
      h('input', {
        class: 'mb-search__input',
        type: 'text',
        placeholder: '\u641c\u7d22\u672c\u5730\u548c\u7f51\u6613\u4e91',
        value: o.query,
        oninput: function (e) { o.onInput(e.target.value); },
        onfocus: o.onFocus,
        onkeydown: o.onKeyDown
      }),
      h('span', { class: 'mb-search__kbd' }, 'Ctrl K')
    ]);

    var panel = showPanel
      ? h('div', { class: 'mb-search-panel' }, buildPanel(o, filtered, flat, hasQuery))
      : null;

    return h('header', { class: 'mb-topbar' }, [
      h('div', { class: 'mb-topbar__nav' }, [
        h('button', {
          class: 'mb-icon-btn',
          title: '\u540e\u9000',
          disabled: !o.canGoBack,
          onclick: o.onBack,
          html: MBIcons.back(18)
        }),
        h('button', {
          class: 'mb-icon-btn',
          title: '\u524d\u8fdb',
          disabled: !o.canGoForward,
          onclick: o.onForward,
          html: MBIcons.forward(18)
        })
      ]),
      h('div', { class: 'mb-search' }, [box, panel]),
      h('div', { class: 'mb-topbar__tools' }, [
        neteaseAccountTrigger(o),
        h('button', { class: 'mb-window-btn', title: '\u6700\u5c0f\u5316', onclick: o.onMinimize, text: '-' }),
        h('button', { class: 'mb-window-btn', title: '\u6700\u5927\u5316', onclick: o.onMaximize, text: '\u25a1' }),
        h('button', { class: 'mb-window-btn mb-window-btn--close', title: '\u5173\u95ed', onclick: o.onClose, text: '\u00d7' }),
        h('button', { class: 'mb-icon-btn', title: '\u8bbe\u7f6e', onclick: o.onSettingsClick, html: MBIcons.settings(18) })
      ])
    ]);
  }

  function neteaseAccountTrigger(o) {
    var status = o.neteaseStatus || 'signed-out';
    var cls = status === 'online' ? 'online' : (status === 'offline' ? 'offline' : 'signedout');
    var label = status === 'online'
      ? '\u7f51\u6613\u4e91\uff1a\u5df2\u767b\u5f55'
      : (status === 'offline' ? '\u7f51\u6613\u4e91\uff1a\u670d\u52a1\u672a\u542f\u52a8' : '\u7f51\u6613\u4e91\uff1a\u672a\u767b\u5f55');
    return h('div', { class: 'mb-netease-account' }, [
      h('button', {
        class: 'mb-netease-account-trigger ' + cls + (o.neteaseMenuOpen ? ' is-open' : ''),
        type: 'button',
        title: label,
        'aria-label': label,
        'aria-haspopup': 'menu',
        'aria-expanded': o.neteaseMenuOpen ? 'true' : 'false',
        onclick: function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (o.onToggleNetEaseMenu) o.onToggleNetEaseMenu();
        }
      }, [
        h('span', { class: 'mb-netease-account-trigger__avatar' + (o.neteaseAvatarUrl ? ' has-image' : '') }, [
          o.neteaseAvatarUrl ? h('img', { src: o.neteaseAvatarUrl, alt: '\u7f51\u6613\u4e91\u5934\u50cf' }) : h('span', { class: 'mb-src-dot' })
        ]),
        h('span', { class: 'mb-netease-account-trigger__state' })
      ]),
      o.neteaseMenuOpen ? neteaseAccountMenu(o, label) : null
    ]);
  }

  function neteaseAccountMenu(o, statusLabel) {
    var accountCenter = o.neteaseAccountCenter || {};
    var migrationRunning = !!o.neteaseAssetMigrationRunning;
    var name = o.neteaseNickname || (o.neteaseStatus === 'online' ? '\u7f51\u6613\u4e91\u7528\u6237' : '\u672a\u767b\u5f55');
    var syncText = o.neteaseLastSyncText || '\u5c1a\u672a\u540c\u6b65';
    var syncStatus = o.neteaseSyncStatus || '\u672a\u767b\u5f55';
    return h('div', { class: 'mb-netease-menu', role: 'menu' }, [
      h('div', { class: 'mb-netease-menu__head' }, [
        h('span', { class: 'mb-netease-menu__avatar' + (o.neteaseAvatarUrl ? ' has-image' : '') }, [
          o.neteaseAvatarUrl ? h('img', { src: o.neteaseAvatarUrl, alt: '\u7f51\u6613\u4e91\u5934\u50cf' }) : h('span', { class: 'mb-src-dot' })
        ]),
        h('span', { class: 'mb-netease-menu__identity' }, [
          h('span', { class: 'mb-netease-menu__name ellipsis' }, name),
          h('span', { class: 'mb-netease-menu__status' }, statusLabel),
          h('span', { class: 'mb-netease-menu__sync ellipsis' }, syncStatus + ' / ' + syncText)
        ])
      ]),
      h('div', { class: 'mb-netease-menu__assets' }, [
        neteaseAsset('\u6211\u559c\u6b22', accountCenter.likedPlaylistCount),
        neteaseAsset('\u521b\u5efa', accountCenter.createdPlaylistCount),
        neteaseAsset('\u6536\u85cf', accountCenter.favoritePlaylistCount),
        neteaseAsset('\u6700\u8fd1', accountCenter.recentPlaybackCount)
      ]),
      h('div', { class: 'mb-netease-menu__status-row' }, [
        h('span', { class: accountCenter.failureCount > 0 ? 'is-danger' : '' }, '\u5931\u8d25 ' + (accountCenter.failureCount || 0)),
        h('span', { class: accountCenter.retryableCount > 0 ? 'is-warning' : '' }, '\u53ef\u91cd\u8bd5 ' + (accountCenter.retryableCount || 0)),
        h('span', {}, '\u5df2\u8fc1\u79fb ' + (accountCenter.migratedTrackCount || 0))
      ]),
      h('div', { class: 'mb-netease-menu__actions' }, [
        neteaseMenuAction(migrationRunning ? '\u67e5\u770b\u8fc1\u79fb\u8fdb\u5ea6' : '\u8fc1\u79fb\u5168\u90e8\u8d44\u4ea7', migrationRunning ? o.onShowNetEaseMigrationProgress : o.onMigrateAllNetEaseAssets, 'mb-netease-menu__action--primary' + (migrationRunning ? ' is-running' : '')),
        neteaseMenuAction(o.neteaseStatus === 'online' ? '\u91cd\u65b0\u767b\u5f55' : '\u767b\u5f55', o.onOpenNetEaseLogin),
        neteaseMenuAction('\u91cd\u8bd5\u540c\u6b65', o.onRetryNetEaseSync),
        neteaseMenuAction('\u8fc1\u79fb\u72b6\u6001', o.onOpenMigrationDashboard),
        neteaseMenuAction('\u590d\u5236\u8bca\u65ad', o.onCopyMigrationDiagnostics)
      ])
    ]);
  }

  function neteaseAsset(label, value) {
    return h('span', { class: 'mb-netease-menu__asset' }, [
      h('span', { class: 'mb-netease-menu__asset-value numeric' }, String(value || 0)),
      h('span', { class: 'mb-netease-menu__asset-label' }, label)
    ]);
  }

  function neteaseMenuAction(label, handler, extraClass) {
    var disabled = !handler;
    return h('button', {
      class: extraClass || '',
      type: 'button',
      role: 'menuitem',
      disabled: disabled ? 'disabled' : null,
      'aria-disabled': disabled ? 'true' : 'false',
      onclick: function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        if (handler) handler();
      }
    }, label);
  }

  function buildPanel(o, results, flat, hasQuery) {
    var nodes = [];
    nodes.push(buildFilters(o.filters || [], o.activeFilter || 'all', o.onSelectFilter));

    if (!hasQuery && (o.history || []).length) {
      nodes.push(termSection('mb-search__history', '\u641c\u7d22\u5386\u53f2', o.history, o.onSelectHistory));
      return nodes;
    }

    if ((o.suggestions || []).length) {
      nodes.push(termSection('mb-search__suggestions', '\u8054\u60f3\u8bcd', o.suggestions, o.onSelectSuggestion));
    }

    if (flat.length === 0 && !hasEntities(results)) {
      nodes.push(h('div', { class: 'mb-search__empty' }, '\u6ca1\u6709\u627e\u5230\u76f8\u5173\u7ed3\u679c\uff0c\u6362\u4e2a\u5173\u952e\u8bcd\u6216\u68c0\u67e5\u7f51\u6613\u4e91\u72b6\u6001'));
      return nodes;
    }

    return nodes.concat(buildGroups(results, o.selectedIndex, o.onSelectTrack, o.onAddToQueue, o.onToggleLike, o.onOpenPlaylist));
  }

  function buildFilters(filters, activeFilter, onSelectFilter) {
    if (!filters.length) return null;
    return h('div', { class: 'mb-search__filters' }, filters.map(function (filter) {
      return h('button', {
        class: 'mb-search__filter' + (filter.id === activeFilter ? ' is-active' : ''),
        type: 'button',
        onclick: function (event) {
          event.preventDefault();
          event.stopPropagation();
          onSelectFilter && onSelectFilter(filter.id);
        }
      }, filter.label);
    }));
  }

  function termSection(className, title, terms, onSelect) {
    return h('div', { class: className }, [
      h('div', { class: 'mb-search-term__head' }, title),
      h('div', { class: 'mb-search-term__list' }, (terms || []).map(function (term) {
        return h('button', {
          class: 'mb-search-term',
          type: 'button',
          onclick: function (event) {
            event.preventDefault();
            event.stopPropagation();
            onSelect && onSelect(term);
          }
        }, term);
      }))
    ]);
  }

  function buildGroups(results, selectedIndex, onSelect, onAddToQueue, onToggleLike, onOpenPlaylist) {
    var runningIndex = 0;
    var nodes = [];

    function group(title, dotClass, list) {
      if (!list.length) return;
      nodes.push(h('div', { class: 'mb-search-group__head' }, [
        h('span', { class: 'mb-src-dot ' + dotClass }),
        title,
        h('span', { class: 'numeric' }, String(list.length))
      ]));

      list.forEach(function (t) {
        var idx = runningIndex++;
        nodes.push(h('div', {
          class: 'mb-search-result-row' + (idx === selectedIndex ? ' is-selected' : ''),
          onclick: function () { onSelect(t); },
          ondblclick: function () { onSelect(t); }
        }, [
          cover(t.cover, 'mb-cover--xs'),
          h('div', { class: 'mb-row__titles' }, [
            h('div', { class: 'mb-row__title ellipsis' }, t.title),
            h('div', { class: 'mb-row__artist ellipsis' }, t.artist + ' / ' + (t.album || ''))
          ]),
          SourceBadge(t.source),
          actionButton('mb-search-result-row__add', '\u6dfb\u52a0\u5230\u64ad\u653e\u961f\u5217', MBIcons.plus(14), function (event) {
            event.stopPropagation();
            onAddToQueue && onAddToQueue(t);
          }),
          actionButton('mb-search-result-row__like' + (t.liked ? ' is-liked' : ''), t.liked ? '\u53d6\u6d88\u6536\u85cf' : '\u6536\u85cf', t.liked ? MBIcons.heartFilled(14) : MBIcons.heart(14), function (event) {
            event.stopPropagation();
            onToggleLike && onToggleLike(t);
          })
        ]));
      });
    }

    group('\u672c\u5730\u97f3\u4e50', 'mb-src-dot--local', results.local || []);
    group('\u7f51\u6613\u4e91\u97f3\u4e50', 'mb-src-dot--netease', results.netease || []);
    entityGroup('\u6b4c\u624b', results.entities && results.entities.artists, nodes, onOpenPlaylist);
    entityGroup('\u4e13\u8f91', results.entities && results.entities.albums, nodes, onOpenPlaylist);
    entityGroup('\u6b4c\u5355', results.entities && results.entities.playlists, nodes, onOpenPlaylist);
    return nodes;
  }

  function entityGroup(title, list, nodes, onOpenPlaylist) {
    if (!list || !list.length) return;
    nodes.push(h('div', { class: 'mb-search-group__head' }, [
      h('span', { class: 'mb-src-dot' }),
      title,
      h('span', { class: 'numeric' }, String(list.length))
    ]));
    list.forEach(function (item) {
      nodes.push(h('div', {
        class: 'mb-search-entity',
        onclick: function () {
          if (item.playlistId && onOpenPlaylist) onOpenPlaylist(item.playlistId);
        }
      }, [
        cover(item.cover, 'mb-cover--xs'),
        h('div', { class: 'mb-row__titles' }, [
          h('div', { class: 'mb-row__title ellipsis' }, item.title),
          h('div', { class: 'mb-row__artist ellipsis' }, item.subtitle)
        ]),
        SourceBadge(item.source),
        item.playlistId ? openEntityButton(item, onOpenPlaylist) : null
      ]));
    });
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

  function actionButton(cls, title, icon, onclick) {
    return h('button', {
      class: 'mb-search-result-row__action ' + cls,
      title: title,
      type: 'button',
      onclick: onclick
    }, h('span', { html: icon }));
  }

  function applySearchFilter(results, searchFilter) {
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

  function hasEntities(results) {
    var entities = results.entities || {};
    return Boolean((entities.artists || []).length || (entities.albums || []).length || (entities.playlists || []).length);
  }

  global.MBTopSearch = TopSearch;
})(window);
