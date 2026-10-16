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

// 3. 攔截請求階段 (Cache-First 策略)：播放聲音時，優先從快取拿檔案
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取裡面有這個檔案，直接秒速回傳（這就是斷網能播的關鍵）
        if (response) {
          return response;
        }
        // 如果快取真的沒有，才去網路上抓
        return fetch(event.request);
      })
  );
});