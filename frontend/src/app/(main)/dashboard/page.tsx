'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ITransaction } from '@/lib/api';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
const sumOf = (list: ITransaction[]) => list.reduce((s, t) => s + t.amount, 0);

/** 청구월 기준 (할부 회차는 청구된 달 지출). 청구월이 없으면 이용일의 'YYYY-MM' */
const monthOf = (t: ITransaction) => t.billingMonth ?? t.date.slice(0, 7);
const isInstallment = (t: ITransaction) => t.installmentMonths !== null;
const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};
const monthLabel = (m: string) => `${m.slice(0, 4)}년 ${Number(m.slice(5))}월`;

type Result = { data?: ITransaction[]; error?: string };

// ponytail: 통계는 GET /transactions 전체를 받아 화면에서 집계. 거래가 수만 건이 되면 서버 집계 API로
export default function DashboardPage() {
  const [result, setResult] = useState<Result>();
  const [pickedMonth, setPickedMonth] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    apiFetch<ITransaction[]>('/transactions').then(
      (data) => !cancelled && setResult({ data }),
      (e: Error) => !cancelled && setResult({ error: e.message }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => result?.data ?? [], [result]);
  const months = useMemo(() => [...new Set(data.map(monthOf))].sort().reverse(), [data]);
  const month = pickedMonth ?? months[0];

  const stats = useMemo(() => {
    if (!month) return null;
    const current = data.filter((t) => monthOf(t) === month);
    const total = sumOf(current);
    const prevTotal = sumOf(data.filter((t) => monthOf(t) === shiftMonth(month, -1)));

    const byCategory = new Map<string, { name: string; icon: string; color: string; amount: number; count: number }>();
    for (const t of current) {
      const c = byCategory.get(t.category.id) ?? { ...t.category, amount: 0, count: 0 };
      c.amount += t.amount;
      c.count++;
      byCategory.set(t.category.id, c);
    }
    const categories = [...byCategory.values()].sort((a, b) => b.amount - a.amount);

    // 선택 월 포함 최근 6개월 (일시불/할부 누적 막대)
    const trend = Array.from({ length: 6 }, (_, i) => {
      const m = shiftMonth(month, i - 5);
      const list = data.filter((t) => monthOf(t) === m);
      const installment = sumOf(list.filter(isInstallment));
      return { month: m, total: sumOf(list), installment };
    });
    const installments = current.filter(isInstallment).sort((a, b) => b.amount - a.amount);

    return {
      total,
      count: current.length,
      average: current.length ? Math.round(total / current.length) : 0,
      change: prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null,
      categories,
      trend,
      installmentTotal: sumOf(installments),
      installments,
      review: current.filter((t) => t.needsReview).sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [data, month]);

  if (!result) return <p className="py-12 text-center text-gray-500">불러오는 중...</p>;
  if (result.error) return <p className="py-12 text-center text-red-600">통계를 불러오지 못했습니다: {result.error}</p>;
  if (!stats)
    return (
      <p className="py-12 text-center text-gray-500">
        거래내역이 없습니다.{' '}
        <Link href="/upload" className="text-indigo-600 underline">
          명세서 업로드하기
        </Link>
      </p>
    );

  // 도넛 차트: 양수 금액만 비율 계산 (환불 위주 카테고리는 차트에서 제외)
  const positive = stats.categories.filter((c) => c.amount > 0);
  const positiveTotal = positive.reduce((s, c) => s + c.amount, 0);
  let acc = 0;
  const gradient = positive
    .map((c) => {
      const start = (acc / positiveTotal) * 100;
      acc += c.amount;
      return `${c.color} ${start}% ${(acc / positiveTotal) * 100}%`;
    })
    .join(', ');
  const trendMax = Math.max(...stats.trend.map((t) => t.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{monthLabel(month)} 지출 현황</h1>
        <select
          value={month}
          onChange={(e) => setPickedMonth(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
          aria-label="조회 월"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="총 지출"
          value={won(stats.total)}
          sub={`일시불 ${won(stats.total - stats.installmentTotal)} · 할부 ${won(stats.installmentTotal)}`}
        />
        <SummaryCard label="거래 건수" value={`${stats.count.toLocaleString('ko-KR')}건`} />
        <SummaryCard label="평균 지출" value={won(stats.average)} />
        <SummaryCard
          label="전월 대비"
          value={stats.change === null ? '-' : `${stats.change >= 0 ? '↑' : '↓'} ${Math.abs(stats.change).toFixed(1)}%`}
          tone={stats.change === null ? undefined : stats.change >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">카테고리별 지출</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div
              className="relative size-40 shrink-0 rounded-full"
              style={{ background: positiveTotal ? `conic-gradient(${gradient})` : '#e5e7eb' }}
              role="img"
              aria-label="카테고리별 지출 비율 차트"
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-xs text-gray-500">총 지출</span>
                <span className="text-sm font-semibold">{won(stats.total)}</span>
              </div>
            </div>
            <ul className="w-full space-y-2 text-sm">
              {stats.categories.map((c) => {
                const pct = positiveTotal && c.amount > 0 ? (c.amount / positiveTotal) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                        {c.icon} {c.name}
                        <span className="text-xs text-gray-400">{c.count}건</span>
                      </span>
                      <span className="whitespace-nowrap">
                        {won(c.amount)} <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded bg-gray-100">
                      <div className="h-1.5 rounded" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">월별 지출 추이</h2>
          <div className="flex h-48 items-end gap-3">
            {stats.trend.map((t) => (
              <button
                key={t.month}
                onClick={() => months.includes(t.month) && setPickedMonth(t.month)}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${monthLabel(t.month)} ${won(t.total)}`}
              >
                <span className="text-[10px] text-gray-500">{t.total ? `${Math.round(t.total / 10000)}만` : ''}</span>
                <div
                  className={`flex w-full flex-col justify-end overflow-hidden rounded-t ${t.month === month ? '' : 'opacity-50'}`}
                  style={{ height: `${(Math.max(t.total, 0) / trendMax) * 100}%` }}
                >
                  <div className="w-full flex-1 bg-indigo-500" />
                  <div
                    className="w-full bg-amber-400"
                    style={{ height: `${t.total > 0 ? (t.installment / t.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{Number(t.month.slice(5))}월</span>
              </button>
            ))}
          </div>
          <p className="mt-4 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-indigo-500" /> 일시불
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-amber-400" /> 할부 납입금
            </span>
          </p>
        </section>
      </div>

      {stats.installments.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">
            할부 납입 내역 ({stats.installments.length}건 · {won(stats.installmentTotal)})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">이용일</th>
                  <th className="py-1.5 pr-3 font-medium">가맹점</th>
                  <th className="py-1.5 pr-3 font-medium">회차</th>
                  <th className="py-1.5 pr-3 text-right font-medium">이번 달 납입금</th>
                  <th className="py-1.5 pr-3 text-right font-medium">총 이용금액</th>
                  <th className="py-1.5 text-right font-medium">남은 회차</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.installments.map((t) => {
                  const left = (t.installmentMonths ?? 0) - (t.installmentRound ?? 0);
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap py-2 pr-3 text-gray-500">{t.date.slice(0, 10)}</td>
                      <td className="py-2 pr-3">{t.merchantName}</td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        {t.installmentRound}/{t.installmentMonths}회
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{won(t.amount)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right text-gray-500">
                        {t.originalAmount !== null ? won(t.originalAmount) : '-'}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">{left > 0 ? `${left}회` : '완납'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">확인 필요한 거래 ({stats.review.length}건)</h2>
          <Link href="/transactions" className="text-sm text-indigo-600 hover:underline">
            거래내역에서 보기 →
          </Link>
        </div>
        {stats.review.length === 0 ? (
          <p className="text-sm text-gray-500">확인이 필요한 거래가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {stats.review.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-gray-500">{t.date.slice(0, 10)}</span>
                <span className="flex-1 truncate">{t.merchantName}</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{t.category.name}?</span>
                <span className="whitespace-nowrap">{won(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' | 'down' }) {
  // 지출이 늘면(up) 빨강, 줄면(down) 초록
  const color = tone === 'up' ? 'text-red-600' : tone === 'down' ? 'text-green-600' : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
