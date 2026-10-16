// sw.js
const CACHE_NAME = 'guanwu-guide-v2';
const urlsToCache = [
  './',
  './index.html',
  './data.js',
  './app.js',
  './manifest.json',
  
// 圖片檔 (根據 image_6ec5a5.png)
  './images/poster.webp',
  './images/station1.webp',
  './images/station2.webp',
  './images/station3.webp',
  './images/station4.webp',
  './images/station5.webp',

  // 站點主語音檔 (根據 image_6ec2dc.png)
  './audio/intro_main.mp3',
  './audio/station1_main.mp3',
  './audio/station2_main.mp3',
  './audio/station3_main.mp3',
  './audio/station4_main.mp3',
  './audio/station5_main.mp3',

  // 職人故事語音檔 (根據 image_6ec2dc.png)
  './audio/story_ajin.mp3',
  './audio/story_atian.mp3',
  './audio/story_chen.mp3',
  './audio/story_feng.mp3',
  './audio/story_su.mp3',
  './audio/story_weng.mp3'
];

// 1. 安裝階段：強制將 urlsToCache 裡的所有檔案一次性下載到手機裡
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('開始強制預先下載所有離線檔案...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 強制立刻接管網頁，不需等待重整
  );
});

// 2. 啟用階段：清除舊版快取，避免佔用手機空間
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. 攔截請求階段：加入音檔 Range 請求的破解處理
self.addEventListener('fetch', event => {
  const request = event.request;

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
            const bytes = request.headers.get('range').match(/^bytes\=(\d+)\-(\d*)$/);
            const pos = Number(bytes[1]);
            const end = bytes[2] ? Number(bytes[2]) : arrayBuffer.byteLength - 1;
            const chunk = arrayBuffer.slice(pos, end + 1);

            // 回傳 206 Partial Content 狀態，完美欺騙瀏覽器播放器
            return new Response(chunk, {
              status: 206,
              statusText: 'Partial Content',
              headers: new Headers({
                'Content-Range': `bytes ${pos}-${end}/${arrayBuffer.byteLength}`,
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

  // 一般檔案 (HTML, CSS, JS, 圖片) 的正常 Cache-First 策略
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});