/* =====================================================================
   ui-next/icons.js — 轻量 SVG 图标
   ---------------------------------------------------------------------
   原则：1.5px 描边，16/18/20px 规格，使用 currentColor 继承文字色。
   所有图标用 <svg> 字符串返回，通过 innerHTML 注入。
   正式仓库里：若已有图标方案，可整体替换本文件。
   ===================================================================== */
(function (global) {
  'use strict';

  /** 通用 24x24 viewBox 描边图标的包装。 */
  function stroke(paths, opts) {
    opts = opts || {};
    var size = opts.size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (opts.sw || 1.8) + '" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + paths + '</svg>';
  }

  /** 实心图标（播放 / 暂停等需要实心块的场景）。 */
  function fill(paths, size) {
    size = size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor">' +
      paths + '</svg>';
  }

  var icons = {
    // ---- 品牌音符 ----
    music: function (s) {
      return fill('<path d="M9 17V5l10-2v12"/><circle cx="6" cy="17" r="3"/><circle cx="16" cy="15" r="3"/>', s || 16);
    },

    // ---- 导航 ----
    home: function (s) { return stroke('<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>', { size: s }); },
    library: function (s) { return stroke('<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>', { size: s }); },
    clock: function (s) { return stroke('<circle cx="12" cy="12" r="8.2"/><path d="M12 8v4l2.5 2"/>', { size: s }); },
    heart: function (s) { return stroke('<path d="M12 20s-7-4.4-9.3-8.6C1.2 8.6 2.5 5.5 5.6 5.1c1.9-.2 3.4 1 4.4 2.3 1-1.3 2.5-2.5 4.4-2.3 3.1.4 4.4 3.5 2.9 6.3C19 15.6 12 20 12 20z"/>', { size: s }); },
    heartFilled: function (s) { return fill('<path d="M12 20.5s-7.3-4.5-9.7-9C.7 8.4 2 4.8 5.6 4.4c2-.3 3.6 1 4.6 2.4 1-1.4 2.6-2.7 4.6-2.4 3.6.4 4.9 4 3.3 7.1-2.4 4.5-9.7 9-9.7 9z"/>', s || 16); },
    settings: function (s) { return stroke('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>', { size: s }); },

    // ---- 搜索 / 导航 ----
    search: function (s) { return stroke('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', { size: s }); },
    back: function (s) { return stroke('<path d="M15 5l-7 7 7 7"/>', { size: s }); },
    forward: function (s) { return stroke('<path d="M9 5l7 7-7 7"/>', { size: s }); },

    // ---- 播放控制（实心）----
    play: function (s) { return fill('<path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z"/>', s || 18); },
    pause: function (s) { return fill('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', s || 18); },
    prev: function (s) { return fill('<path d="M7 5a1 1 0 0 1 2 0v5.2l9-5.4a1 1 0 0 1 1.5.86V18.3a1 1 0 0 1-1.5.86L9 13.7V19a1 1 0 0 1-2 0V5z"/>', s || 18); },
    next: function (s) { return fill('<path d="M17 5a1 1 0 0 0-2 0v5.2L6 4.8a1 1 0 0 0-1.5.86V18.3a1 1 0 0 0 1.5.86l9-5.46V19a1 1 0 0 0 2 0V5z"/>', s || 18); },

    // ---- 播放模式 ----
    sequence: function (s) { return stroke('<path d="M4 7h12l-2.5-2.5M20 17H8l2.5 2.5"/>', { size: s }); },
    repeatOne: function (s) { return stroke('<path d="M17 3l3 3-3 3"/><path d="M20 6H9a4 4 0 0 0-4 4v1"/><path d="M7 21l-3-3 3-3"/><path d="M4 18h11a4 4 0 0 0 4-4v-1"/><text x="12" y="14" font-size="7" fill="currentColor" stroke="none" font-family="sans-serif" text-anchor="middle">1</text>', { size: s }); },
    shuffle: function (s) { return stroke('<path d="M16 4h4v4"/><path d="M4 20L20 4"/><path d="M16 20h4v-4"/><path d="M4 4l5 5"/><path d="M15 15l5 5"/>', { size: s }); },

    // ---- 辅助 ----
    list: function (s) { return stroke('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', { size: s }); },
    queue: function (s) { return stroke('<path d="M3 6h13M3 12h9"/><path d="M17 12l4 3-4 3v-6z" fill="currentColor"/><path d="M3 18h6"/>', { size: s }); },
    volume: function (s) { return stroke('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 7a8 8 0 0 1 0 10"/>', { size: s }); },
    volumeMute: function (s) { return stroke('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M22 9l-5 5M17 9l5 5"/>', { size: s }); },
    lyrics: function (s) { return stroke('<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5"/>', { size: s }); },
    refresh: function (s) { return stroke('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>', { size: s }); },
    plus: function (s) { return stroke('<path d="M12 5v14M5 12h14"/>', { size: s }); },
    importIcon: function (s) { return stroke('<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>', { size: s }); },
    trash: function (s) { return stroke('<path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>', { size: s }); },
    close: function (s) { return stroke('<path d="M6 6l12 12M18 6L6 18"/>', { size: s }); },

    // ---- 空状态 ----
    emptyMusic: function (s) { return stroke('<circle cx="12" cy="12" r="9"/><path d="M9 16V9l7-2v7"/><circle cx="7" cy="16" r="2"/><circle cx="14" cy="14" r="2"/>', { size: s || 40, sw: 1.4 }); },

    // ---- 播放浮层（封面上的小播放）----
    miniPlay: function (s) { return fill('<path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z"/>', s || 16); }
  };

  global.MBIcons = icons;
})(window);
