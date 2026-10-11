import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { gmail_v1, google } from 'googleapis';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';

// 하나카드 이용대금명세서 메일 (본문이 명세서 HTML 그 자체)
// ponytail: 최근 1년 12통까지만 조회, 다른 카드사 명세서 메일은 파서가 생기면 쿼리에 추가
const STATEMENT_QUERY = '이용대금명세서 (from:hanacard.co.kr OR 하나카드) newer_than:1y';
const MAX_MESSAGES = 12;

export interface GmailImportResult {
  scanned: number;
  imported: { subject: string; count: number }[];
  skipped: { subject: string; reason: string }[];
}

@Injectable()
export class GmailService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  // 로그인한 Google 계정의 명세서 메일을 찾아 업로드와 같은 경로(parseAndSaveFile)로 저장
  async importStatements(userId: string): Promise<GmailImportResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.gmailAccessToken) {
      throw new BadRequestException('Gmail 연동이 필요합니다. Google 로그인을 다시 해주세요.');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );
    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken || undefined,
    });
    // access token(1시간) 만료 시 refresh token으로 갱신된 값을 저장해 다음 호출에 재사용
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        this.prisma.user
          .update({ where: { id: userId }, data: { gmailAccessToken: tokens.access_token } })
          .catch(() => undefined);
      }
    });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let messages: gmail_v1.Schema$Message[];
    try {
      const list = await gmail.users.messages.list({
        userId: 'me',
        q: STATEMENT_QUERY,
        maxResults: MAX_MESSAGES,
      });
      messages = list.data.messages ?? [];
    } catch {
      // 토큰 만료·권한 철회 등. 401을 그대로 넘기면 프론트가 앱 로그아웃으로 처리하므로 400으로 안내
      throw new BadRequestException('Gmail에 접근할 수 없습니다. Google 로그인을 다시 해주세요.');
    }

    const result: GmailImportResult = { scanned: messages.length, imported: [], skipped: [] };
    for (const { id } of messages) {
      if (!id) continue;
      const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const subject =
        data.payload?.headers?.find((h) => h.name === 'Subject')?.value ?? '(제목 없음)';
      const html = data.payload && (await findStatementHtml(gmail, id, data.payload));
      if (!html) {
        result.skipped.push({
          subject,
          reason: '본문·첨부에서 명세서 HTML을 찾지 못했습니다 (보안메일일 수 있음).',
        });
        continue;
      }
      try {
        const buffer = Buffer.from(html, 'utf8');
        const count = await this.filesService.parseAndSaveFile(buffer, userId, {
          filename: `gmail-${id}`,
          originalName: `${subject}.html`,
          fileSize: buffer.length,
        });
        result.imported.push({ subject, count });
      } catch (error) {
        // 중복(409)·파싱 실패(400) 등은 해당 메일만 건너뜀
        if (!(error instanceof HttpException)) throw error;
        result.skipped.push({ subject, reason: error.message });
      }
    }
    return result;
  }
}

// 명세서 HTML이면 반드시 있는 이용기간 문구 (parseHanaHtml이 찾는 것과 같음)
const STATEMENT_MARKER = '일시불 및 할부';

// 원본 메일은 본문이, 전달(FW) 메일은 .html 첨부가 명세서라 모든 HTML 파트를 확인해 명세서인 것을 고름
// 첨부는 본문에 데이터가 없어 attachmentId로 따로 받아옴
async function findStatementHtml(
  gmail: gmail_v1.Gmail,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart,
): Promise<string | null> {
  for (const part of htmlParts(payload)) {
    const attachmentId = part.body?.attachmentId;
    const data =
      part.body?.data ??
      (attachmentId &&
        (await gmail.users.messages.attachments.get({ userId: 'me', messageId, id: attachmentId }))
          .data.data);
    if (!data) continue;
    const html = decode(Buffer.from(data, 'base64url'), part);
    if (html?.includes(STATEMENT_MARKER)) return html;
  }
  return null;
}

function htmlParts(part: gmail_v1.Schema$MessagePart): gmail_v1.Schema$MessagePart[] {
  const isHtml = part.mimeType === 'text/html' || /\.html?$/i.test(part.filename ?? '');
  return [...(isHtml ? [part] : []), ...(part.parts ?? []).flatMap(htmlParts)];
}

// 선언된 charset으로 디코딩, charset이 없으면 UTF-8 → EUC-KR 순으로 명세서 문구가 보이는 쪽 사용
function decode(bytes: Buffer, part: gmail_v1.Schema$MessagePart): string | null {
  const contentType =
    part.headers?.find((h) => h.name?.toLowerCase() === 'content-type')?.value ?? '';
  const declared = contentType.match(/charset="?([\w-]+)/i)?.[1];
  for (const charset of declared ? [declared] : ['utf-8', 'euc-kr']) {
    try {
      const text = new TextDecoder(charset).decode(bytes);
      if (declared || text.includes(STATEMENT_MARKER)) return text;
    } catch {
      // 지원하지 않는 charset 이름이면 다음 후보로
    }
  }
  return null;
}
