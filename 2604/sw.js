const CACHE_NAME = 'sg-travel-v5';
const BASE_PATH = '';
const ASSETS_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
  `${BASE_PATH}/icons/apple-touch-icon.png`
];

// Install: 새 캐시 만들고 즉시 활성화
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🌴 캐시 저장 중...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // 즉시 활성화!
  );
});

// Activate: 이전 캐시 모두 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 즉시 모든 클라이언트 제어
  );
});

// Fetch: 네트워크 우선, 캐시 폴백 (항상 최신 버전 제공)
self.addEventListener('fetch', (event) => {
  // Firebase API 요청은 캐싱하지 않음
  if (event.request.url.includes('firebasedatabase.app') ||
      event.request.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 성공하면 캐시 업데이트
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 제공 (오프라인 지원)
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // HTML 요청이면 index.html 반환
            if (event.request.destination === 'document') {
              return caches.match(`${BASE_PATH}/index.html`);
            }
          });
      })
  );
});
