/* =====================================================================
   ui-next/types.js — 领域类型定义（JSDoc 形式）
   ---------------------------------------------------------------------
   正式仓库中可作为 ui-next/types.ts。这里用 JSDoc 描述形状，
   既能在浏览器原生运行，也能让 TS 提供 d.ts 提示。

   命名刻意和未来 PlaybackController / LibraryController / NetEase
   服务层对齐，方便后续真实接入时少改类型。
   ===================================================================== */
(function (global) {
  'use strict';

  /* 来源：本地 / 网易云。 */
  /**
   * @typedef {'local' | 'netease'} Source
   */

  /**
   * @typedef {Object} Track
   * @property {string} id
   * @property {string} title
   * @property {string} artist
   * @property {string} album
   * @property {number} duration        // 秒
   * @property {string} cover           // 封面 URL
   * @property {Source} source          // local | netease
   * @property {boolean} liked
   * @property {string} [filePath]      // 本地文件路径（可空 / mock）
   * @property {boolean} [isVip]        // 网易云 VIP 曲目标记（可选）
   */

  /**
   * @typedef {Object} Playlist
   * @property {string} id
   * @property {string} name
   * @property {string} description
   * @property {string} cover
   * @property {number} trackCount
   * @property {Source} source          // local | netease
   * @property {string} updatedAt       // ISO 字符串 / 显示用
   * @property {string[]} [trackIds]    // 曲目 id 列表（mock 关联用）
   */

  /**
   * @typedef {Object} SearchResults
   * @property {Track[]} local          // 本地结果
   * @property {Track[]} netease        // 网易云结果
   */

  /**
   * @typedef {Object} QueueState
   * @property {Track[]} tracks
   * @property {number} currentIndex    // 当前播放 index
   */

  /** 播放模式：顺序 / 单曲循环 / 随机 */
  /**
   * @typedef {'sequence' | 'repeat-one' | 'shuffle'} PlayMode
   */

  /** 视图类型（中央内容区路由） */
  /**
   * @typedef {'home' | 'playlist' | 'search' | 'library'} ViewKind
   */

  /**
   * @typedef {Object} ShellState
   * @property {Track|null} currentTrack
   * @property {boolean} isPlaying
   * @property {number} position        // 当前播放秒数
   * @property {number} duration        // 当前曲目总秒数
   * @property {number} volume          // 0~1
   * @property {boolean} muted
   * @property {PlayMode} playMode
   * @property {QueueState} queue
   * @property {ViewKind} view
   * @property {string|null} activePlaylistId
   * @property {string} searchQuery
   * @property {boolean} queueOpen
   * @property {'online' | 'offline' | 'signed-out'} neteaseStatus
   */

  global.MBTypes = {
    // 仅作为命名空间导出，类型由 JSDoc 提供。
  };
})(window);
