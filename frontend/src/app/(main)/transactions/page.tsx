'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ITransaction } from '@/lib/api';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/** 서버 응답 결과를 조회 조건(query)과 함께 저장 → query가 바뀌면 자동으로 로딩 상태 */
type Result = { query: string; data?: ITransaction[]; error?: string };

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [result, setResult] = useState<Result>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [from, to]);

  const load = useCallback(
    () =>
      apiFetch<ITransaction[]>(`/transactions${query}`).then(
        (data): Result => ({ query, data }),
        (e: Error): Result => ({ query, error: e.message }),
      ),
    [query],
  );

  useEffect(() => {
    let cancelled = false;
    load().then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleRecategorize = useCallback(
    async (id: string) => {
      setBusyId(id);
      setRowError(null);
      try {
        await apiFetch(`/files/transactions/${id}/recategorize`, { method: 'PUT' });
        setResult(await load());
      } catch (e) {
        setRowError(`재분류 실패: ${(e as Error).message}`);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (ids: string[]) => {
      if (!window.confirm(`${ids.length}건을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
      setBusyId(ids.length === 1 ? ids[0] : 'bulk');
      setRowError(null);
      try {
        await apiFetch('/transactions/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        setSelected(new Set());
        setResult(await load());
      } catch (e) {
        setRowError(`삭제 실패: ${(e as Error).message}`);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const loading = result?.query !== query;
  const rows = useMemo(
    () => (result?.data ?? []).filter((t) => !reviewOnly || t.needsReview),
    [result, reviewOnly],
  );
  const total = useMemo(() => rows.reduce((sum, t) => sum + t.amount, 0), [rows]);
  // 필터로 가려진 행은 선택돼 있어도 삭제 대상에서 제외
  const selectedIds = useMemo(() => rows.filter((t) => selected.has(t.id)).map((t) => t.id), [rows, selected]);
  const allChecked = rows.length > 0 && selectedIds.length === rows.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">거래내역</h1>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          시작일
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          종료일
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 pb-1">
          <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
          확인 필요만
        </label>
        <button
          onClick={() => handleDelete(selectedIds)}
          disabled={selectedIds.length === 0 || busyId !== null}
          className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {busyId === 'bulk' ? '삭제 중...' : `선택 삭제 (${selectedIds.length})`}
        </button>
        <div className="ml-auto pb-1 text-gray-700">
          총 <strong>{rows.length.toLocaleString('ko-KR')}</strong>건 · 합계 <strong>{won(total)}</strong>
        </div>
      </div>

      {rowError && <p className="text-sm text-red-600">{rowError}</p>}

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : result?.error ? (
        <p className="py-12 text-center text-red-600">거래내역을 불러오지 못했습니다: {result.error}</p>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          거래내역이 없습니다.{' '}
          <Link href="/upload" className="text-indigo-600 underline">
            엑셀 업로드하기
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((t) => t.id)))}
                  />
                </th>
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">가맹점</th>
                <th className="px-3 py-2 text-right">금액</th>
                <th className="px-3 py-2">결제</th>
                <th className="px-3 py-2">카테고리</th>
                <th className="px-3 py-2">카드</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const pct = t.confidence !== null ? `${Math.round(Number(t.confidence) * 100)}%` : null;
                return (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`${t.merchantName} 선택`}
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                      />
                    </td>
                    {/* date는 @db.Date → 'YYYY-MM-DDT00:00:00.000Z', 시간대 변환 없이 날짜만 사용 */}
                    <td className="whitespace-nowrap px-3 py-2">{t.date.slice(0, 10)}</td>
                    <td className="px-3 py-2">{t.merchantName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {won(t.amount)}
                      {t.originalAmount !== null && !t.installmentMonths && (
                        <div className="text-xs text-gray-400">이용 {won(t.originalAmount)}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {t.installmentMonths ? (
                        <>
                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            할부 {t.installmentRound}/{t.installmentMonths}회
                          </span>
                          {t.originalAmount !== null && (
                            <div className="mt-0.5 text-xs text-gray-400">총 {won(t.originalAmount)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">일시불</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{t.category.name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {t.cardCompany.name}
                      {t.card && ` ··${t.card.last4}`}
                      {t.card?.group && <span className="ml-1 rounded bg-gray-100 px-1.5 text-xs">{t.card.group.name}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {t.needsReview ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          확인 필요{pct && ` (${pct})`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{pct ?? '-'}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        onClick={() => handleRecategorize(t.id)}
                        disabled={busyId !== null}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        재분류
                      </button>
                      <button
                        onClick={() => handleDelete([t.id])}
                        disabled={busyId !== null}
                        className="ml-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        삭제
                      </button>
                      {busyId === t.id && <span className="ml-1 text-xs text-gray-500">처리 중...</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
