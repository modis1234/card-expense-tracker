import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth 로그인 시작',
    description: '브라우저에서 직접 접속하세요: http://localhost:3000/auth/google\n\nSwagger UI에서는 CORS 제한으로 테스트할 수 없습니다.'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Google 로그인 페이지로 리디렉션' 
  })
  async googleAuth(@Req() req: any) {
    // Google 로그인 페이지로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth 콜백',
    description: 'Google 인증 후 자동으로 호출되는 엔드포인트. FRONTEND_URL이 설정되어 있으면 {FRONTEND_URL}/auth/callback#token=... 으로 리디렉션하고, 없으면 JSON을 반환합니다.'
  })
  @ApiResponse({ status: 302, description: 'FRONTEND_URL 설정 시 프론트엔드로 리디렉션' })
  @ApiResponse({ 
    status: 200, 
    description: 'JWT 토큰과 사용자 정보 반환',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid',
          email: 'user@gmail.com',
          name: 'John Doe',
          picture: 'https://lh3.googleusercontent.com/...'
        }
      }
    }
  })
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const token = 'accessToken' in result ? result.accessToken : undefined;
    if (!frontendUrl || !token) return res.json(result);
    // fragment로 전달해 서버 로그·Referer에 토큰이 남지 않게 함
    return res.redirect(`${frontendUrl}/auth/callback#token=${encodeURIComponent(token)}`);
  }
}
