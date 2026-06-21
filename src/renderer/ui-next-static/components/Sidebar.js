(function (global) {
  'use strict';
  var h = MBUtil.h;

  function navItem(opts) {
    return h('div', {
      class: 'mb-nav-item' + (opts.active ? ' is-active' : '') + (opts.extraClass ? ' ' + opts.extraClass : ''),
      onclick: opts.onclick,
      oncontextmenu: opts.onContextMenu
    }, [
      opts.icon ? h('span', { class: 'mb-nav-item__ico', html: opts.icon }) : null,
      h('span', { class: 'mb-nav-item__label' }, opts.label),
      opts.count != null ? h('span', { class: 'mb-nav-item__count numeric' }, String(opts.count)) : null,
      opts.action ? h('button', {
        class: 'mb-nav-item__action',
        title: opts.actionTitle || '',
        onclick: function (e) {
          e.stopPropagation();
          opts.action();
        }
      }, opts.actionIcon ? h('span', { html: opts.actionIcon }) : '+') : null
    ]);
  }

  function playlistLabel(source, name) {
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 0 } }, [
      h('span', { class: 'mb-src-dot ' + (source === 'netease' ? 'mb-src-dot--netease' : 'mb-src-dot--local') }),
      h('span', { class: 'ellipsis' }, name)
    ]);
  }

  function Sidebar(o) {
    var s = o.state;
    var localPlaylists = o.playlists.filter(function (p) { return p.source === 'local'; });
    var neteasePlaylists = o.playlists.filter(function (p) { return p.source === 'netease'; });

    return h('aside', { class: 'mb-sidebar' }, [
      h('div', { class: 'mb-sidebar__head' }, [
        h('div', { class: 'mb-brand__logo' }, [
          h('img', {
            class: 'mb-brand__logo-img',
            src: 'ui-next/auralux-logo-mascot.png',
            alt: 'Auralux'
          })
        ]),
        h('div', { class: 'mb-brand__name' }, [
          h('span', {}, 'Auralux'),
          h('span', { class: 'mb-brand__ver' }, '聆曜')
        ])
      ]),

      h('div', { class: 'mb-sidebar__scroll' }, [
        h('div', { class: 'mb-nav__section-label' }, '\u6d4f\u89c8'),
        navItem({ icon: MBIcons.home(18), label: '\u9996\u9875', active: s.view === 'home', onclick: function () { o.onNav('home'); } }),
        navItem({ icon: MBIcons.library(18), label: '\u6211\u7684\u97f3\u4e50', count: s.libraryCount || 0, active: s.view === 'library', onclick: function () { o.onNav('library'); } }),
        navItem({ icon: MBIcons.clock(18), label: '\u6700\u8fd1\u64ad\u653e', active: s.view === 'recent', onclick: function () { o.onNav('recent'); } }),
        navItem({ icon: MBIcons.heart(18), label: '\u6211\u7684\u6536\u85cf', active: s.view === 'favorites', onclick: function () { o.onNav('favorites'); } }),
        navItem({ icon: MBIcons.importIcon(18), label: '\u8fc1\u79fb\u72b6\u6001', active: s.view === 'migration-dashboard', onclick: function () { o.onNav('migration-dashboard'); } }),
        navItem({ icon: MBIcons.settings(18), label: '\u8bbe\u7f6e', active: s.view === 'settings', onclick: function () { o.onNav('settings'); } }),

        h('div', { class: 'mb-nav__section-label' }, '\u672c\u5730\u6b4c\u5355'),
        navItem({
          icon: MBIcons.plus(18),
          label: '\u521b\u5efa\u6b4c\u5355',
          extraClass: 'mb-nav-item--playlist-action',
          onclick: function () { if (o.onCreatePlaylist) o.onCreatePlaylist(); }
        }),
        localPlaylists.map(function (p) {
          return navItem({
            extraClass: 'mb-nav-item--playlist',
            label: playlistLabel('local', p.name),
            count: p.trackCount,
            active: s.view === 'playlist' && s.activePlaylistId === p.id,
            onclick: function () { o.onOpenPlaylist(p.id); },
            onContextMenu: o.onOpenPlaylistContextMenu ? function (event) {
              event.preventDefault();
              o.onOpenPlaylistContextMenu(p, event.clientX, event.clientY);
            } : null,
            action: o.onDeletePlaylist ? function () { o.onDeletePlaylist(p.id); } : null,
            actionTitle: '\u5220\u9664\u6b4c\u5355',
            actionIcon: MBIcons.trash(14)
          });
        }),

        h('div', { class: 'mb-nav__section-label' }, '\u7f51\u6613\u4e91\u6b4c\u5355'),
        neteasePlaylists.map(function (p) {
          return navItem({
            extraClass: 'mb-nav-item--playlist',
            label: playlistLabel('netease', p.name),
            count: p.trackCount,
            active: s.view === 'playlist' && s.activePlaylistId === p.id,
            onclick: function () { o.onOpenPlaylist(p.id); },
            onContextMenu: o.onOpenPlaylistContextMenu ? function (event) {
              event.preventDefault();
              o.onOpenPlaylistContextMenu(p, event.clientX, event.clientY);
            } : null
          });
        }),

        h('div', {
          class: 'mb-nav__import',
          onclick: o.onImport,
          title: '\u5bfc\u5165\u7f51\u6613\u4e91\u6b4c\u5355'
        }, [
          h('span', { html: MBIcons.importIcon(14) }),
          h('span', {}, '\u5bfc\u5165\u7f51\u6613\u4e91\u6b4c\u5355')
        ])
      ]),

      h('div', { class: 'mb-sidebar__foot' }, [
        h('span', { class: 'mb-sidebar__foot-text' }, '\u7f51\u6613\u4e91\u8d26\u53f7\u5df2\u79fb\u5230\u53f3\u4e0a\u89d2')
      ])
    ]);
  }

  global.MBSidebar = Sidebar;
})(window);
