// ============================================================
//  X · Service Worker (PWA 离线支持)
//  版本: 3.0 | 更新: 2026-07-29
// ============================================================

const CACHE_NAME = 'x-workbench-v3';
const RUNTIME_CACHE = 'x-runtime-v3';

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './cover.html',
  './qr.html',
  './style.css',
  './script.js',
  './manifest.json',
  './xsj-logo.ico',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.ico',
  // 第三方资源
  'https://cdn.jsdelivr.net/npm/qrcodejs2@0.0.2/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// ==================== 安装 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 缓存静态资源...');
        // 逐个添加，失败的跳过不影响整体
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] 缓存失败: ${url}`, err.message)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ==================== 激活 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[SW] 清理旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== 请求拦截 ====================
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 chrome-extension://
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // 策略: 优先网络，失败回退缓存
  event.respondWith(
    networkFirst(event.request)
  );
});

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应（仅同源资源）
    if (networkResponse && networkResponse.status === 200) {
      const url = new URL(request.url);
      if (url.origin === self.location.origin) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] 网络不可用，从缓存加载:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // HTML 页面离线回退
    if (request.destination === 'document' || request.mode === 'navigate') {
      const offlinePage = await caches.match('./cover.html');
      if (offlinePage) return offlinePage;
    }
    
    return new Response('离线状态，请连接网络后重试', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// ==================== 消息处理 ====================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 通知前端更新可用
  if (event.data === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

// ==================== 推送通知（未来扩展） ====================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '工作台有新的更新',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: 'xsj-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'X 工作台',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});
