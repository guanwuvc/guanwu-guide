// sw.js
// ⚠️ 每次修改任何檔案（文字、圖片、音檔）後，都要把版本號 +1，手機才會下載新版
const CACHE_NAME = 'guanwu-guide-v13';
const urlsToCache = [
  './',
  './index.html',
  './data.js',
  './app.js',
  './manifest.json',

  // 圖片檔
  './images/poster.webp',
  './images/station1.webp',
  './images/station2.webp',
  './images/station3.webp',
  './images/station4.webp',
  './images/station5.webp',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/apple-touch-icon.png',

  // 站點主語音檔
  './audio/intro_main.mp3',
  './audio/station1_main.mp3',
  './audio/station2_main.mp3',
  './audio/station3_main.mp3',
  './audio/station4_main.mp3',
  './audio/station5_main.mp3',

  // 職人故事語音檔
  './audio/story_ajin.mp3',
  './audio/story_atian.mp3',
  './audio/story_chen.mp3',
  './audio/story_feng.mp3',
  './audio/story_su.mp3',
  './audio/story_weng.mp3'
];

// 把下載進度通知所有開著的網頁（包含還沒被接管的第一次造訪）
async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

// 下載單一檔案，失敗時自動重試一次；cache: 'reload' 確保拿到伺服器上的最新版
async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) return response;
    } catch (err) {
      // 網路錯誤，進入下一次重試
    }
  }
  throw new Error('下載失敗：' + url);
}

// 逐一下載檔案並回報進度；urls 為要下載的檔案，已存在的檔案數算進 done 起始值
async function downloadFiles(urls) {
  const cache = await caches.open(CACHE_NAME);
  const total = urlsToCache.length;
  let done = total - urls.length;
  broadcast({ type: 'cache-progress', done, total });
  try {
    for (const url of urls) {
      await cache.put(url, await fetchWithRetry(url));
      done++;
      broadcast({ type: 'cache-progress', done, total });
    }
  } catch (err) {
    broadcast({ type: 'cache-error', done, total });
    throw err;
  }
  broadcast({ type: 'cache-complete', total });
}

// 1. 安裝階段：逐一下載所有檔案到手機裡，並回報進度
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      await downloadFiles(urlsToCache);
    } catch (err) {
      await caches.delete(CACHE_NAME);
      throw err; // 讓安裝失敗，下次開啟網頁會重新下載
    }
    await self.skipWaiting(); // 立刻接管網頁，不需等待重整
  })());
});

// 網頁要求檢查時，確認檔案都還在；缺少的（例如被刪除或被系統清掉）就補下載
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'check-cache') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const missing = [];
    for (const url of urlsToCache) {
      if (!(await cache.match(url))) missing.push(url);
    }
    if (missing.length === 0) {
      broadcast({ type: 'cache-complete', total: urlsToCache.length });
    } else {
      await downloadFiles(missing).catch(() => {});
    }
  })());
});

// 2. 啟用階段：清除舊版快取，避免佔用手機空間
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

// 3. 攔截請求階段：加入音檔 Range 請求的處理
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // 如果是帶有 Range 的請求 (通常是 audio 或 video 標籤發出的)
  if (request.headers.has('range')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request.url).then(cachedResponse => {
          if (!cachedResponse) {
            return fetch(request);
          }
          // 將快取檔案轉為 ArrayBuffer 來進行手動分段切割
          return cachedResponse.arrayBuffer().then(arrayBuffer => {
            const size = arrayBuffer.byteLength;
            const bytes = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range'));
            let pos = 0;
            let end = size - 1;
            if (bytes && bytes[1]) {
              pos = Number(bytes[1]);
              if (bytes[2]) end = Math.min(Number(bytes[2]), size - 1);
            } else if (bytes && bytes[2]) {
              // 「bytes=-500」：取最後 500 bytes
              pos = Math.max(size - Number(bytes[2]), 0);
            }
            const chunk = arrayBuffer.slice(pos, end + 1);

            // 回傳 206 Partial Content，讓播放器可以拖曳進度
            return new Response(chunk, {
              status: 206,
              statusText: 'Partial Content',
              headers: new Headers({
                'Content-Range': `bytes ${pos}-${end}/${size}`,
                'Content-Length': chunk.byteLength,
                'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
                'Accept-Ranges': 'bytes'
              })
            });
          });
        });
      })
    );
    return;
  }

  // 開啟頁面（網址可能帶有 ?fbclid= 等參數）時，一律用快取的首頁
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(response => response || fetch(request))
    );
    return;
  }

  // 一般檔案 (JS、圖片) 的 Cache-First 策略
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
