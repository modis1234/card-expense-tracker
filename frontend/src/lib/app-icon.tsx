import { ImageResponse } from 'next/og';

// 앱 아이콘: 남색 바탕에 올라가는 막대 3개 (소비 리포트 차트)
// 글꼴 없이 도형만 써서 ImageResponse 기본 글꼴의 한글·₩ 미지원 문제를 피함
// 홈 화면 마스크(원·둥근 사각형)에 잘리지 않도록 막대는 가운데 60% 안에만 그림
export function appIcon(size: number) {
  const bar = (height: number) => (
    <div style={{ width: size * 0.13, height: size * height, background: 'white', borderRadius: size * 0.03 }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: size * 0.07,
          paddingBottom: size * 0.25,
          background: '#4f46e5',
        }}
      >
        {bar(0.22)}
        {bar(0.36)}
        {bar(0.5)}
      </div>
    ),
    { width: size, height: size },
  );
}
