'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useToken } from '@/lib/api';

/** 로그인 필요한 페이지 공통 레이아웃: 토큰 없으면 /login */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const token = useToken();
  const router = useRouter();

  useEffect(() => {
    if (token === null) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
