'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const isSupported = (name: string) => /\.(xlsx|xls|html?)$/i.test(name);

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const pick = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!isSupported(f.name)) {
      setStatus({ kind: 'error', message: '.xlsx, .xls, .html 파일만 업로드할 수 있습니다.' });
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

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStatus({ kind: 'uploading' });
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await apiFetch<{ message: string }>('/files/upload', { method: 'POST', body: form });
      setStatus({ kind: 'success', message: res.message });
      setFile(null);
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    }
  }, [file]);

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
        <span className="mt-2 text-sm text-gray-400">지원 형식: .xlsx, .xls, .html</span>
        <input
          type="file"
          accept=".xlsx,.xls,.html,.htm"
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
            <strong>현대카드</strong> — 이용내역 엑셀(.xlsx, .xls). 파일명에 카드사 이름이 포함되어야 합니다 (예: hyundai_202601.xlsx).
          </li>
          <li>
            <strong>하나카드</strong> — 이용대금명세서 메일을 HTML로 저장한 파일(.html, 예: hanacard_20261013.html). 파일명은 상관없습니다.
            금액은 명세서의 &quot;이번 달 결제하실 금액&quot; 기준이며, 할부는 해당 회차 원금 + 수수료로 저장됩니다.
          </li>
          <li>같은 파일을 다시 올리면 거래가 중복 저장됩니다. 잘못 올렸다면 거래내역에서 선택 삭제하세요.</li>
          <li>AI가 카테고리를 자동 분류하며, 신뢰도가 낮은 거래는 &quot;확인 필요&quot;로 표시됩니다.</li>
        </ul>
      </div>

      {status.kind === 'uploading' && <p className="text-gray-600">파일을 분석하고 있습니다... (AI 분류 포함, 잠시 걸릴 수 있습니다)</p>}
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
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {uploading ? '업로드 중...' : '업로드 및 분류'}
        </button>
      </div>
    </div>
  );
}
