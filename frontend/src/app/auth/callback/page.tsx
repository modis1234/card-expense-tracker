'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/api';

const noopSubscribe = () => () => {};

/** 백엔드가 /auth/callback#token=<JWT> 로 리디렉션한다 */
export default function AuthCallbackPage() {
  const router = useRouter();
  // null = 서버 렌더/하이드레이션 중
  const hash = useSyncExternalStore(noopSubscribe, () => window.location.hash, () => null);
  const token = hash === null ? null : new URLSearchParams(hash.slice(1)).get('token');

  useEffect(() => {
    if (!token) return;
    setToken(token);
    // 토큰이 주소창/히스토리에 남지 않게 제거
    window.history.replaceState(null, '', window.location.pathname);
    router.replace('/dashboard');
  }, [token, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 text-center">
      {hash === null || token ? (
        <p className="text-gray-500">로그인 처리 중...</p>
      ) : (
        <div>
          <p className="text-red-600">로그인 토큰을 받지 못했습니다.</p>
          <Link href="/login" className="mt-4 inline-block text-indigo-600 underline">
            로그인 페이지로
          </Link>
        </div>
      )}
    </main>
  );
}
