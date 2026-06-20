/* =====================================================================
   ui-next/util.js — 小工具函数（无外部依赖）
   ---------------------------------------------------------------------
   正式仓库中可作为 ui-next/util.ts。
   ===================================================================== */
(function (global) {
  'use strict';

  /** 把秒数格式化成 m:ss（或 h:mm:ss）。 */
  function formatTime(seconds) {
    if (seconds == null || isNaN(seconds) || seconds < 0) return '--:--';
    var s = Math.floor(seconds);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    if (h > 0) return h + ':' + pad(m) + ':' + pad(sec);
    return m + ':' + pad(sec);
  }

  /** 简单 debounce，输入去抖（默认 250ms，符合搜索交互规范）。 */
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(ctx, args); }, wait == null ? 250 : wait);
    };
  }

  /** 把值夹在 [min, max] 之间。 */
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /** el 是否是 container 的后代（含 el === container）。 */
  function contains(container, el) {
    if (!container || !el) return false;
    return container === el || container.contains(el);
  }

  /**
   * 创建一个 DOM 元素，并设置属性 / 子节点。
   * 用法：h('div', { class: 'mb-x', 'data-id': '1' }, [child1, 'text'])
   */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (typeof v === 'boolean') {
          if (v) el.setAttribute(k, '');
        }
        else if (k.indexOf('on') === 0 && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'style' && typeof v === 'string') {
          el.setAttribute('style', v);
        } else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (name) {
            if (name.indexOf('--') === 0) el.style.setProperty(name, v[name]);
            else el.style[name] = v[name];
          });
        } else {
          el.setAttribute(k, v);
        }
      });
    }
    if (children != null) {
      appendChildren(el, Array.isArray(children) ? children : [children]);
    }
    return el;
  }

  /** 递归展平 children，支持嵌套数组（map 的结果可直接作为 child 传入）。 */
  function appendChildren(el, children) {
    children.forEach(function (c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { appendChildren(el, c); return; }
      if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode('' + c));
      else el.appendChild(c);
    });
  }

  /** 清空容器并可选地追加节点。 */
  function clear(node, append) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (append) {
      (Array.isArray(append) ? append : [append]).forEach(function (c) {
        if (c) node.appendChild(c);
      });
    }
    return node;
  }

  /**
   * 生成一个带稳定 fallback 的封面节点。
   * - 正常：<img src=cover> 撑满 .mb-cover。
   * - 加载失败 / 无 url：隐藏 img，露出 .mb-cover 本身的渐变 + 音符占位
   *   （由 styles.css 的 .mb-cover.is-fallback 提供）。
   * @param {string} url     封面 URL（可空）
   * @param {string} extraCls 额外 class（如 'mb-cover--xs' / 'mb-player__cover'）
   */
  function cover(url, extraCls) {
    var cls = 'mb-cover' + (extraCls ? ' ' + extraCls : '');
    var node = h('div', { class: cls });
    if (typeof url === 'string' && url.length > 0) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = url;
      img.addEventListener('error', function () {
        // 失败：标记 fallback，移除坏图，露出底色 + 音符
        node.classList.add('is-fallback');
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      node.appendChild(img);
    } else {
      node.classList.add('is-fallback');
    }
    return node;
  }

  global.MBUtil = {
    formatTime: formatTime,
    debounce: debounce,
    clamp: clamp,
    contains: contains,
    h: h,
    clear: clear,
    cover: cover
  };
})(window);
