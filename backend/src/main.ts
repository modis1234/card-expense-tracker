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
    .addTag('users', '사용자 관리')
    .addTag('auth', '인증/인가')
    .addTag('categories', '카테고리 관리')
    .addTag('transactions', '거래 내역 관리')
    .addTag('files', '파일 업로드')
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
