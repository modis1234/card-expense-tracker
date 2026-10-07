import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS 설정
  app.enableCors();
  
  // 전역 Validation Pipe 설정
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,      // DTO에 없는 속성 제거
    transform: true,      // 자동 타입 변환
  }));
  
  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Card Expense Tracker API')
    .setDescription('카드 지출 관리 시스템 API 문서')
    .setVersion('1.0')
    .addTag('auth', '인증/인가 (Google OAuth → JWT 발급)')
    .addTag('users', '사용자 관리')
    .addTag('card-companies', '카드사 관리')
    .addTag('card-groups', '카드 그룹 관리 (개인/모임 등 목적별 묶음)')
    .addTag('cards', '내 카드 관리 (카드번호 끝 4자리 + 그룹 지정)')
    .addTag('transactions', '거래 내역 조회')
    .addTag('files', '카드 이용내역 엑셀 업로드')
    .addTag('gmail', 'Gmail 카드 승인 메일 동기화')
    .addBearerAuth() // JWT 인증 추가
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침 시 인증 정보 유지
    },
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger API docs available at http://localhost:${port}/api`);
}
bootstrap();
