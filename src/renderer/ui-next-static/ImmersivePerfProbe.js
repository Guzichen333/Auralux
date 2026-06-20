(function (global) {
  'use strict';

  function isEnabled() {
    try {
      var search = global.location && global.location.search ? global.location.search : '';
      return search.indexOf('immersive-perf') >= 0 || global.localStorage.getItem('musicbox:immersivePerf') === '1';
    } catch (error) {
      return false;
    }
  }

  function ImmersivePerfProbe() {
    this.enabled = isEnabled();
    this.frameCount = 0;
    this.rafLast = 0;
    this.rafMin = Infinity;
    this.rafMax = 0;
    this.rafTotal = 0;
    this.progressUpdates = 0;
    this.lyricCharUpdates = 0;
    this.renderCount = 0;
    this.lastLog = performance.now();
    this.videoFrames = 0;
    this.videoDropped = 0;
    this.lastVideoFrames = 0;
    this.lastVideoDropped = 0;
    this.lyricNodes = 0;
    this.wordNodes = 0;
    this.videoSrc = '';
    this._rafId = 0;
    if (this.enabled) this.start();
  }

  ImmersivePerfProbe.prototype.start = function () {
    if (this._rafId) return;
    var self = this;
    function loop(now) {
      self.frameCount += 1;
      if (self.rafLast) {
        var delta = now - self.rafLast;
        self.rafMin = Math.min(self.rafMin, delta);
        self.rafMax = Math.max(self.rafMax, delta);
        self.rafTotal += delta;
      }
      self.rafLast = now;
      self._rafId = requestAnimationFrame(loop);
    }
    this._rafId = requestAnimationFrame(loop);
  };

  ImmersivePerfProbe.prototype.stop = function () {
    if (!this._rafId) return;
    cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  };

  ImmersivePerfProbe.prototype.markRender = function () {
    if (!this.enabled) return;
    this.renderCount += 1;
  };

  ImmersivePerfProbe.prototype.markProgressUpdate = function () {
    if (!this.enabled) return;
    this.progressUpdates += 1;
  };

  ImmersivePerfProbe.prototype.markLyricCharUpdate = function () {
    if (!this.enabled) return;
    this.lyricCharUpdates += 1;
  };

  ImmersivePerfProbe.prototype.collectDom = function (root) {
    if (!this.enabled || !root) return;
    var video = root.querySelector('.mb-immersive__bg-video');
    this.lyricNodes = root.querySelectorAll('.mb-immersive__lyric').length;
    this.wordNodes = root.querySelectorAll('.mb-immersive__lyric-char').length;
    this.videoSrc = video ? video.currentSrc || video.src || '' : '';
    if (video && typeof video.getVideoPlaybackQuality === 'function') {
      var quality = video.getVideoPlaybackQuality();
      this.videoFrames = quality.totalVideoFrames || 0;
      this.videoDropped = quality.droppedVideoFrames || 0;
    } else if (video) {
      this.videoFrames = video.webkitDecodedFrameCount || 0;
      this.videoDropped = video.webkitDroppedFrameCount || 0;
    } else {
      this.videoFrames = 0;
      this.videoDropped = 0;
    }
  };

  ImmersivePerfProbe.prototype.maybeLog = function (root) {
    if (!this.enabled) return;
    var now = performance.now();
    if (now - this.lastLog < 5000) return;
    this.collectDom(root);

    var elapsed = Math.max(1, now - this.lastLog);
    var fps = this.frameCount * 1000 / elapsed;
    var avgFrame = this.frameCount > 1 ? this.rafTotal / Math.max(1, this.frameCount - 1) : 0;
    var dropRatio = this.videoFrames > 0 ? this.videoDropped / this.videoFrames : 0;
    var videoFrameDelta = Math.max(0, this.videoFrames - this.lastVideoFrames);
    var videoDroppedDelta = Math.max(0, this.videoDropped - this.lastVideoDropped);
    var videoFps = videoFrameDelta * 1000 / elapsed;
    var videoDroppedRatio = videoFrameDelta > 0 ? videoDroppedDelta / videoFrameDelta : 0;
    var payload = {
      fps: Number(fps.toFixed(1)),
      frameMsAvg: Number(avgFrame.toFixed(2)),
      frameMsMin: Number((this.rafMin === Infinity ? 0 : this.rafMin).toFixed(2)),
      frameMsMax: Number(this.rafMax.toFixed(2)),
      progressUpdates: this.progressUpdates,
      lyricCharUpdates: this.lyricCharUpdates,
      renders: this.renderCount,
      lyricNodes: this.lyricNodes,
      wordNodes: this.wordNodes,
      videoFrames: this.videoFrames,
      droppedVideoFrames: this.videoDropped,
      videoFps: Number(videoFps.toFixed(1)),
      intervalVideoFrames: videoFrameDelta,
      intervalDroppedVideoFrames: videoDroppedDelta,
      droppedRatio: Number((dropRatio * 100).toFixed(2)) + '%',
      intervalDroppedRatio: Number((videoDroppedRatio * 100).toFixed(2)) + '%',
      videoSrc: this.videoSrc
    };
    console.info('[immersive-perf]', JSON.stringify(payload));

    this.frameCount = 0;
    this.rafMin = Infinity;
    this.rafMax = 0;
    this.rafTotal = 0;
    this.progressUpdates = 0;
    this.lyricCharUpdates = 0;
    this.renderCount = 0;
    this.lastVideoFrames = this.videoFrames;
    this.lastVideoDropped = this.videoDropped;
    this.lastLog = now;
  };

  global.MBImmersivePerfProbe = ImmersivePerfProbe;
})(window);
