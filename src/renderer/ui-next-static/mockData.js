/* =====================================================================
   ui-next/mockData.js — 全部 mock 数据
   ---------------------------------------------------------------------
   仅用于视觉原型 / 基础交互验证，绝不调用真实服务。
   正式仓库接入时：用 PlaybackController / LibraryController /
   NetEase 服务层的真实数据替换本文件导出。

   封面用 picsum.photos 的稳定 seed 占位（真实感、互不相同）。
   ===================================================================== */
(function (global) {
  'use strict';

  // 封面辅助：picsum 稳定 seed，互不相同的真实感图片
  function cover(seed, size) {
    size = size || 300;
    return 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/' + size + '/' + size;
  }

  /* ---------------- Tracks ---------------- */
  /**
   * @type {import('./types').Track[]}
   */
  var tracks = [
    // —— 本地曲目 ——
    { id: 't01', title: '海边灯塔',   artist: '林夕',     album: '夜航 EP',      duration: 222, cover: cover('lighthouse'),    source: 'local',   liked: true,  filePath: 'D:/Music/林夕 - 海边灯塔.flac' },
    { id: 't02', title: '夜航',       artist: '林夕',     album: '夜航 EP',      duration: 250, cover: cover('night-sail'),    source: 'local',   liked: false, filePath: 'D:/Music/林夕 - 夜航.flac' },
    { id: 't03', title: '潮汐',       artist: '阿渔',     album: '漂流',         duration: 208, cover: cover('tide-01'),       source: 'local',   liked: false, filePath: 'D:/Music/阿渔 - 潮汐.mp3' },
    { id: 't04', title: '冬天的树',   artist: '陈墨',     album: '无声电影',     duration: 274, cover: cover('winter-tree'),   source: 'local',   liked: true,  filePath: 'D:/Music/陈墨 - 冬天的树.flac' },
    { id: 't05', title: '城市夜行',   artist: 'The Maze', album: 'Neon',         duration: 196, cover: cover('neon-city'),     source: 'local',   liked: false, filePath: 'D:/Music/The Maze - 城市夜行.flac' },
    { id: 't06', title: '九月',       artist: '周野',     album: '旧时光',       duration: 233, cover: cover('september'),     source: 'local',   liked: false, filePath: 'D:/Music/周野 - 九月.mp3' },
    { id: 't07', title: '玻璃心',     artist: '苏曼',     album: '透明',         duration: 188, cover: cover('glass-02'),      source: 'local',   liked: false, filePath: 'D:/Music/苏曼 - 玻璃心.flac' },
    { id: 't08', title: '北纬四十度', artist: '老郑',     album: '北方',         duration: 301, cover: cover('north-40'),      source: 'local',   liked: true,  filePath: 'D:/Music/老郑 - 北纬四十度.flac' },
    { id: 't09', title: '雨后',       artist: '阿渔',     album: '漂流',         duration: 215, cover: cover('after-rain'),    source: 'local',   liked: false, filePath: 'D:/Music/阿渔 - 雨后.mp3' },
    { id: 't10', title: '旧码头',     artist: '陈墨',     album: '无声电影',     duration: 258, cover: cover('old-pier'),      source: 'local',   liked: false, filePath: 'D:/Music/陈墨 - 旧码头.flac' },

    // —— 网易云曲目 ——
    { id: 'n01', title: '晚风',       artist: '叶蓓',     album: '漂流瓶',       duration: 199, cover: cover('evening-wind'),  source: 'netease', liked: false, isVip: false },
    { id: 'n02', title: '夜空中最亮的星', artist: '逃跑计划', album: '世界',      duration: 252, cover: cover('brightest-star'),source: 'netease', liked: true,  isVip: false },
    { id: 'n03', title: '理想三旬',   artist: '陈鸿宇',   album: '一如年少模样', duration: 286, cover: cover('ideal-thirty'),  source: 'netease', liked: false, isVip: false },
    { id: 'n04', title: '成都',       artist: '赵雷',     album: '无法长大',     duration: 327, cover: cover('chengdu-city'),  source: 'netease', liked: false, isVip: false },
    { id: 'n05', title: '南山南',     artist: '马頔',     album: '孤岛',         duration: 326, cover: cover('south-mountain'),source: 'netease', liked: false, isVip: false },
    { id: 'n06', title: '董小姐',     artist: '宋冬野',   album: '安和桥北',     duration: 286, cover: cover('dong-lady'),     source: 'netease', liked: true,  isVip: false },
    { id: 'n07', title: '纸短情长',   artist: '烟把儿',   album: '纸短情长',     duration: 245, cover: cover('paper-love'),    source: 'netease', liked: false, isVip: true },
    { id: 'n08', title: '光年之外',   artist: '邓紫棋',   album: '光年之外',     duration: 235, cover: cover('lightyear'),     source: 'netease', liked: false, isVip: true },
    { id: 'n09', title: '起风了',     artist: '买辣椒也用券', album: '起风了',   duration: 325, cover: cover('wind-rises'),    source: 'netease', liked: false, isVip: false },
    { id: 'n10', title: '漠河舞厅',   artist: '柳爽',     album: '漠河舞厅',     duration: 286, cover: cover('mohe-dance'),    source: 'netease', liked: false, isVip: false }
  ];

  /* ---------------- Playlists ---------------- */
  /**
   * @type {import('./types').Playlist[]}
   */
  var playlists = [
    { id: 'pl01', name: '夜航电台',     description: '深夜一个人听，适合写代码和发呆的本地私房歌单。', cover: cover('pl-night', 400), trackCount: 10, source: 'local',   updatedAt: '2026-05-28', trackIds: ['t01','t02','t03','t04','t05','t06','t07','t08','t09','t10'] },
    { id: 'pl02', name: '民谣合集',     description: '从北到南，那些慢慢唱的故事。',                    cover: cover('pl-folk', 400),  trackCount: 6,  source: 'local',   updatedAt: '2026-05-20', trackIds: ['t04','t06','t09','t10','t03','t07'] },
    { id: 'pl03', name: '通勤必备',     description: '早高峰地铁里，让自己保持清醒。',                  cover: cover('pl-commute', 400), trackCount: 5, source: 'local', updatedAt: '2026-06-01', trackIds: ['t05','t02','t01','t08','t06'] },
    { id: 'pl04', name: '深夜电台',     description: '网易云同步歌单 · 每周三更新。',                   cover: cover('pl-late', 400),  trackCount: 8,  source: 'netease', updatedAt: '2026-06-12', trackIds: ['n01','n02','n03','n04','n05','n06','n07','n08'] },
    { id: 'pl05', name: '华语流行精选', description: '近五年最常被单曲循环的华语流行。',                cover: cover('pl-pop', 400),   trackCount: 6,  source: 'netease', updatedAt: '2026-06-10', trackIds: ['n04','n07','n08','n09','n02','n10'] },
    { id: 'pl06', name: '民谣·远方',   description: '网易云同步歌单 · 适合出走。',                      cover: cover('pl-far', 400),   trackCount: 5,  source: 'netease', updatedAt: '2026-06-08', trackIds: ['n03','n05','n06','n01','n10'] }
  ];

  /* ---------------- 队列 ---------------- */
  /**
   * @type {import('./types').QueueState}
   */
  var queue = {
    tracks: [
      byId('t01'), byId('n02'), byId('t04'), byId('n04'),
      byId('t08'), byId('n06'), byId('t05'), byId('n09')
    ],
    currentIndex: 0
  };

  /* ---------------- 当前播放 ---------------- */
  /** @type {import('./types').Track | null} */
  var currentTrack = queue.tracks[0] || null;

  /* ---------------- 搜索结果（mock） ----------------
     实际交互里由 shell 根据输入在 tracks 上做过滤生成，
     这里只暴露一个 fallback 的“空结果”。 */
  /**
   * @type {import('./types').SearchResults}
   */
  var emptySearchResults = { local: [], netease: [] };

  /* ---------------- 网易云在线状态（mock） ---------------- */
  var neteaseStatus = 'online'; // 'online' | 'offline' | 'signed-out'

  /* ---------------- 辅助 ---------------- */
  /** 按 id 查 track（深拷贝避免外部误改原数据）。 */
  function byId(id) {
    var t = tracks.filter(function (x) { return x.id === id; })[0];
    return t ? JSON.parse(JSON.stringify(t)) : null;
  }
  /** 按 id 查 playlist。 */
  function playlistById(id) {
    var p = playlists.filter(function (x) { return x.id === id; })[0];
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }
  /** 按 playlist 取其曲目列表。 */
  function tracksForPlaylist(playlistId) {
    var p = playlistById(playlistId);
    if (!p || !p.trackIds) return [];
    return p.trackIds.map(byId).filter(Boolean);
  }

  global.MusicBoxMock = {
    tracks: tracks,
    playlists: playlists,
    queue: queue,
    currentTrack: currentTrack,
    emptySearchResults: emptySearchResults,
    neteaseStatus: neteaseStatus,
    byId: byId,
    playlistById: playlistById,
    tracksForPlaylist: tracksForPlaylist
  };
})(window);
