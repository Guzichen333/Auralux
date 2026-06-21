const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`);
  }
}

function assertNotIncludes(content, forbidden, label) {
  if (content.includes(forbidden)) {
    throw new Error(`${label}: still contains ${forbidden}`);
  }
}

const warmup = read('src/renderer/src/ui-next/startupWarmup.ts');
assertNotIncludes(warmup, 'Preload playlist cover metadata', 'startup task label must be Chinese');
assertNotIncludes(warmup, 'Warm lyrics cache index', 'startup task label must be Chinese');
assertNotIncludes(warmup, 'cover cache hits', 'startup cover cache hit message must be Chinese');
assertNotIncludes(warmup, 'queued cover checks', 'startup queued cover message must be Chinese');
assertNotIncludes(warmup, 'cover cache ready', 'startup cover cache ready message must be Chinese');
assertNotIncludes(warmup, 'lyrics cache warmed', 'startup lyrics warm message must be Chinese');
assertNotIncludes(warmup, 'lyrics cache index ready', 'startup lyrics ready message must be Chinese');
assertIncludes(warmup, '预加载歌单封面', 'startup must show playlist cover warmup task');
assertIncludes(warmup, '预热歌词索引', 'startup must show lyrics index warmup task');
assertIncludes(warmup, '封面缓存命中', 'startup cover cache hit copy');
assertIncludes(warmup, '已排队检查封面', 'startup queued cover copy');
assertIncludes(warmup, '歌单封面缓存已就绪', 'startup cover ready copy');
assertIncludes(warmup, '歌词索引已预热', 'startup lyrics warmed copy');
assertIncludes(warmup, '歌词索引已就绪', 'startup lyrics ready copy');

const bootstrap = read('src/renderer/src/ui-next/bootstrap.ts');
assertIncludes(bootstrap, '正在准备你的音乐空间', 'startup splash subtitle');
assertIncludes(bootstrap, 'renderStartupSplash', 'startup splash renderer');
assertIncludes(bootstrap, 'waitForStartupExit', 'startup exit guard');

console.log('Startup stage 47 guard passed.');
