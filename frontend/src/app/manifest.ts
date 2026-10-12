import type { MetadataRoute } from 'next';

// 홈 화면 설치(PWA). 서비스 워커는 없음: 설치에는 필요 없고, 데이터가 전부 API라 오프라인으로 보여줄 게 없음
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '소비 리포트',
    short_name: '소비 리포트',
    description: 'AI가 자동 분류한 카드 지출을 한눈에 보는 소비 리포트',
    lang: 'ko',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
