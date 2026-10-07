'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/lib/api';

export default function Home() {
  const token = useToken();
  const router = useRouter();

  useEffect(() => {
    if (token !== undefined) router.replace(token ? '/dashboard' : '/login');
  }, [token, router]);

  return null;
}
