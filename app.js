document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');

  guideData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // 第一張卡片（出發點）預設為展開狀態
    if (index === 0) card.classList.add('active');
    
    // --- 卡片標題區 (可點擊收合) ---
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <h2>${item.title}</h2>
      <span class="toggle-icon">▼</span>
    `;
    
    // 點擊事件：打開這張卡片，並關閉其他卡片
    header.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      
      // 先把所有卡片關閉
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      
      // 如果原本沒打開，就打開它並自動捲動到畫面頂端
      if (!isActive) {
        card.classList.add('active');
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    });

    // --- 卡片內容區 (預設隱藏) ---
    const body = document.createElement('div');
    body.className = 'card-body';
    
    if (item.type === 'intro') {
      body.innerHTML = `
        <audio controls class="main-audio" preload="none" src="${item.audioSrc}"></audio>
        <div style="font-size: 15px; margin-top: 10px;">${item.content}</div>
      `;
    } else {
      let html = '';
      
      // 1. 主語音播放器挪到最上方
      if (item.mainAudioSrc) {
        html += `
          <audio controls class="main-audio" preload="none">
            <source src="${item.mainAudioSrc}" type="audio/mpeg">
          </audio>
        `;
      }
      
      if (item.image) {
        html += `<img src="${item.image}" alt="${item.title} 實景對照圖" class="station-img">`;
      }
      
      if (item.meta) html += `<div class="meta-info">${item.meta}</div>`;
      if (item.question) html += `<div class="question-box">💡 這站的問題：<br>${item.question}</div>`;
      
      if (item.observation) html += `<div class="section-title">👣 現場找找看</div><p>${item.observation}</p>`;
      if (item.history) html += `<div class="section-title">${item.historyTitle || '🪚 這裡發生過什麼'}</div><p>${item.history}</p>`;
      if (item.extraSection) html += `<div class="section-title">${item.extraSection.title}</div><p>${item.extraSection.content}</p>`;
      
      // 2. 獨立職人故事區塊與各自的語音播放器
      if (item.stories && item.stories.length > 0) {
        html += `<div class="section-title">📖 職人故事</div>`;
        item.stories.forEach(story => {
          html += `
            <div class="story-item">
              <strong>${story.name}</strong>
              <p>${story.desc}</p>
              ${story.audioSrc ? `<audio controls class="story-audio" preload="none" src="${story.audioSrc}"></audio>` : ''}
            </div>
          `;
        });
      }
      
      if (item.collapsibles && item.collapsibles.length > 0) {
        item.collapsibles.forEach(col => {
          html += `
            <details>
              <summary>▸ 點開閱讀｜${col.title}</summary>
              <div class="details-content">${col.content}</div>
            </details>
          `;
        });
      }
      body.innerHTML = html;
    }
    
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });

  // --- 問卷區塊 (放在所有卡片之後，不收合) ---
  const survey = document.createElement('div');
  survey.className = 'survey-box';
  survey.innerHTML = `
    <div class="survey-title">${surveyData.title}</div>
    <p>${surveyData.content}</p>
    <a class="survey-btn" href="${surveyData.url}" target="_blank" rel="noopener">${surveyData.buttonText}</a>
    <div class="survey-note">${surveyData.note}</div>
  `;

  // 沒有網路時不開啟連結，改跳提示
  survey.querySelector('.survey-btn').addEventListener('click', (e) => {
    if (!navigator.onLine) {
      e.preventDefault();
      alert(surveyData.offlineMessage);
    }
  });
  container.appendChild(survey);

  setupInstall();
});

// ===== 安裝到主畫面 + 離線下載進度 =====
function setupInstall() {
  const panel = document.getElementById('install-panel');
  const statusLine = document.getElementById('status-line');
  const cacheText = document.getElementById('cache-text');
  const cacheBar = document.getElementById('cache-bar');
  const installBtn = document.getElementById('install-btn');
  const installText = document.getElementById('install-text');
  const guide = document.getElementById('install-guide');
  const guideContent = document.getElementById('guide-content');
  const cleanupBtn = document.getElementById('cleanup-btn');
  const cleanupText = document.getElementById('cleanup-text');
  const REMOVED_KEY = 'guanwu-offline-removed';

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isLine = /\bLine\//i.test(ua);
  const isInApp = isLine || /FBAN|FBAV|Instagram|MicroMessenger/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  let cacheReady = false;
  let installed = isStandalone;
  let deferredPrompt = null;

  // 已安裝且已下載完成：收起面板，只留一行狀態
  function refreshPanel() {
    const compact = installed && cacheReady;
    panel.hidden = compact;
    statusLine.hidden = !compact;
  }

  function showGuide(html) {
    guideContent.innerHTML = html;
    guide.hidden = false;
  }
  document.getElementById('guide-close').addEventListener('click', () => { guide.hidden = true; });

  // --- ① 離線下載進度 ---
  function setProgress(done, total) {
    const percent = Math.round(done / total * 100);
    cacheBar.style.width = percent + '%';
    cacheText.textContent = `下載中 ${percent}%（${done} / ${total} 個檔案）`;
  }
  function setCacheDone() {
    cacheReady = true;
    cacheBar.style.width = '100%';
    cacheText.innerHTML = '<span class="install-done">✅ 下載完成，斷網也能使用</span>';
    refreshPanel();
  }
  function setCacheError(message) {
    cacheText.innerHTML = `<span class="install-error">❌ ${message}</span>`;
  }

  if (!('serviceWorker' in navigator)) {
    setCacheError(isInApp ? '這個 App 內的瀏覽器無法離線下載，請改用 Chrome 或 Safari 開啟' : '這個瀏覽器不支援離線下載，請改用 Chrome 或 Safari 開啟');
  } else {
    navigator.serviceWorker.addEventListener('message', event => {
      const msg = event.data || {};
      if (msg.type === 'cache-progress') setProgress(msg.done, msg.total);
      if (msg.type === 'cache-complete') setCacheDone();
      if (msg.type === 'cache-error') {
        setCacheError('下載中斷，請確認網路後點「重新下載」');
        cacheText.insertAdjacentHTML('beforeend', ' <a href="#" id="cache-retry">重新下載</a>');
        document.getElementById('cache-retry').addEventListener('click', e => { e.preventDefault(); location.reload(); });
      }
    });
    navigator.serviceWorker.startMessages();

    if (isOfflineRemoved()) {
      // 遊客按過「刪除離線資料」：不自動下載，等他按「重新下載」
      showRemoved();
    } else {
      startDownload();
    }
  }

  function startDownload() {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        if (reg.installing || reg.waiting) {
          cacheText.textContent = '下載中…';
        } else if (reg.active) {
          setCacheDone();
        }
        // 有新版本時會重新下載，進度由 message 更新
        reg.addEventListener('updatefound', () => {
          cacheReady = false;
          refreshPanel();
          cacheText.textContent = '發現新版內容，下載中…';
        });
      })
      .catch(() => {
        setCacheError(navigator.onLine ? '離線下載失敗，請重新整理網頁再試一次' : '目前沒有網路，請到有訊號的地方再開啟網頁');
      });
  }

  // --- 刪除離線資料（頁面最下方） ---
  // 用 localStorage 記住「已刪除」，避免下次開啟網頁又自動下載
  function isOfflineRemoved() {
    try { return localStorage.getItem(REMOVED_KEY) === '1'; } catch (e) { return false; }
  }
  function setOfflineRemoved(removed) {
    try {
      if (removed) localStorage.setItem(REMOVED_KEY, '1');
      else localStorage.removeItem(REMOVED_KEY);
    } catch (e) {}
  }

  function redownload() {
    setOfflineRemoved(false);
    location.reload(); // 重新開啟網頁時會自動開始下載
  }

  function showRemoved() {
    cacheReady = false;
    cacheBar.style.width = '0';
    cacheText.innerHTML = '已刪除離線資料　<a href="#" id="cache-redownload">重新下載</a>';
    document.getElementById('cache-redownload').addEventListener('click', e => { e.preventDefault(); redownload(); });
    cleanupBtn.textContent = '重新下載離線資料';
    cleanupText.textContent = '目前沒有存離線資料，需要網路才能使用。';
    refreshPanel();
  }

  cleanupBtn.addEventListener('click', async () => {
    if (isOfflineRemoved()) {
      redownload();
      return;
    }
    if (!confirm('確定要刪除存在手機裡的離線資料（約 30MB）嗎？\n刪除後，沒有網路時就無法使用導覽。')) return;
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      setOfflineRemoved(true);
      showRemoved();
      cleanupText.innerHTML = '<span class="install-done">✅ 已刪除離線資料。</span>' +
        (installed ? '<br>主畫面的「觀霧導覽」圖示，請長按後選「移除」。' : '');
    } catch (e) {
      cleanupText.innerHTML = '<span class="install-error">❌ 刪除失敗，請重新整理網頁再試一次。</span>';
    }
  });

  // --- ② 加入主畫面 ---
  // Android Chrome / Edge / Samsung 會發出 beforeinstallprompt，可直接跳出安裝視窗
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    installBtn.hidden = true;
    installText.innerHTML = '<span class="install-done">✅ 安裝完成！手機桌面上會出現「觀霧導覽」圖示，之後點圖示就能開啟。</span>';
    refreshPanel();
  });

  if (isStandalone) {
    installBtn.hidden = true;
    installText.innerHTML = '<span class="install-done">✅ 已安裝到主畫面</span>';
  } else if (isInApp) {
    installBtn.textContent = '改用瀏覽器開啟';
    installText.textContent = '在 LINE、Facebook 等 App 裡無法安裝，請先改用手機瀏覽器開啟這個網頁。';
  }

  installBtn.addEventListener('click', async () => {
    // LINE 支援用網址參數直接跳到外部瀏覽器
    if (isLine) {
      const url = new URL(location.href);
      url.searchParams.set('openExternalBrowser', '1');
      location.href = url.toString();
      return;
    }
    if (isInApp) {
      showGuide(`
        <h3>改用瀏覽器開啟</h3>
        <ol>
          <li>點畫面右上角（或右下角）的「⋯」選單</li>
          <li>選「在瀏覽器中開啟」或「以外部瀏覽器開啟」</li>
          <li>開啟後，再按一次「安裝」</li>
        </ol>
      `);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        installText.textContent = '安裝中，請稍候…';
      } else {
        installText.textContent = '已取消安裝。想安裝時，再按一次按鈕即可。';
      }
      return;
    }
    if (isIOS) {
      showGuide(`
        <h3>加入 iPhone 主畫面</h3>
        <ol>
          <li>用 <strong>Safari</strong> 開啟這個網頁</li>
          <li>點畫面下方（或網址列旁）的「分享」按鈕 <strong>⬆️</strong></li>
          <li>往下滑，選「<strong>加入主畫面</strong>」</li>
          <li>點右上角「<strong>新增</strong>」</li>
        </ol>
        <p>完成後，手機桌面會出現「觀霧導覽」圖示。</p>
      `);
      return;
    }
    // 沒有跳出安裝提示的 Android 手機：改用瀏覽器選單手動安裝
    showGuide(`
      <h3>加入手機主畫面</h3>
      <ol>
        <li><strong>Chrome：</strong>點右上角「<strong>⋮</strong>」，選「<strong>安裝應用程式</strong>」或「<strong>加入主畫面</strong>」</li>
        <li><strong>Samsung 網際網路：</strong>點下方「<strong>≡</strong>」，選「<strong>新增頁面至</strong>」→「<strong>主畫面</strong>」</li>
        <li>確認安裝後，手機桌面會出現「觀霧導覽」圖示</li>
      </ol>
      <p>找不到選項的話，請改用 Chrome 開啟這個網頁。</p>
    `);
  });

  refreshPanel();
}