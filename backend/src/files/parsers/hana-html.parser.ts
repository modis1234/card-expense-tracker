import * as cheerio from 'cheerio';

export interface StatementRow {
  date: Date;
  merchantName: string;
  amount: number;
  last4: string | null;
  installmentMonths?: number;
  installmentRound?: number;
  /** amount와 다를 때만: 할부 전체 금액, 할인·부분취소 전 이용금액 */
  originalAmount?: number;
}

// 하나카드 이용대금명세서 메일(HTML) 파서
// - 이용상세 표: 11칸 행 중 첫 칸이 MM/DD인 행이 거래 (할인 하위 행·소계·합계는 형태가 달라 제외됨)
// - 카드정보 행: "... 하나카드 MASTER2583 _결제계좌:..." → 이후 거래 행의 카드 끝 4자리
// - 날짜에 연도가 없어 '이용기간 일시불 및 할부: ... ~ YYYY. MM. DD' 종료일 기준으로 연도를 붙임 (1월 명세서에 12/31 이용분 포함)
//   ponytail: 종료월보다 큰 달만 전년도로 봄, 12개월 넘은 장기 할부 회차는 연도가 틀릴 수 있음
// - 금액은 '이번 달 결제하실 금액'(원금 + 수수료). 이용금액을 쓰면 할부가 매달 전액으로 중복 집계됨
//   원금은 할인·부분취소가 반영된 값이라, 별도 취소 행(원금 빈칸)은 0원이 되어 합계가 '입금하실 금액'과 일치
// - 칸 순서: 이용일자, 가맹점, 이용금액, 할부기간, 회차, 원금, 수수료, 이용혜택, 혜택금액, 결제후잔액, 포인트
// ponytail: 별도 '매출취소' 표(전월 이용분 취소)는 반영 안 함, 필요하면 6칸 행을 같은 방식으로 추가
export function parseHanaHtml(html: string): StatementRow[] {
  const $ = cheerio.load(html);
  const text = (el: any) => $(el).text().replace(/\s+/g, ' ').trim();

  const period = text('body').match(
    /일시불 및 할부\s*:\s*\d{4}\.\s*\d{2}\.\s*\d{2}\s*~\s*(\d{4})\.\s*(\d{2})\.\s*\d{2}/,
  );
  if (!period) throw new Error('명세서에서 이용기간을 찾을 수 없습니다.');
  const endYear = Number(period[1]);
  const endMonth = Number(period[2]);

  const rows: StatementRow[] = [];
  let last4: string | null = null;
  $('tr').each((_, tr) => {
    const tds = $(tr).children('td');
    if (tds.length === 1) {
      // '^\(' 로 고정해 표 전체를 감싼 바깥 레이아웃 행은 제외
      const card = text(tds[0]).match(/^\(.*?[A-Z]+(\d{4})\s*_결제계좌/);
      if (card) last4 = card[1];
      return;
    }
    if (tds.length !== 11) return;

    const md = text(tds[0]).match(/^(\d{2})\/(\d{2})$/);
    const merchantName = text(tds[1]);
    if (!md || !merchantName) return;

    const month = Number(md[1]);
    const year = month > endMonth ? endYear - 1 : endYear;
    const [usedAmount, months, round, principal, fee] = [2, 3, 4, 5, 6].map((i) => text(tds[i]));
    const amount = toWon(principal) + toWon(fee);
    const originalAmount = toWon(usedAmount);
    rows.push({
      date: new Date(Date.UTC(year, month - 1, Number(md[2]))),
      merchantName,
      amount,
      last4,
      installmentMonths: months ? Number(months) : undefined,
      installmentRound: months ? Number(round) : undefined,
      originalAmount: originalAmount !== amount ? originalAmount : undefined,
    });
  });
  return rows;
}

function toWon(value: string): number {
  return Number(value.replace(/[^0-9-]/g, '')) || 0;
}
