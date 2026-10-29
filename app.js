// ===== GoatCounter 匿名統計 =====
// 統計失敗（被廣告阻擋、沒網路）時不影響網站，所有呼叫都包在 try/catch 裡
// count.js 是 async 載入，可能比這裡晚到，所以每 0.5 秒檢查一次，最多等 10 秒
function track(name, title) {
  try {
    var send = function () {
      window.goatcounter.count({ path: name, title: title || name, event: true });
    };
    if (window.goatcounter && window.goatcounter.count) { send(); return; }
    var n = 0;
    var t = setInterval(function () {
      if (window.goatcounter && window.goatcounter.count) { clearInterval(t); send(); }
      else if (++n > 20) { clearInterval(t); }
    }, 500);
  } catch (e) {}
}
// 同一支手機只記一次
function trackOnce(name, key) {
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch (e) {}
  track(name);
}
// 同一次開啟只記一次
function trackSession(name) {
  try {
    if (sessionStorage.getItem('gc_' + name)) return;
    sessionStorage.setItem('gc_' + name, '1');
  } catch (e) {}
  track(name);
}

// 語音播放：play 不會冒泡，用 capture 監聽；事件名稱取音檔檔名，例如 play-station1_main
document.addEventListener('play', function (e) {
  try {
    var a = e.target;
    if (!a || a.tagName !== 'AUDIO') return;
    var src = (a.currentSrc || a.src || '').split('/').pop().replace(/\.mp3.*$/, '');
    if (src) trackSession('play-' + src);
  } catch (err) {}
}, true);

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
      return;
    }
    // 只記真的導向問卷頁的點擊，離線被擋下的不記
    track('survey-click');
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

  const INSTALLED_KEY = 'guanwu-installed';
  function getInstalledFlag() {
    try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch (e) { return false; }
  }
  function setInstalledFlag(value) {
    try {
      if (value) localStorage.setItem(INSTALLED_KEY, '1');
      else localStorage.removeItem(INSTALLED_KEY);
    } catch (e) {}
  }

  let cacheReady = false;
  let installed = isStandalone || getInstalledFlag();
  let deferredPrompt = null;

  // 已安裝且已下載完成：收起面板，只留一行狀態
  function refreshPanel() {
    // 只有從主畫面圖示開啟時才收起；在網頁上剛安裝完，要留著面板顯示「已送出安裝」的提示
    const compact = isStandalone && cacheReady;
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
      if (msg.type === 'cache-complete') {
        setCacheDone();
        // 每次開啟檢查快取也會收到 cache-complete，所以同一支手機只記一次
        trackOnce('cache-complete', 'gc_cache_done');
      }
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
    } else if (isInApp) {
      // LINE、Facebook 等 App 內瀏覽器的資料跟手機瀏覽器分開，自動下載會多存一份
      // 已經下載過的（有註冊紀錄）照常檢查；沒有的就請遊客改用瀏覽器
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          startDownload();
        } else {
          showInAppNotice();
        }
      });
    } else {
      startDownload();
    }
  }

  function showInAppNotice() {
    cacheText.innerHTML = '在 App 內開啟不會自動下載，請按上方按鈕改用瀏覽器開啟。<a href="#" id="cache-inapp">仍要在這裡下載</a>';
    document.getElementById('cache-inapp').addEventListener('click', e => {
      e.preventDefault();
      cacheText.textContent = '下載中…';
      startDownload();
    });
  }

  function startDownload() {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        if (reg.installing || reg.waiting) {
          cacheText.textContent = '下載中…';
        } else if (reg.active) {
          // 不直接當作完成：請背景程式確認檔案都在，缺的會補下載並回報進度
          cacheText.textContent = '檢查離線內容…';
          reg.active.postMessage({ type: 'check-cache' });
        }
        // 有新版本時會重新下載，進度由 message 更新
        reg.addEventListener('updatefound', () => {
          cacheReady = false;
          refreshPanel();
          // 第一次下載也會觸發 updatefound，只有原本已有舊版時才算「新版」
          cacheText.textContent = reg.active ? '發現新版內容，下載中…' : '下載中…';
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
    cacheBar.style.width = '0';
    cacheText.textContent = '下載中…';
    cleanupBtn.textContent = '刪除離線資料';
    cleanupText.textContent = '';
    startDownload();
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
        (installed ? '<br>手機上的「觀霧導覽」App，請長按圖示後選「解除安裝」。' : '');
    } catch (e) {
      cleanupText.innerHTML = '<span class="install-error">❌ 刪除失敗，請重新整理網頁再試一次。</span>';
    }
  });

  // --- ② 加入主畫面 ---
  // Android Chrome / Edge / Samsung 會發出 beforeinstallprompt，可直接跳出安裝視窗
  // 瀏覽器只有在「還沒安裝」時才會發出這個事件：代表圖示已被移除，恢復安裝按鈕
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installed && !isStandalone) {
      installed = false;
      setInstalledFlag(false);
      installBtn.hidden = false;
      installText.textContent = '';
    }
  });

  window.addEventListener('appinstalled', () => {
    track('app-installed');
    installed = true;
    setInstalledFlag(true);
    deferredPrompt = null;
    installBtn.hidden = true;
    installText.innerHTML = '<span class="install-done">✅ 已送出安裝！圖示約需 1～2 分鐘才會出現在主畫面，請稍候。</span><br>若一直沒看到，請到手機的 App 清單找「觀霧導覽」。';
    refreshPanel();
  });

  if (isStandalone) {
    trackSession('open-from-homescreen');
    setInstalledFlag(true);
    installBtn.hidden = true;
    installText.innerHTML = '<span class="install-done">✅ 已安裝到主畫面</span>';
  } else if (installed && !isInApp) {
    // 網頁版重新整理後，瀏覽器不會告訴網頁「已安裝」，改用之前記下的紀錄
    // 紀錄可能過時（安裝沒完成、App 已解除安裝），所以保留「重新安裝」的入口
    installBtn.hidden = true;
    installText.innerHTML = '<span class="install-done">✅ 已安裝到主畫面，請從桌面「觀霧導覽」圖示開啟。</span><br><a href="#" id="install-again">沒看到圖示？重新安裝</a>';
    document.getElementById('install-again').addEventListener('click', e => {
      e.preventDefault();
      installed = false;
      setInstalledFlag(false);
      installBtn.hidden = false;
      installText.textContent = '';
      handleInstallClick();
    });
  } else if (isInApp) {
    installBtn.textContent = '改用瀏覽器開啟';
    installText.textContent = '在 LINE、Facebook 等 App 裡無法安裝，請先改用手機瀏覽器開啟這個網頁。';
  }

  installBtn.addEventListener('click', () => {
    track('install-click');
    handleInstallClick();
  });

  async function handleInstallClick() {
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
          <li>開啟後，再按一次「安裝到手機桌面」</li>
        </ol>
      `);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        // appinstalled 可能比這裡先發生，已顯示「已送出安裝」就不要覆蓋
        if (!installed) installText.textContent = '安裝中，圖示約 1～2 分鐘後會出現在主畫面…';
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
        <p>完成後，手機桌面會出現「觀霧導覽」圖示。已經加入過的話，直接從桌面圖示開啟即可。</p>
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
  }

  refreshPanel();
}