// sw.js
const CACHE_NAME = 'guanwu-guide-v1';
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

// 安裝時，把上述檔案全部塞進手機快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 當遊客手機斷網時，攔截請求並從快取裡拿檔案給他們
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取有資料就給快取，沒有就嘗試連網抓
        return response || fetch(event.request);
      })
  );
});