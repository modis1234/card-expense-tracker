'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getMyUserId, type ICard, type ICardGroup, type IGroupCard, type ISharedCardGroup } from '@/lib/api';

type Data = {
  cards: ICard[];
  groups: ICardGroup[];
  shared: ISharedCardGroup[];
};
type Result = { data?: Data; error?: string };

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const cardLabel = (c: IGroupCard) => `****${c.last4}${c.alias ? ` ${c.alias}` : ''}`;

export default function GroupsPage() {
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  // 그룹별 공유 이메일 입력값
  const [emails, setEmails] = useState<Record<string, string>>({});

  const load = useCallback(
    () =>
      Promise.all([
        apiFetch<ICard[]>('/cards'),
        apiFetch<ICardGroup[]>('/card-groups'),
        apiFetch<ISharedCardGroup[]>('/card-groups/shared'),
      ]).then(
        ([cards, groups, shared]): Result => ({
          data: { cards, groups, shared },
        }),
        (e: Error): Result => ({ error: e.message }),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    load().then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [load]);

  /** 변경 요청 후 전체 목록 다시 조회. 실패하면 에러 메시지 표시 */
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        setResult(await load());
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (name && (await run(() => apiFetch('/card-groups', json('POST', { name }))))) setNewName('');
  };

  const handleDelete = (g: ICardGroup) => {
    if (!confirm(`'${g.name}' 그룹을 삭제할까요? 소속 카드는 미지정으로 바뀌고, 공유도 해제됩니다.`)) return;
    run(() => apiFetch(`/card-groups/${g.id}`, { method: 'DELETE' }));
  };

  const handleShare = async (e: React.FormEvent, groupId: string) => {
    e.preventDefault();
    const email = emails[groupId]?.trim();
    if (!email) return;
    if (await run(() => apiFetch(`/card-groups/${groupId}/members`, json('POST', { email }))))
      setEmails((prev) => ({ ...prev, [groupId]: '' }));
  };

  const handleUnshare = (groupId: string, userId: string, who: string) => {
    if (!confirm(`${who}님과의 공유를 해제할까요?`)) return;
    run(() =>
      apiFetch(`/card-groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      }),
    );
  };

  const handleLeave = (g: ISharedCardGroup) => {
    const me = getMyUserId();
    if (!me || !confirm(`'${g.name}' 그룹 공유에서 나갈까요?`)) return;
    run(() => apiFetch(`/card-groups/${g.id}/members/${me}`, { method: 'DELETE' }));
  };

  const handleAssign = (cardId: string, groupId: string) =>
    run(() => apiFetch(`/cards/${cardId}`, json('PATCH', { groupId: groupId || null })));

  if (!result) return <p className="py-12 text-center text-gray-500">불러오는 중...</p>;
  if (result.error) return <p className="py-12 text-center text-red-600">불러오지 못했습니다: {result.error}</p>;
  const { cards, groups, shared } = result.data!;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">카드 그룹</h1>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">내 그룹</h2>
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 그룹 이름 (예: 공통)"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            aria-label="새 그룹 이름"
          />
          <button
            disabled={busy || !newName.trim()}
            className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            그룹 만들기
          </button>
        </form>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">아직 그룹이 없습니다. 함께 보는 카드를 묶어 공유해 보세요.</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id} className="rounded border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    {g.color && <span className="size-2.5 rounded-full" style={{ background: g.color }} />}
                    {g.name}
                  </span>
                  <button
                    onClick={() => handleDelete(g)}
                    disabled={busy}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  카드: {g.cards.length ? g.cards.map(cardLabel).join(', ') : '없음 (아래 내 카드에서 지정)'}
                </p>

                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs text-gray-500">
                    읽기 전용 공유 — 공유받은 사람은 리포트만 볼 수 있습니다.
                  </p>
                  {g.members.length > 0 && (
                    <ul className="mb-2 space-y-1 text-sm">
                      {g.members.map((m) => (
                        <li key={m.userId} className="flex items-center justify-between gap-2">
                          <span>
                            {m.user.name ?? m.user.email} <span className="text-xs text-gray-400">{m.user.email}</span>
                          </span>
                          <button
                            onClick={() => handleUnshare(g.id, m.userId, m.user.name ?? m.user.email)}
                            disabled={busy}
                            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                          >
                            공유 해제
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={(e) => handleShare(e, g.id)} className="flex gap-2">
                    <input
                      type="email"
                      value={emails[g.id] ?? ''}
                      onChange={(e) =>
                        setEmails((prev) => ({
                          ...prev,
                          [g.id]: e.target.value,
                        }))
                      }
                      placeholder="공유할 사람의 Google 이메일"
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      aria-label={`${g.name} 공유 이메일`}
                    />
                    <button
                      disabled={busy || !emails[g.id]?.trim()}
                      className="rounded border border-indigo-600 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      공유
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">내 카드</h2>
        {cards.length === 0 ? (
          <p className="text-sm text-gray-500">
            등록된 카드가 없습니다. 명세서를 올리면 카드가 자동으로 추가됩니다.{' '}
            <Link href="/upload" className="text-indigo-600 underline">
              명세서 업로드하기
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {c.cardCompany.name} {cardLabel(c)}
                </span>
                <select
                  value={c.groupId ?? ''}
                  onChange={(e) => handleAssign(c.id, e.target.value)}
                  disabled={busy}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                  aria-label={`****${c.last4} 그룹`}
                >
                  <option value="">미지정</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">공유받은 그룹</h2>
        {shared.length === 0 ? (
          <p className="text-sm text-gray-500">공유받은 그룹이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {shared.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">
                    {g.name}{' '}
                    <span className="text-xs font-normal text-gray-500">
                      {g.user.name ?? g.user.email}님 ({g.user.email})
                    </span>
                  </p>
                  <p className="text-gray-600">카드: {g.cards.length ? g.cards.map(cardLabel).join(', ') : '없음'}</p>
                </div>
                <button
                  onClick={() => handleLeave(g)}
                  disabled={busy}
                  className="whitespace-nowrap text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  공유 나가기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
