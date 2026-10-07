import { useSyncExternalStore } from 'react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'accessToken';
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  emit();
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

/** undefined = 아직 모름(서버 렌더/하이드레이션 중), null = 토큰 없음 */
export const useToken = () =>
  useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => localStorage.getItem(TOKEN_KEY),
    () => undefined,
  );

/** Bearer 토큰을 붙여 호출. 401이면 토큰을 지우고 /login으로 보낸다. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    window.location.replace('/login');
    throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // NestJS 에러 형식: { statusCode, message: string | string[], error }
    const message = body?.message;
    throw new Error(
      (Array.isArray(message) ? message.join(', ') : message) || `요청 실패 (${res.status})`,
    );
  }
  return body as T;
}

export interface ITransaction {
  id: string;
  date: string;
  /** 이번 명세서 결제 금액 (할부는 해당 회차 원금 + 수수료) */
  amount: number;
  /** 할부 개월 수 (일시불이면 null) */
  installmentMonths: number | null;
  installmentRound: number | null;
  /** amount와 다를 때만: 할부 전체 금액, 할인·부분취소 전 이용금액 */
  originalAmount: number | null;
  merchantName: string;
  confidence: string | null;
  needsReview: boolean;
  category: { id: string; name: string; icon: string; color: string };
  cardCompany: { id: string; name: string };
  card: { id: string; last4: string; alias: string | null; group: { id: string; name: string } | null } | null;
}
