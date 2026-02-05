import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    description: 'Google 인증 후 자동으로 호출되는 엔드포인트'
  })
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
  async googleAuthRedirect(@Req() req: any) {
    return this.authService.googleLogin(req);
  }
}
