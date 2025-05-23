/**
 * Service Worker for AI Chat Interface
 * 支持缓存策略、离线功能、后台同步
 */

const CACHE_NAME = 'ai-chat-interface-v1.0.0';
const CACHE_VERSION = '1.0.0';

// 缓存资源列表
const STATIC_CACHE_URLS = [
  '/',
  '/chat',
  '/cad-analyzer',
  '/admin/dashboard',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/globals.css',
];

// API缓存策略
const API_CACHE_CONFIG = {
  '/api/health': { ttl: 60000, strategy: 'networkFirst' },
  '/api/ag-ui/performance': { ttl: 300000, strategy: 'staleWhileRevalidate' },
  '/api/fastgpt/init-chat': { ttl: 900000, strategy: 'cacheFirst' },
};

// 缓存策略枚举
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cacheFirst',
  NETWORK_FIRST: 'networkFirst',
  STALE_WHILE_REVALIDATE: 'staleWhileRevalidate',
  NETWORK_ONLY: 'networkOnly',
  CACHE_ONLY: 'cacheOnly'
};

// Service Worker安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] 安装完成，跳过等待');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] 安装失败:', error);
      })
  );
});

// Service Worker激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker 激活中...');
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim()
    ])
  );
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 根据请求类型选择缓存策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request));
  } else {
    event.respondWith(handleOtherRequests(request));
  }
});

// API请求处理
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const config = API_CACHE_CONFIG[url.pathname] || { 
    strategy: CACHE_STRATEGIES.NETWORK_FIRST, 
    ttl: 300000 
  };
  
  try {
    switch (config.strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request, config.ttl);
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request, config.ttl);
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request, config.ttl);
      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await fetch(request);
      case CACHE_STRATEGIES.CACHE_ONLY:
        return await caches.match(request);
      default:
        return await networkFirst(request, config.ttl);
    }
  } catch (error) {
    console.error('[SW] API请求处理失败:', error);
    
    // 返回离线页面或错误响应
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'offline',
        timestamp: Date.now(),
        message: '当前处于离线状态'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('网络错误', { status: 503 });
  }
}

// 静态资源处理 (Cache First)
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] 静态资源加载失败:', error);
    throw error;
  }
}

// 页面请求处理 (Network First with offline fallback)
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 缓存成功的页面响应
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] 网络请求失败，尝试缓存:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线页面
    return await caches.match('/') || new Response('离线状态', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// 其他请求处理
async function handleOtherRequests(request) {
  return await staleWhileRevalidate(request, 86400000); // 24小时TTL
}

// 缓存优先策略
async function cacheFirst(request, ttl = 86400000) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // 检查缓存是否过期
    const cachedTime = cachedResponse.headers.get('sw-cached-time');
    if (cachedTime && (Date.now() - parseInt(cachedTime)) < ttl) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cached-time', Date.now().toString());
      cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 网络优先策略
async function networkFirst(request, ttl = 300000) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cached-time', Date.now().toString());
      cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedTime = cachedResponse.headers.get('sw-cached-time');
      if (!cachedTime || (Date.now() - parseInt(cachedTime)) < ttl * 2) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// 陈旧内容重新验证策略
async function staleWhileRevalidate(request, ttl = 600000) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // 后台更新缓存
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cached-time', Date.now().toString());
      cache.put(request, responseClone);
    }
    return networkResponse;
  }).catch(() => {
    // 网络请求失败，忽略错误
  });
  
  // 如果有缓存，立即返回缓存
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 如果没有缓存，等待网络请求
  return await networkPromise;
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[SW] 后台同步事件:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  try {
    // 同步待发送的聊天消息
    await syncPendingMessages();
    
    // 清理过期缓存
    await cleanupExpiredCache();
    
    console.log('[SW] 后台同步完成');
  } catch (error) {
    console.error('[SW] 后台同步失败:', error);
  }
}

// 同步待发送消息
async function syncPendingMessages() {
  // 这里可以实现消息队列同步逻辑
  console.log('[SW] 同步待发送消息');
}

// 清理过期缓存
async function cleanupExpiredCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  const now = Date.now();
  const cleanupPromises = requests.map(async (request) => {
    const response = await cache.match(request);
    const cachedTime = response?.headers.get('sw-cached-time');
    
    if (cachedTime && (now - parseInt(cachedTime)) > 86400000) { // 24小时
      await cache.delete(request);
      console.log('[SW] 清理过期缓存:', request.url);
    }
  });
  
  await Promise.all(cleanupPromises);
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('[SW] 收到推送通知:', event);
  
  const options = {
    body: event.data ? event.data.text() : '您有新的AI对话消息',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看消息',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/images/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AI聊天界面', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 通知点击:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/chat')
    );
  } else if (event.action === 'close') {
    // 关闭通知，不执行其他操作
  } else {
    // 默认操作：打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 未处理的Promise拒绝:', event.reason);
});

console.log(`[SW] Service Worker ${CACHE_VERSION} 已加载`); 