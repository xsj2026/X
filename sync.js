/* ============================================================
   🐰 开心肖笑乐 · 云同步模块 (WBSync)
   ------------------------------------------------------------
   原理：把工作台全部数据（workbuddy.* 开头的 localStorage 键）
   统一镜像到你的 GitHub 仓库里的一个 JSON 文件。
   手机、电脑打开同一个页面 → 读写同一份云端数据 → 天然串联。

   · 零第三方服务，数据只在你自己的 GitHub 仓库里
   · 免注册：只需一个 GitHub Token（只需 repo 读写权限）
   · 断网可用：本地 localStorage 作为缓存兜底
   · 自动同步：写入后防抖上传；每 20 秒轮询云端变化

   挂载：window.WBSync
   ============================================================ */
(function () {
  'use strict';

  // ---------- 配置 ----------
  const LS = {
    cfg:    'wbsync.config.v1',      // {owner, repo, path, branch}
    token:  'wbsync.token.v1',       // GitHub Token（仅存本机）
    shadow: 'wbsync.shadow.v1',      // 上次同步时的数据快照（用于就近取新）
    stamp:  'wbsync.stamp.v1'        // 上次同步时的 blob sha
  };

  const SYNC_PREFIX = 'workbuddy.';   // 需要同步的 localStorage 键前缀
  const DEFAULT_CFG = {
    owner: 'xsj2026',
    repo:  'X',
    path:  'data.json',
    branch:'main'
  };

  const PUSH_DEBOUNCE_MS = 1200;      // 本地改动后多久上传
  const POLL_MS          = 20000;     // 轮询云端间隔

  // ---------- 状态 ----------
  const state = {
    cfg: null,
    token: '',
    online: false,      // 是否已配置好可同步
    syncing: false,
    lastSyncAt: 0,
    lastError: '',
    remoteSha: null,
    pollTimer: null
  };

  const listeners = [];   // 状态变化回调（用于 UI 指示）
  const remoteAppliedHooks = []; // 云端数据被应用后的回调（用于刷新界面）

  // ---------- 工具 ----------
  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // 收集本地所有工作台数据
  function collectLocal() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(SYNC_PREFIX) === 0) {
        try { out[k] = JSON.parse(localStorage.getItem(k)); }
        catch (e) { out[k] = localStorage.getItem(k); }
      }
    }
    return out;
  }

  // 把云端数据写回本地（不触发上传）
  function applyRemote(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(k => {
      if (k.indexOf(SYNC_PREFIX) !== 0) return;
      try { localStorage.setItem(k, JSON.stringify(data[k])); } catch (e) {}
    });
  }

  // 本地数据指纹（用于判断是否有变化）
  function fingerprint(obj) {
    try { return JSON.stringify(obj); } catch (e) { return ''; }
  }

  function notify() {
    listeners.forEach(fn => { try { fn(state); } catch (e) {} });
  }

  // ---------- GitHub API ----------
  function apiBase() {
    const c = state.cfg;
    return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(c.path)}`;
  }

  // base64 支持中文
  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64decode(str) {
    return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
  }

  // 通过 GitHub API 拉取（含 sha，写操作前必用）
  async function fetchRemoteViaAPI() {
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    const url = apiBase() + '?ref=' + encodeURIComponent(state.cfg.branch) + '&t=' + Date.now();
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('API拉取失败 HTTP ' + res.status + ' ' + t.slice(0, 120));
    }
    const json = await res.json();
    let text = '';
    if (json.content) text = b64decode(json.content);
    else if (json.download_url) {
      const r2 = await fetch(json.download_url + '?t=' + Date.now(), { cache: 'no-store' });
      text = await r2.text();
    }
    let data = null;
    try { data = JSON.parse(text); } catch (e) { data = null; }
    return { data, sha: json.sha };
  }

  // 通过 CDN 拉取（无 sha，仅用于读取；国内更快、更不容易被拦）
  async function fetchRemoteViaCDN() {
    const c = state.cfg;
    const urls = [
      `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${encodeURIComponent(c.branch)}/${c.path}?t=${Date.now()}`,
      `https://cdn.jsdelivr.net/gh/${c.owner}/${c.repo}@${encodeURIComponent(c.branch)}/${c.path}?t=${Date.now()}`
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (r.status === 404) continue;
        if (!r.ok) continue;
        const text = await r.text();
        let data = null;
        try { data = JSON.parse(text); } catch (e) { continue; }
        return { data, sha: null, via: u.indexOf('jsdelivr') >= 0 ? 'jsdelivr' : 'raw' };
      } catch (e) { /* 试下一个源 */ }
    }
    return undefined; // undefined = 所有 CDN 都失败/不存在
  }

  // 拉取云端文件 {data, sha} 或 null（不存在）
  // 策略：优先 GitHub API（拿得到 sha）；API 不可达时降级到 CDN 读取
  async function fetchRemote(needSha) {
    try {
      const r = await fetchRemoteViaAPI();
      return r;
    } catch (e) {
      if (needSha) throw e;              // 写操作前必须拿到 sha，不能降级
      const cdn = await fetchRemoteViaCDN();
      if (cdn === undefined) throw e;    // CDN 也没有 → 抛原错误
      return cdn;                        // 读到数据，只是没有 sha
    }
  }

  // 推送本地数据到云端（自动处理 409：文件已存在但没带 sha 时，重新取 sha 再试一次）
  async function pushRemote(localData, sha) {
    if (!state.token) throw new Error('未配置 Token，无法上传');
    const doPut = async (s) => {
      const body = {
        message: 'workbuddy sync ' + new Date().toISOString(),
        content: b64encode(JSON.stringify(localData)),
        branch: state.cfg.branch
      };
      if (s) body.sha = s;
      return fetch(apiBase(), {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + state.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    };

    let res = await doPut(sha);
    // 409 = 文件已存在但 sha 缺失/过期 → 重新取 sha 重试
    if (res.status === 409 || res.status === 422) {
      try {
        const head = await fetchRemoteViaAPI();
        if (head && head.sha) res = await doPut(head.sha);
      } catch (e) { /* 保留下面的错误 */ }
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('上传失败 HTTP ' + res.status + ' ' + t.slice(0, 160));
    }
    return await res.json();
  }

  // ---------- 核心同步 ----------
  // 首次同步：决定「云端为准」还是「本地为准」
  async function bootstrap() {
    state.syncing = true; notify();
    try {
      const remote = await fetchRemote();
      const localData = collectLocal();
      const shadow = readLS(LS.shadow, {});

      if (!remote) {
        // 云端还没有文件：以本地为准，创建
        if (state.token) {
          const r = await pushRemote(localData, null);
          state.remoteSha = r && r.content ? r.content.sha : null;
          writeLS(LS.shadow, localData);
          if (state.remoteSha) writeLS(LS.stamp, state.remoteSha);
        }
      } else {
        state.remoteSha = remote.sha;
        const remoteData = remote.data || {};
        const remoteChanged = fingerprint(remoteData) !== fingerprint(shadow);
        const localChanged  = fingerprint(localData)  !== fingerprint(shadow);

        if (remoteChanged && !localChanged) {
          // 只有云端变了 → 采用云端
          applyRemote(remoteData);
          writeLS(LS.shadow, remoteData);
          writeLS(LS.stamp, remote.sha);
          fireRemoteApplied();
        } else if (localChanged && !remoteChanged) {
          // 只有本地变了 → 上传本地
          if (state.token) {
            const r = await pushRemote(localData, remote.sha);
            state.remoteSha = r && r.content ? r.content.sha : remote.sha;
            writeLS(LS.shadow, localData);
            if (state.remoteSha) writeLS(LS.stamp, state.remoteSha);
          }
        } else if (remoteChanged && localChanged) {
          // 两边都变了 → 合并，本地优先（个人使用，本地操作更"新"）
          const merged = Object.assign({}, remoteData, localData);
          applyRemote(merged);
          if (state.token) {
            const r = await pushRemote(merged, remote.sha);
            state.remoteSha = r && r.content ? r.content.sha : remote.sha;
          }
          writeLS(LS.shadow, merged);
          if (state.remoteSha) writeLS(LS.stamp, state.remoteSha);
          fireRemoteApplied();
        } else {
          // 都没变
          writeLS(LS.stamp, remote.sha);
        }
      }
      state.lastError = '';
      state.lastSyncAt = Date.now();
    } catch (e) {
      state.lastError = String(e.message || e);
    } finally {
      state.syncing = false; notify();
    }
  }

  // 本地有改动时调用（防抖上传）
  let pushTimer = null;
  function schedulePush() {
    if (!state.online || !state.token) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS);
  }

  async function doPush() {
    if (state.syncing) { return schedulePush(); }
    state.syncing = true; notify();
    try {
      // 先取最新 sha，避免 409
      let sha = state.remoteSha;
      try {
        const head = await fetchRemote(true);   // 必须走 API 拿 sha
        if (head) sha = head.sha;
      } catch (e) { /* 忽略，沿用旧 sha */ }

      const localData = collectLocal();
      const r = await pushRemote(localData, sha);
      state.remoteSha = r && r.content ? r.content.sha : sha;
      writeLS(LS.shadow, localData);
      if (state.remoteSha) writeLS(LS.stamp, state.remoteSha);
      state.lastError = '';
      state.lastSyncAt = Date.now();
    } catch (e) {
      state.lastError = String(e.message || e);
    } finally {
      state.syncing = false; notify();
    }
  }

  // 轮询：检测云端是否被别的设备改了
  async function poll() {
    if (!state.online || state.syncing) return;
    try {
      const remote = await fetchRemote();
      if (!remote) return;
      if (remote.sha && remote.sha !== state.remoteSha) {
        // 云端更新了 → 应用
        const shadow = readLS(LS.shadow, {});
        const remoteData = remote.data || {};
        if (fingerprint(remoteData) !== fingerprint(shadow)) {
          state.syncing = true; notify();
          applyRemote(remoteData);
          writeLS(LS.shadow, remoteData);
          writeLS(LS.stamp, remote.sha);
          state.remoteSha = remote.sha;
          state.lastSyncAt = Date.now();
          state.syncing = false; notify();
          fireRemoteApplied();
        } else {
          state.remoteSha = remote.sha;
        }
      }
    } catch (e) {
      state.lastError = String(e.message || e);
      notify();
    }
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(poll, POLL_MS);
  }
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  function fireRemoteApplied() {
    remoteAppliedHooks.forEach(fn => { try { fn(); } catch (e) {} });
  }

  // ---------- 对外 API ----------
  const WBSync = {
    state,

    init() {
      state.cfg = Object.assign({}, DEFAULT_CFG, readLS(LS.cfg, {}));
      state.token = localStorage.getItem(LS.token) || '';
      state.online = !!(state.cfg.owner && state.cfg.repo && state.token);
      notify();
      if (state.online) {
        bootstrap().then(() => startPolling());
      }
      return this;
    },

    getConfig() { return Object.assign({}, state.cfg); },
    getToken() { return state.token; },

    // 保存配置（可只更新部分字段）
    saveConfig(partial, token) {
      if (partial) {
        state.cfg = Object.assign({}, state.cfg, partial);
        writeLS(LS.cfg, state.cfg);
      }
      if (token !== undefined) {
        state.token = token.trim();
        if (state.token) localStorage.setItem(LS.token, state.token);
        else localStorage.removeItem(LS.token);
      }
      state.online = !!(state.cfg.owner && state.cfg.repo && state.token);
      notify();
    },

    // 手动立即同步
    async syncNow() {
      if (!state.online) { state.lastError = '未配置仓库/Token'; notify(); return; }
      await bootstrap();
      startPolling();
    },

    // 标记本地发生了改动 → 触发上传
    markDirty() { schedulePush(); },

    // 强行用云端覆盖本地
    async pullNow() {
      if (!state.online) { return; }
      state.syncing = true; notify();
      try {
        const remote = await fetchRemote();
        if (remote) {
          applyRemote(remote.data || {});
          writeLS(LS.shadow, remote.data || {});
          writeLS(LS.stamp, remote.sha);
          state.remoteSha = remote.sha;
          state.lastSyncAt = Date.now();
          state.lastError = '';
          fireRemoteApplied();
        }
      } catch (e) { state.lastError = String(e.message || e); }
      finally { state.syncing = false; notify(); }
    },

    // 强行把本地覆盖到云端
    async pushNow() {
      if (!state.online) { return; }
      await doPush();
    },

    onStateChange(fn) { listeners.push(fn); },
    onRemoteApplied(fn) { remoteAppliedHooks.push(fn); },

    // 清空本地数据（危险操作）
    wipeLocal() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(SYNC_PREFIX) === 0) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    }
  };

  window.WBSync = WBSync;
})();
