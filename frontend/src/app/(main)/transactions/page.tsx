'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ICategory, type ITransaction } from '@/lib/api';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

/** 서버 응답 결과를 조회 조건(query)과 함께 저장 → query가 바뀌면 자동으로 로딩 상태 */
type Result = { query: string; data?: ITransaction[]; error?: string };

type SortKey = 'date' | 'amount' | 'payment' | 'category';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

// 결제: 일시불(0) < 할부 개월 수 순, 같은 개월이면 회차 순
const compare: Record<SortKey, (a: ITransaction, b: ITransaction) => number> = {
  date: (a, b) => a.date.localeCompare(b.date),
  amount: (a, b) => a.amount - b.amount,
  payment: (a, b) =>
    (a.installmentMonths ?? 0) - (b.installmentMonths ?? 0) || (a.installmentRound ?? 0) - (b.installmentRound ?? 0),
  category: (a, b) => a.category.name.localeCompare(b.category.name, 'ko'),
};

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [result, setResult] = useState<Result>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState<ICategory[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ subject: string; reason: string }[]>([]);
  const [search, setSearch] = useState('');
  // 체크 해제한 카테고리 id (새로 생긴 카테고리는 기본으로 보이게)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  // 기본은 서버 정렬과 같은 날짜 내림차순
  const [sort, setSort] = useState<Sort>({ key: 'date', dir: 'desc' });

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

  useEffect(() => {
    // 하위 카테고리를 상위 바로 아래에 배치 (예: 식비 → └ 카페/디저트)
    apiFetch<ICategory[]>('/categories').then(
      (list) =>
        setCategoryOptions(
          list.filter((c) => !c.parentId).flatMap((p) => [p, ...list.filter((c) => c.parentId === p.id)]),
        ),
      () => setCategoryOptions([]),
    );
  }, []);

  // 카테고리·메모 수정: 응답으로 받은 거래로 해당 행만 교체 (목록 전체를 다시 불러오지 않음)
  const handleUpdate = useCallback(async (id: string, patch: { categoryId?: string; description?: string }) => {
    setBusyId(id);
    setRowError(null);
    try {
      const updated = await apiFetch<ITransaction>(`/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setResult((prev) => prev && { ...prev, data: prev.data?.map((t) => (t.id === id ? updated : t)) });
    } catch (e) {
      setRowError(`수정 실패: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleMemo = (t: ITransaction) => {
    // ponytail: 브라우저 기본 입력창 사용, 메모 편집이 잦아지면 인라인 입력으로
    const memo = window.prompt(`${t.merchantName} 메모 (비우면 삭제)`, t.description ?? '');
    if (memo !== null && memo !== (t.description ?? '')) handleUpdate(t.id, { description: memo });
  };

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
      setBusyId(ids.length === 1 ? ids[0] : 'bulk-delete');
      setRowError(null);
      setNotice(null);
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

  // Gmail 명세서 메일 불러오기: 메일마다 AI 분류를 거쳐 수십 초 걸릴 수 있음
  const handleGmailImport = useCallback(async () => {
    setBusyId('gmail');
    setRowError(null);
    setNotice(null);
    setSkipped([]);
    try {
      const res = await apiFetch<{ message: string; skipped: { subject: string; reason: string }[] }>('/gmail/sync', {
        method: 'POST',
      });
      setNotice(res.message);
      setSkipped(res.skipped);
      setResult(await load());
    } catch (e) {
      setRowError(`Gmail 불러오기 실패: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const handleBulkRecategorize = useCallback(
    async (ids: string[]) => {
      setBusyId('bulk-recat');
      setRowError(null);
      setNotice(null);
      try {
        const res = await apiFetch<{ message: string }>('/files/transactions/recategorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        setNotice(res.message);
        setSelected(new Set());
        setResult(await load());
      } catch (e) {
        setRowError(`일괄 재분류 실패: ${(e as Error).message}`);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const loading = result?.query !== query;
  // 조회된 거래에 있는 카테고리 목록 (건수 포함, 이름순)
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const t of result?.data ?? []) {
      const c = map.get(t.category.id) ?? { ...t.category, count: 0 };
      c.count++;
      map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [result]);

  const rows = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const keyword = search.trim().toLowerCase();
    return (result?.data ?? [])
      .filter((t) => !reviewOnly || t.needsReview)
      .filter((t) => !hiddenCategories.has(t.category.id))
      .filter((t) => !keyword || t.merchantName.toLowerCase().includes(keyword))
      .sort((a, b) => sign * compare[sort.key](a, b));
  }, [result, reviewOnly, hiddenCategories, search, sort]);

  const toggleCategory = (id: string) =>
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const total = useMemo(() => rows.reduce((sum, t) => sum + t.amount, 0), [rows]);
  // 필터로 가려진 행은 선택돼 있어도 삭제 대상에서 제외
  const selectedIds = useMemo(() => rows.filter((t) => selected.has(t.id)).map((t) => t.id), [rows, selected]);
  const allChecked = rows.length > 0 && selectedIds.length === rows.length;

  // 같은 열을 다시 누르면 방향 전환, 다른 열은 금액·날짜는 큰/최신 순부터
  const sortBy = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'date' || key === 'amount' ? 'desc' : 'asc' },
    );

  const sortHeader = (key: SortKey, label: string, className = '') => (
    <th
      className={`px-3 py-2 ${className}`}
      aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button onClick={() => sortBy(key)} className="inline-flex items-center gap-1 font-medium hover:text-gray-900">
        {label}
        <span className={sort.key === key ? 'text-indigo-600' : 'text-gray-300'}>
          {sort.key === key && sort.dir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  );

  const filtered = from !== '' || to !== '' || search !== '' || reviewOnly || hiddenCategories.size > 0;
  const resetFilters = () => {
    setFrom('');
    setTo('');
    setSearch('');
    setReviewOnly(false);
    setHiddenCategories(new Set());
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">거래내역</h1>
        <button
          onClick={handleGmailImport}
          disabled={busyId !== null}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          title="로그인한 Google 계정에서 최근 1년 하나카드 이용대금명세서 메일을 찾아 저장합니다"
        >
          {busyId === 'gmail' ? 'Gmail 확인 중...' : 'Gmail에서 불러오기'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          시작일
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          종료일
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          가맹점 검색
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="예: 쿠팡"
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 pb-1">
          <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
          확인 필요만
        </label>
        <button
          onClick={resetFilters}
          disabled={!filtered}
          className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          title="기간·가맹점 검색·확인 필요만·카테고리 필터를 모두 해제합니다"
        >
          초기화
        </button>
        <button
          onClick={() => handleBulkRecategorize(selectedIds)}
          disabled={selectedIds.length === 0 || busyId !== null}
          className="rounded border border-indigo-300 px-3 py-1 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
        >
          {busyId === 'bulk-recat' ? '재분류 중...' : `선택 재분류 (${selectedIds.length})`}
        </button>
        <button
          onClick={() => handleDelete(selectedIds)}
          disabled={selectedIds.length === 0 || busyId !== null}
          className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          {busyId === 'bulk-delete' ? '삭제 중...' : `선택 삭제 (${selectedIds.length})`}
        </button>
        <div className="ml-auto pb-1 text-gray-700">
          총 <strong>{rows.length.toLocaleString('ko-KR')}</strong>건 · 합계 <strong>{won(total)}</strong>
        </div>
      </div>

      {categories.length > 0 && (
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
          <legend className="sr-only">카테고리 필터</legend>
          <span className="font-medium text-gray-700">카테고리</span>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={hiddenCategories.size === 0}
              onChange={() =>
                setHiddenCategories(hiddenCategories.size === 0 ? new Set(categories.map((c) => c.id)) : new Set())
              }
            />
            전체
          </label>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5">
              <input type="checkbox" checked={!hiddenCategories.has(c.id)} onChange={() => toggleCategory(c.id)} />
              {c.name} <span className="text-gray-400">({c.count})</span>
            </label>
          ))}
        </fieldset>
      )}

      {rowError && <p className="text-sm text-red-600">{rowError}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}
      {skipped.length > 0 && (
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer">건너뛴 메일 {skipped.length}건 보기</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {skipped.map((s, i) => (
              <li key={i}>
                {s.subject} — <span className="text-gray-500">{s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : result?.error ? (
        <p className="py-12 text-center text-red-600">거래내역을 불러오지 못했습니다: {result.error}</p>
      ) : rows.length === 0 && (result?.data?.length ?? 0) > 0 ? (
        <p className="py-12 text-center text-gray-500">검색·필터 조건에 맞는 거래가 없습니다.</p>
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
                {sortHeader('date', '날짜')}
                <th className="px-3 py-2">가맹점</th>
                {sortHeader('amount', '금액', 'text-right')}
                {sortHeader('payment', '결제')}
                {sortHeader('category', '카테고리')}
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
                    <td className="px-3 py-2">
                      {t.merchantName}
                      <button
                        onClick={() => handleMemo(t)}
                        disabled={busyId !== null}
                        className="ml-1 text-xs text-gray-400 hover:text-indigo-600"
                        title="메모"
                        aria-label={`${t.merchantName} 메모 ${t.description ? '수정' : '추가'}`}
                      >
                        ✎
                      </button>
                      {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                    </td>
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
                    <td className="px-3 py-2">
                      {categoryOptions.length > 0 ? (
                        <select
                          value={t.category.id}
                          onChange={(e) => handleUpdate(t.id, { categoryId: e.target.value })}
                          disabled={busyId !== null}
                          aria-label={`${t.merchantName} 카테고리`}
                          className="rounded border border-transparent bg-transparent py-0.5 hover:border-gray-300"
                        >
                          {categoryOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.parentId ? '└ ' : ''}
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t.category.name
                      )}
                    </td>
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
