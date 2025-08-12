import { useCallback,useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';

// 移动设备类型定义
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// 触控手势类型
export type GestureType = 'tap' | 'swipe' | 'pinch' | 'rotate' | 'longpress';

// 手势回调类型
export type GestureHandler = (event: TouchEvent | MouseEvent, gestureData: any) => void;

// 离线状态
export interface OfflineState {
  isOnline: boolean;
  wasOnline: boolean;
  lastOnlineAt: number | null;
  reconnecting: boolean;
}

// 移动优化配置
export interface MobileOptimizationConfig {
  enableTouchGestures: boolean;
  optimizeImagesForMobile: boolean;
  reducedMotion: boolean;
  enableOfflineSupport: boolean;
  enablePullToRefresh: boolean;
  useBottomNavigation: boolean;
  adaptFontSize: boolean;
  adaptLayoutForKeyboard: boolean;
}

// 默认配置
const DEFAULT_CONFIG: MobileOptimizationConfig = {
  enableTouchGestures: true,
  optimizeImagesForMobile: true,
  reducedMotion: false,
  enableOfflineSupport: true,
  enablePullToRefresh: false, // 默认关闭，避免与页面滚动冲突
  useBottomNavigation: true,
  adaptFontSize: true,
  adaptLayoutForKeyboard: true
};

/**
 * 移动端优化钩子
 * 提供移动设备检测、触控优化、离线支持等功能
 */
export function useMobileOptimization(config: Partial<MobileOptimizationConfig> = {}) {
  // 合并配置
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 使用 react-responsive 检测设备类型
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  
  // 设备类型状态
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  
  // 屏幕方向状态
  const [isPortrait, setIsPortrait] = useState(true);
  
  // 离线状态
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null,
    reconnecting: false
  });
  
  // 键盘状态
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // 注册的手势处理器
  const [gestureHandlers] = useState<Map<string, Map<GestureType, GestureHandler>>>(new Map());
  
  // 检测设备类型
  useEffect(() => {
    if (isMobile) {
      setDeviceType('mobile');
    } else if (isTablet) {
      setDeviceType('tablet');
    } else if (isDesktop) {
      setDeviceType('desktop');
    }
  }, [isMobile, isTablet, isDesktop]);
  
  // 检测屏幕方向
  useEffect(() => {
    const handleOrientationChange = () => {
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };
    
    // 初始化方向
    handleOrientationChange();
    
    // 监听方向变化
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleOrientationChange);
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleOrientationChange);
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, []);
  
  // 监听在线状态
  useEffect(() => {
    if (!mergedConfig.enableOfflineSupport || typeof window === 'undefined') {
      return;
    }
    
    const handleOnline = () => {
      setOfflineState(prev => ({
        isOnline: true,
        wasOnline: prev.isOnline,
        lastOnlineAt: Date.now(),
        reconnecting: false
      }));
    };
    
    const handleOffline = () => {
      setOfflineState(prev => ({
        isOnline: false,
        wasOnline: prev.isOnline,
        lastOnlineAt: prev.lastOnlineAt,
        reconnecting: false
      }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mergedConfig.enableOfflineSupport]);
  
  // 监听键盘显示（仅在移动设备上）
  useEffect(() => {
    if (!mergedConfig.adaptLayoutForKeyboard || deviceType === 'desktop' || typeof window === 'undefined') {
      return;
    }
    
    const handleFocus = () => {
      // 移动设备输入框获得焦点时，假定键盘弹出
      if (deviceType !== ('desktop' as DeviceType)) {
        setIsKeyboardVisible(true);
      }
    };
    
    const handleBlur = () => {
      setIsKeyboardVisible(false);
    };
    
    // 监听输入元素的焦点事件
    const inputElements = document.querySelectorAll('input, textarea');
    inputElements.forEach(el => {
      el.addEventListener('focus', handleFocus);
      el.addEventListener('blur', handleBlur);
    });
    
    // 监听窗口大小变化（iOS上键盘弹出会触发resize）
    const handleResize = () => {
      if (deviceType !== ('desktop' as DeviceType)) {
        // 如果窗口高度变小，可能是键盘弹出
        const currentHeight = window.innerHeight;
        const isKeyboardOpen = currentHeight < window.outerHeight * 0.8;
        setIsKeyboardVisible(isKeyboardOpen);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      inputElements.forEach(el => {
        el.removeEventListener('focus', handleFocus);
        el.removeEventListener('blur', handleBlur);
      });
      window.removeEventListener('resize', handleResize);
    };
  }, [deviceType, mergedConfig.adaptLayoutForKeyboard]);
  
  // 注册手势处理器
  const registerGestureHandler = useCallback((elementId: string, gestureType: GestureType, handler: GestureHandler) => {
    if (!mergedConfig.enableTouchGestures) {
      return () => {};
    }
    
    // 获取或创建元素的处理器映射
    let elementHandlers = gestureHandlers.get(elementId);
    if (!elementHandlers) {
      elementHandlers = new Map();
      gestureHandlers.set(elementId, elementHandlers);
    }
    
    // 保存处理器
    elementHandlers.set(gestureType, handler);
    
    // 获取元素
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID ${elementId} not found for gesture registration`);
      return () => {};
    }
    
    // 跟踪触摸状态
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let longPressTimer: NodeJS.Timeout | null = null;
    
    // 处理触摸开始
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        
        // 设置长按定时器
        if (elementHandlers?.has('longpress')) {
          longPressTimer = setTimeout(() => {
            const handler = elementHandlers?.get('longpress');
            if (handler) {
              handler(e, { x: touchStartX, y: touchStartY, duration: 500 });
            }
            longPressTimer = null;
          }, 500);
        }
      }
    };
    
    // 处理触摸移动
    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimer) {
        // 如果移动超过阈值，取消长按
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };
    
    // 处理触摸结束
    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - touchStartTime;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 检测轻触
      if (distance < 10 && touchDuration < 300) {
        const tapHandler = elementHandlers?.get('tap');
        if (tapHandler) {
          tapHandler(e, { x: touchEndX, y: touchEndY, duration: touchDuration });
        }
        return;
      }
      
      // 检测滑动
      if (distance > 30) {
        const swipeHandler = elementHandlers?.get('swipe');
        if (swipeHandler) {
          // 确定滑动方向
          let direction = '';
          const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
          
          if (angle > -45 && angle <= 45) {
            direction = 'right';
          } else if (angle > 45 && angle <= 135) {
            direction = 'down';
          } else if (angle > 135 || angle <= -135) {
            direction = 'left';
          } else {
            direction = 'up';
          }
          
          swipeHandler(e, { 
            direction, 
            distance, 
            deltaX, 
            deltaY, 
            velocity: distance / touchDuration 
          });
        }
      }
    };
    
    // 添加事件监听器
    element.addEventListener('touchstart', handleTouchStart as EventListener);
    element.addEventListener('touchmove', handleTouchMove as EventListener);
    element.addEventListener('touchend', handleTouchEnd as EventListener);
    
    // 返回清理函数
    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchmove', handleTouchMove as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
      
      // 移除手势处理器
      const handlers = gestureHandlers.get(elementId);
      if (handlers) {
        handlers.delete(gestureType);
        if (handlers.size === 0) {
          gestureHandlers.delete(elementId);
        }
      }
    };
  }, [gestureHandlers, mergedConfig.enableTouchGestures]);
  
  // 图片优化函数
  const optimizeImageUrl = useCallback((originalUrl: string, width?: number, quality?: number): string => {
    if (!mergedConfig.optimizeImagesForMobile || deviceType === 'desktop') {
      return originalUrl;
    }
    
    try {
      const url = new URL(originalUrl, window.location.origin);
      
      // 如果已经是优化过的URL，直接返回
      if (url.searchParams.has('w') || url.searchParams.has('q')) {
        return originalUrl;
      }
      
      // 根据设备类型设置默认宽度
      const defaultWidth = deviceType === 'mobile' ? 640 : deviceType === 'tablet' ? 1024 : 1920;
      const targetWidth = width || defaultWidth;
      const targetQuality = quality || 80;
      
      // 添加优化参数
      url.searchParams.set('w', targetWidth.toString());
      url.searchParams.set('q', targetQuality.toString());
      
      return url.toString();
    } catch (e) {
      // 如果URL解析失败，返回原始URL
      return originalUrl;
    }
  }, [deviceType, mergedConfig.optimizeImagesForMobile]);
  
  // 尝试重新连接
  const attemptReconnect = useCallback(() => {
    if (offlineState.isOnline || offlineState.reconnecting) {
      return Promise.resolve(offlineState.isOnline);
    }
    
    setOfflineState(prev => ({ ...prev, reconnecting: true }));
    
    return new Promise<boolean>((resolve) => {
      // 检查网络连接
      fetch('/api/health', { method: 'HEAD' })
        .then(() => {
          // 连接成功
          setOfflineState({
            isOnline: true,
            wasOnline: false,
            lastOnlineAt: Date.now(),
            reconnecting: false
          });
          resolve(true);
        })
        .catch(() => {
          // 连接失败
          setOfflineState(prev => ({ ...prev, reconnecting: false }));
          resolve(false);
        });
    });
  }, [offlineState]);
  
  // 应用字体大小调整
  useEffect(() => {
    if (!mergedConfig.adaptFontSize || typeof document === 'undefined') {
      return;
    }
    
    const applyFontAdjustment = () => {
      const htmlElement = document.documentElement;
      
      if (deviceType === 'mobile') {
        htmlElement.style.fontSize = '14px';
      } else if (deviceType === 'tablet') {
        htmlElement.style.fontSize = '16px';
      } else {
        htmlElement.style.fontSize = ''; // 重置为默认值
      }
    };
    
    applyFontAdjustment();
    
    return () => {
      document.documentElement.style.fontSize = ''; // 清理
    };
  }, [deviceType, mergedConfig.adaptFontSize]);
  
  // 添加下拉刷新支持
  useEffect(() => {
    if (!mergedConfig.enablePullToRefresh || deviceType === 'desktop' || typeof document === 'undefined') {
      return;
    }
    
    let startY = 0;
    let isPulling = false;
    const threshold = 60; // 下拉阈值
    
    // 创建指示器元素
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.top = '0';
    indicator.style.left = '0';
    indicator.style.width = '100%';
    indicator.style.height = '0';
    indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    indicator.style.transition = 'height 0.2s';
    indicator.style.zIndex = '9999';
    indicator.style.display = 'flex';
    indicator.style.justifyContent = 'center';
    indicator.style.alignItems = 'center';
    indicator.style.overflow = 'hidden';
    indicator.innerHTML = '<span style="opacity: 0">下拉刷新</span>';
    document.body.appendChild(indicator);
    
    const handleTouchStart = (e: TouchEvent) => {
      // 只在页面顶部启用下拉刷新
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0 && window.scrollY <= 0) {
        // 防止默认滚动行为
        e.preventDefault();
        
        // 计算指示器高度（使用阻尼效果）
        const height = Math.min(threshold, diff * 0.5);
        indicator.style.height = `${height}px`;
        
        // 更新文本
        const span = indicator.querySelector('span');
        if (span) {
          span.style.opacity = Math.min(height / threshold, 1).toString();
          span.textContent = height >= threshold ? '释放刷新' : '下拉刷新';
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (!isPulling) return;
      isPulling = false;
      
      const height = parseFloat(indicator.style.height);
      if (height >= threshold) {
        // 触发刷新
        indicator.style.height = '40px';
        const span = indicator.querySelector('span');
        if (span) {
          span.textContent = '刷新中...';
        }
        
        // 刷新页面
        window.location.reload();
      } else {
        // 重置指示器
        indicator.style.height = '0';
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.removeChild(indicator);
    };
  }, [deviceType, mergedConfig.enablePullToRefresh]);
  
  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait,
    isLandscape: !isPortrait,
    isOnline: offlineState.isOnline,
    isKeyboardVisible,
    registerGestureHandler,
    optimizeImageUrl,
    attemptReconnect,
    offlineState
  };
} 