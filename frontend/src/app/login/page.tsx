'use client';

import { API_URL } from '@/lib/api';

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-indigo-600">SmartExpense</h1>
        <p className="mt-1 text-sm text-gray-500">AI 기반 자동 분류 가계부</p>
        <a
          href={`${API_URL}/auth/google`}
          className="mt-8 block rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Google로 로그인
        </a>
      </div>
    </main>
  );
}
