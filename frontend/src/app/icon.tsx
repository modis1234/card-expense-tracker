import { appIcon } from '@/lib/app-icon';

// /icon/192, /icon/512 → manifest.ts의 설치 아이콘
export function generateImageMetadata() {
  return [192, 512].map((n) => ({ id: String(n), size: { width: n, height: n }, contentType: 'image/png' }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return appIcon(Number(await id));
}
