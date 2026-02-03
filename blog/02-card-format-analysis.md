# [카드 가계부 만들기 #2] 카드사 데이터 포맷 분석 - HTML vs 엑셀

## 들어가며

카드 결제 내역을 자동으로 분류하려면, 먼저 카드사에서 제공하는 데이터 포맷을 이해해야 합니다. 각 카드사마다 엑셀 파일 구조가 다르고, 이메일로 받는 명세서는 HTML 형식이기 때문에 두 가지 모두 파싱할 수 있어야 합니다.

이번 글에서는 하나카드 HTML 명세서를 분석하면서, 실제 데이터 구조를 파악하는 과정을 공유합니다.

## 카드사 데이터 제공 방식

### 1. 엑셀 파일 (.xlsx)
- 카드사 웹사이트/앱에서 직접 다운로드
- 사용자가 수동으로 업로드
- 구조화된 데이터 (행/열)

### 2. HTML 이메일
- 매월 자동으로 이메일 수신
- Gmail API 연동 시 자동 수집 가능
- 테이블 구조로 데이터 포함

## 하나카드 HTML 명세서 분석

### 파일 정보
```
파일명: hanacard_20260213.html
크기: 367KB
형식: HTML 이메일 명세서
```

### HTML 구조

하나카드 명세서는 다음과 같은 구조로 되어 있습니다:

```html
<table width="690" border="0" cellpadding="0" cellspacing="0">
  <thead>
    <tr>
      <td>이용일자</td>
      <td>이용가맹점(은행)</td>
      <td>이용금액</td>
      <td>할부기간</td>
      <td colspan="3">이번 달 결제하실 금액</td>
      <td>이용혜택</td>
      <td>혜택금액</td>
      <td>결제후잔액</td>
      <td>포인트</td>
    </tr>
  </thead>
  <tbody>
    <!-- 거래 내역 -->
    <tr>
      <td>12/31</td>
      <td>씨유(CU)위브더프라임점</td>
      <td>18,750</td>
      <td></td>
      <td></td>
      <td>18,750</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <!-- 더 많은 거래... -->
  </tbody>
</table>
```

### 추출 가능한 필드

| 필드명 | 예시 데이터 | 비고 |
|--------|-------------|------|
| 이용일자 | 12/31 | MM/DD 형식 (연도 없음) |
| 가맹점명 | 씨유(CU)위브더프라임점 | 원본 그대로 |
| 이용금액 | 18,750 | 쉼표 포함 숫자 |
| 할부기간 | (비어있음) | 일시불은 빈 값 |
| 원금 | 18,750 | 실제 결제 금액 |
| 수수료 | (비어있음) | 할부 수수료 |
| 이용혜택 | (비어있음) | 할인 종류 |
| 혜택금액 | (비어있음) | 할인 금액 |

### 실제 거래 내역 예시

```
12/31  씨유(CU)위브더프라임점      18,750원
01/01  트레이더스 군포점          146,080원
01/01  쿠팡이츠_나이스정보통신     17,900원
```

## HTML 파싱 전략

### 1. 카드사 식별

HTML 파일에서 카드사를 식별하는 방법:

```typescript
// 타이틀 태그로 식별
<title>하나카드 이용대금명세서</title>

// 또는 특정 이미지 URL
<img src="https://em.hanacard.co.kr:1443/images/...">
```

### 2. 테이블 찾기

거래 내역이 담긴 테이블을 찾는 방법:

```typescript
// 헤더에 "이용일자", "이용가맹점" 등이 포함된 테이블
const table = document.querySelector('table');
const headers = table.querySelectorAll('th, td');
// "이용일자" 텍스트가 있는지 확인
```

### 3. 데이터 추출

각 행(row)에서 데이터 추출:

```typescript
const rows = table.querySelectorAll('tbody tr');
rows.forEach(row => {
  const cells = row.querySelectorAll('td');
  const transaction = {
    date: cells[0].textContent.trim(),      // "12/31"
    merchant: cells[1].textContent.trim(),  // "씨유(CU)..."
    amount: cells[2].textContent.trim(),    // "18,750"
  };
});
```

### 4. 데이터 정규화

추출한 데이터를 표준 형식으로 변환:

```typescript
// 날짜 정규화: "12/31" → "2025-12-31"
const normalizeDate = (dateStr: string, year: number) => {
  const [month, day] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// 금액 정규화: "18,750" → 18750
const normalizeAmount = (amountStr: string) => {
  return parseInt(amountStr.replace(/,/g, ''));
};
```

## 엑셀 vs HTML 비교

### 공통점
- 거래 날짜, 가맹점명, 금액은 필수
- 할부 정보 포함
- 카드 종류 정보 포함

### 차이점

| 항목 | 엑셀 | HTML |
|------|------|------|
| 날짜 형식 | YYYY-MM-DD | MM/DD |
| 금액 형식 | 숫자 또는 문자열 | 문자열 (쉼표 포함) |
| 구조 | 행/열 (정형) | 테이블 (비정형) |
| 파싱 난이도 | 쉬움 | 중간 |
| 추가 정보 | 많음 | 제한적 |

## 구현 계획

### Backend 파서 구조

```typescript
// 추상 클래스
abstract class BaseParser {
  abstract identify(content: any): boolean;
  abstract parse(content: any): Transaction[];
}

// 엑셀 파서
class HanaExcelParser extends BaseParser {
  identify(workbook: any): boolean {
    // 엑셀 헤더로 하나카드 식별
  }
  
  parse(workbook: any): Transaction[] {
    // 엑셀 파싱 로직
  }
}

// HTML 파서
class HanaHtmlParser extends BaseParser {
  identify(html: string): boolean {
    // HTML 타이틀/이미지로 하나카드 식별
  }
  
  parse(html: string): Transaction[] {
    // cheerio로 HTML 파싱
  }
}
```

### 필요한 라이브러리

```bash
# 엑셀 파싱
npm install xlsx

# HTML 파싱
npm install cheerio
npm install @types/cheerio
```

## 현대카드 엑셀 분석

하나카드 HTML에 이어 현대카드 엑셀 파일도 분석했습니다.

### 파일 정보
```
파일명: hundai.xlsx
형식: Excel (.xlsx)
```

### 엑셀 구조

현대카드는 상단에 메타 정보가 포함되어 있습니다:

```
행 1: 현대카드 이용내역
행 2: 기준 일자 : 2025년 12월 30일 ~ 2026년 01월 30일
행 3: 회원 정보 : 이*훈 (900303)
행 4: (빈 행)
행 5: [컬럼 헤더] 이용일 | 카드번호 | 가맹점명 | 승인금액 | ...
행 6~: [데이터]
```

### 컬럼 구조

| 컬럼명 | 예시 | 비고 |
|--------|------|------|
| 이용일 | 2026.01.28 | YYYY.MM.DD 형식 |
| 카드번호 | 4049-4700-0662-7012 | 전체 번호 (마스킹 없음) |
| 가맹점명 | 오토케어멤버십 | |
| 승인금액 | 8,900 | 쉼표 포함 |
| 이용금액 | 8,900 | 실제 결제 금액 |
| 부가세 | 0 | |
| 관계 | 본인 | 본인/가족 구분 |
| 할부 | (빈 값) | 일시불은 빈 값 |
| 상태 | 정상 | 정상/취소 |
| 가맹점번호 | 870-452421 | |
| 사업자등록번호 | 214-81-65071 | 현대카드만 제공 |

### 실제 거래 내역 예시

```
2026.01.28  오토케어멤버십           8,900원
2026.01.25  메가박스중앙금정AK...   14,900원
2026.01.25  (주)스마트로-군포...     2,400원
2026.01.25  다이소산본시장점         5,000원
2026.01.24  네이버페이              56,950원
```

### 현대카드 특징

1. **사업자등록번호 제공** - 다른 카드사에 없는 정보
2. **날짜 형식**: 점(`.`)으로 구분 (`YYYY.MM.DD`)
3. **메타 정보**: 상단 3행에 기간, 회원 정보
4. **카드번호 전체 노출** (보안 주의 필요)

## 하나카드 vs 현대카드 비교

| 항목 | 하나카드 (HTML) | 현대카드 (Excel) |
|------|----------------|-----------------|
| 형식 | HTML 테이블 | Excel 파일 |
| 날짜 형식 | MM/DD | YYYY.MM.DD |
| 메타 정보 | HTML 상단 | 엑셀 1-3행 |
| 카드번호 | 마스킹 | 전체 노출 |
| 고유 정보 | - | 사업자등록번호 |
| 파싱 난이도 | 중간 | 쉬움 |

## 다른 카드사는?

현재까지 조사 완료:
- ✅ 하나카드 (HTML 분석 완료)
- ✅ 현대카드 (Excel 분석 완료)
- ⏳ 신한카드 (예정)
- ⏳ 삼성카드 (예정)
- ⏳ KB국민카드 (예정)
- ⏳ 롯데카드 (예정)

각 카드사마다 포맷이 다르기 때문에, 카드사별 파서를 개별적으로 구현해야 합니다.

## 다음 단계

1. **샘플 수집**: 다른 카드사 엑셀/HTML 샘플 수집
2. **포맷 분석**: 각 카드사별 구조 분석 및 문서화
3. **파서 구현**: BaseParser 기반으로 카드사별 파서 구현
4. **테스트**: 실제 데이터로 파싱 테스트

## 다음 포스팅 예고

다음 글에서는 **데이터베이스 스키마 설계**를 다룰 예정입니다.
- ERD (Entity Relationship Diagram)
- 테이블 구조 설계
- Prisma 스키마 작성
- 인덱스 전략

---

**시리즈 목록:**
- [카드 가계부 만들기 #1] 프로젝트 시작
- [카드 가계부 만들기 #2] 카드사 포맷 분석 (현재 글)
- [카드 가계부 만들기 #3] 데이터베이스 설계 (작성 예정)

궁금한 점이나 다른 카드사 정보가 있으시면 댓글로 공유해주세요! 🙌
