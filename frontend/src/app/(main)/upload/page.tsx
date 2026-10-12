'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const ACCEPT = '.xlsx,.xls,.csv,.html,.htm,.pdf,.png,.jpg,.jpeg,.webp';
const isSupported = (name: string) => /\.(xlsx|xls|csv|html?|pdf|png|jpe?g|webp)$/i.test(name);

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // 암호가 걸린 엑셀: 서버가 422로 알려주면 입력창을 띄움 (null이면 닫힘, 값은 안내 문구)
  const [passwordPrompt, setPasswordPrompt] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (passwordPrompt) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else dialogRef.current?.close();
  }, [passwordPrompt]);

  const pick = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!isSupported(f.name)) {
      setStatus({ kind: 'error', message: '엑셀, CSV, HTML, PDF, 이미지 파일만 업로드할 수 있습니다.' });
      return;
    }
    setFile(f);
    setStatus({ kind: 'idle' });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      pick(e.dataTransfer.files[0]);
    },
    [pick],
  );

  const handleUpload = useCallback(
    async (password?: string) => {
      if (!file) return;
      setStatus({ kind: 'uploading' });
      setPasswordPrompt(null);
      const form = new FormData();
      form.append('file', file);
      if (password) form.append('password', password);
      try {
        const res = await apiFetch<{ message: string }>('/files/upload', { method: 'POST', body: form });
        setStatus({ kind: 'success', message: res.message });
        setFile(null);
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.status === 422) {
          // 암호 필요 또는 암호 틀림 → 입력창을 다시 띄움
          setStatus({ kind: 'idle' });
          setPasswordPrompt(err.message);
        } else setStatus({ kind: 'error', message: err.message });
      }
    },
    [file],
  );

  const uploading = status.kind === 'uploading';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">카드 명세서 업로드</h1>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-4 py-16 text-center ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        }`}
      >
        <span className="text-gray-700">파일을 드래그하거나 클릭하여 선택하세요</span>
        <span className="mt-2 text-sm text-gray-400">지원 형식: 엑셀(.xlsx, .xls), CSV, HTML, PDF, 이미지(.png, .jpg, .webp)</span>
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>

      {file && (
        <p className="text-sm text-gray-700">
          선택된 파일: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
        </p>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">업로드 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>모든 카드사</strong>의 명세서·이용내역을 엑셀, CSV, HTML, PDF, 캡처 이미지로 올릴 수 있습니다.
          </li>
          <li>
            <strong>하나카드</strong> 이용대금명세서 메일(HTML)과 <strong>현대카드</strong> 이용내역 엑셀은 전용 양식으로 정확히 읽습니다.
            그 외에는 AI가 읽어 행이 빠지거나 더해질 수 있으니, 저장 후 카드사 청구 금액과 합계를 확인하세요.
          </li>
          <li>
            카드사는 명세서 내용으로 판별하고, 내용에 없으면 파일명으로 판별합니다. 판별이 안 되면 파일명에 카드사명을 넣어 주세요
            (예: shinhan_202610.pdf). 처음 보는 카드사·카드는 자동으로 등록됩니다.
          </li>
          <li>금액은 &quot;이번 달 결제하실 금액&quot; 기준이며, 할부는 해당 회차 금액으로 저장됩니다.</li>
          <li>
            같은 카드사·같은 청구월 명세서는 다시 저장되지 않습니다. 청구월이 없는 이용내역(현대카드 엑셀 등)은 중복 저장될 수 있으니,
            잘못 올렸다면 거래내역에서 선택 삭제하세요.
          </li>
          <li>AI가 카테고리를 자동 분류하며, 신뢰도가 낮은 거래는 &quot;확인 필요&quot;로 표시됩니다.</li>
        </ul>
      </div>

      {status.kind === 'uploading' && <p className="text-gray-600">파일을 분석하고 있습니다... (AI로 읽고 분류하는 경우 1분 가까이 걸릴 수 있습니다)</p>}
      {status.kind === 'error' && <p className="text-red-600">업로드 실패: {status.message}</p>}
      {status.kind === 'success' && (
        <p className="text-green-700">
          {status.message}.{' '}
          <Link href="/transactions" className="text-indigo-600 underline">
            거래내역 보기
          </Link>
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => handleUpload()}
          disabled={!file || uploading}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {uploading ? '업로드 중...' : '업로드 및 분류'}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setPasswordPrompt(null)}
        className="m-auto w-full max-w-sm rounded-xl p-6 shadow-xl backdrop:bg-black/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const password = new FormData(e.currentTarget).get('password');
            if (typeof password === 'string' && password) handleUpload(password);
          }}
          className="space-y-4"
        >
          <h2 className="font-bold">엑셀 파일 암호</h2>
          <p className="text-sm text-gray-600">{passwordPrompt}</p>
          <p className="text-xs text-gray-400">카드사 엑셀은 보통 생년월일 6자리 등이 암호입니다. 암호는 파일을 여는 데만 쓰고 저장하지 않습니다.</p>
          {/* 다시 열릴 때 이전 입력이 남지 않도록 key로 초기화 */}
          <input
            key={passwordPrompt}
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="off"
            aria-label="엑셀 파일 암호"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasswordPrompt(null)}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              취소
            </button>
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              확인
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
