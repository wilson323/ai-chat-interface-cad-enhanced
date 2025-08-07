/**
 * @fileoverview A hook for managing user authentication.
 * @file_zh-CN: 用于管理用户认证的钩子。
 */

import { useRouter } from 'next/navigation';
import { useFastGPT } from '@/contexts/FastGPTContext';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const router = useRouter();
  const { toast } = useToast();
  const { isConfigured, isLoading, currentUser, setCurrentUser } = useFastGPT();

  const logout = () => {
    setCurrentUser(null);
    toast({
      title: '已登出',
      description: '您已成功退出登录',
    });
    // Optionally, redirect to login page
    // router.push('/auth/login');
  };

  const login = () => {
      router.push('/auth/auto-login?userId=demo&password=demo')
  }

  return {
    isConfigured,
    isLoading,
    currentUser,
    logout,
    login
  };
}
