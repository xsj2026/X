/* ============================================================
   ☁️ 云同步 · 界面 (WBSyncUI)
   在页面右下角挂一个悬浮按钮 + 设置面板
   ============================================================ */
(function () {
  'use strict';

  const CSS = `
  #wbSyncBtn{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:6px;
    padding:10px 14px;border-radius:999px;border:1px solid rgba(0,0,0,.08);cursor:pointer;
    background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.14);font-size:13px;font-weight:600;
    color:#5a4a4a;transition:transform .15s,box-shadow .15s;}
  #wbSyncBtn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.18);}
  #wbSyncBtn .dot{width:9px;height:9px;border-radius:50%;background:#bbb;flex:0 0 auto;}
  #wbSyncBtn .dot.on{background:#38b26a;box-shadow:0 0 0 3px rgba(56,178,106,.18);}
  #wbSyncBtn .dot.busy{background:#f0a500;animation:wbsyncPulse 1s infinite;}
  #wbSyncBtn .dot.err{background:#e05252;}
  @keyframes wbsyncPulse{0%{opacity:.35}50%{opacity:1}100%{opacity:.35}}

  #wbSyncMask{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9999;display:none;}
  #wbSyncMask.show{display:block;}
  #wbSyncPanel{position:fixed;z-index:10000;right:18px;bottom:74px;width:340px;max-width:calc(100vw - 36px);
    background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.24);
    padding:18px;display:none;font-size:13px;color:#3d3232;max-height:80vh;overflow:auto;}
  #wbSyncPanel.show{display:block;}
  #wbSyncPanel h3{margin:0 0 4px;font-size:15px;display:flex;align-items:center;gap:6px;}
  #wbSyncPanel .sub{color:#9a8c8c;font-size:12px;margin-bottom:14px;line-height:1.5;}
  #wbSyncPanel label{display:block;font-weight:600;margin:10px 0 4px;font-size:12px;color:#6b5a5a;}
  #wbSyncPanel input{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #e6dede;border-radius:9px;
    font-size:12.5px;outline:none;background:#fbf9f9;font-family:inherit;}
  #wbSyncPanel input:focus{border-color:#d4a5a5;background:#fff;}
  #wbSyncPanel .row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;}
  #wbSyncPanel button{flex:1;min-width:88px;padding:9px 12px;border-radius:9px;border:1px solid #e6dede;
    background:#fff;cursor:pointer;font-size:12.5px;font-weight:600;color:#5a4a4a;transition:.15s;}
  #wbSyncPanel button:hover{background:#faf5f5;}
  #wbSyncPanel button.primary{background:#d4a5a5;border-color:#d4a5a5;color:#fff;}
  #wbSyncPanel button.primary:hover{background:#c89494;}
  #wbSyncPanel button.danger{color:#d05555;border-color:#f0d5d5;}
  #wbSyncPanel .status{margin-top:14px;padding:10px 12px;background:#faf7f7;border-radius:9px;
    font-size:11.5px;color:#8a7a7a;line-height:1.6;word-break:break-all;}
  #wbSyncPanel .hint{font-size:11px;color:#a99;margin-top:6px;line-height:1.5;}
  #wbSyncPanel a{color:#c08a8a;}
  #wbSyncPanel .ok{color:#38b26a;font-weight:600;}
  #wbSyncPanel .err{color:#e05252;font-weight:600;}
  `;

  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  const WBSyncUI = {
    mount() {
      if (document.getElementById('wbSyncBtn')) return;
      const style = el('style'); style.textContent = CSS; document.head.appendChild(style);

      const btn = el('div', { id: 'wbSyncBtn', title: '云同步设置' },
        '<span class="dot" id="wbSyncDot"></span><span>云同步</span>');
      document.body.appendChild(btn);

      const mask = el('div', { id: 'wbSyncMask' });
      const panel = el('div', { id: 'wbSyncPanel' });
      const S = window.WBSync;
      const cfg = S.getConfig();

      panel.innerHTML = `
        <h3>☁️ 云同步设置</h3>
        <div class="sub">数据存放在你自己的 GitHub 仓库（<b>${cfg.owner}/${cfg.repo}</b>），手机与电脑自动串联。</div>

        <label>GitHub 用户名（owner）</label>
        <input id="wbOwner" value="${cfg.owner}" placeholder="xsj2026" />
        <label>仓库名（repo）</label>
        <input id="wbRepo" value="${cfg.repo}" placeholder="X" />
        <label>数据文件路径</label>
        <input id="wbPath" value="${cfg.path}" placeholder="data.json" />
        <label>分支</label>
        <input id="wbBranch" value="${cfg.branch}" placeholder="main" />
        <label>GitHub Token（仅存本机，用于上传）</label>
        <input id="wbToken" type="password" value="${S.getToken()}" placeholder="ghp_xxxxxxxx 或 github_pat_xxx" autocomplete="off" />

        <div class="row">
          <button class="primary" id="wbSave">保存并同步</button>
          <button id="wbPull">⬇ 拉取云端</button>
          <button id="wbPush">⬆ 上传本地</button>
        </div>
        <div class="row">
          <button id="wbClose">关闭</button>
          <button class="danger" id="wbClearLocal">清空本机数据</button>
        </div>

        <div class="status" id="wbStatus">正在读取状态…</div>
        <div class="hint">Token 怎么获取：GitHub → Settings → Developer settings → Personal access tokens，
          新建一个勾选 <b>repo</b> 权限（Fine-grained token 则给该仓库 Contents 读写权限）即可。Token 只保存在本机浏览器，不会上传到任何第三方。</div>
      `;

      document.body.appendChild(mask);
      document.body.appendChild(panel);

      const $ = id => document.getElementById(id);
      const open = () => { panel.classList.add('show'); mask.classList.add('show'); renderStatus(); };
      const close = () => { panel.classList.remove('show'); mask.classList.remove('show'); };

      btn.addEventListener('click', open);
      mask.addEventListener('click', close);
      $('wbClose').addEventListener('click', close);

      $('wbSave').addEventListener('click', async () => {
        S.saveConfig({
          owner: $('wbOwner').value.trim(),
          repo:  $('wbRepo').value.trim(),
          path:  $('wbPath').value.trim() || 'data.json',
          branch:$('wbBranch').value.trim() || 'main'
        }, $('wbToken').value);
        await S.syncNow();
        renderStatus();
      });
      $('wbPull').addEventListener('click', async () => { await S.pullNow(); renderStatus(); });
      $('wbPush').addEventListener('click', async () => { await S.pushNow(); renderStatus(); });
      $('wbClearLocal').addEventListener('click', () => {
        if (confirm('确认清空本机所有工作台数据？此操作不可恢复（云端数据不受影响）。')) {
          S.wipeLocal(); location.reload();
        }
      });

      function renderStatus() {
        const st = S.state;
        const dot = $('wbSyncDot');
        const box = $('wbStatus');
        let cls = '', text = '';
        if (st.syncing) { cls = 'busy'; text = '同步中…'; }
        else if (st.lastError) { cls = 'err'; text = '<span class="err">同步异常</span>'; }
        else if (st.online) { cls = 'on'; text = '<span class="ok">已连接</span>'; }
        else { cls = ''; text = '未配置 Token'; }
        if (dot) { dot.className = 'dot ' + cls; }

        const last = st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleTimeString() : '—';
        box.innerHTML = `
          状态：${text}<br>
          最近同步：${last}<br>
          ${st.lastError ? '错误：' + st.lastError + '<br>' : ''}
          云端文件：${st.cfg ? st.cfg.owner + '/' + st.cfg.repo + '/' + st.cfg.path : '—'}
        `;
      }

      S.onStateChange(renderStatus);
      renderStatus();
    }
  };

  window.WBSyncUI = WBSyncUI;
})();
