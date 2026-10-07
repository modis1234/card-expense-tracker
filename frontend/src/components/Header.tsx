'use client';

import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/transactions', label: '거래내역' },
  { href: '/upload', label: '업로드' },
];

const Header = memo(() => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="font-bold text-indigo-600">SmartExpense</span>
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? 'font-semibold text-indigo-600' : 'text-gray-600 hover:text-gray-900'}
          >
            {label}
          </Link>
        ))}
        <button onClick={handleLogout} className="ml-auto text-sm text-gray-500 hover:text-gray-900">
          로그아웃
        </button>
      </nav>
    </header>
  );
});

Header.displayName = 'Header';
export default Header;
