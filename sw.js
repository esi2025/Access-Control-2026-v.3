
const CACHE_NAME = 'access-analyst-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './index.css'
];

// مرحله نصب: کش کردن فایل‌های اصلی
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// مرحله فعال‌سازی: حذف کش‌های قدیمی‌تر
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// مدیریت هوشمند درخواست‌ها: بررسی کش پویا و ایستا با استراتژی Cache-First
self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET از همین مبدا را کنترل می‌کنیم
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // کش کردن پویا برای بقیه فایل‌های باندل شده توسط بیلد ابزار
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('Fetch failed, offline fallback maybe available:', err);
      });
    })
  );
});
