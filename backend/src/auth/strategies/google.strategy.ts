import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * Google OAuth 인증 전략
 * 
 * Passport의 Google OAuth 전략을 NestJS에서 사용할 수 있도록 래핑한 클래스입니다.
 * 사용자가 Google 로그인을 완료하면 자동으로 validate() 메서드가 호출됩니다.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    // super()를 통해 부모 클래스(Strategy)에 Google OAuth 설정을 전달
    super({
      // Google Cloud Console에서 발급받은 클라이언트 ID
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      
      // Google Cloud Console에서 발급받은 클라이언트 시크릿
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      
      // Google 로그인 후 돌아올 URL (Google Cloud Console에 등록된 URL과 일치해야 함)
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      
      // Google에 요청할 사용자 정보 범위
      // 'email': 이메일 주소
      // 'profile': 이름, 프로필 사진 등
      scope: ['email', 'profile'],
    });
  }

  /**
   * Google 로그인 성공 시 자동으로 호출되는 메서드
   * 
   * @param accessToken - Google API 호출에 사용할 수 있는 액세스 토큰
   * @param refreshToken - 액세스 토큰 갱신에 사용하는 리프레시 토큰
   * @param profile - Google에서 받아온 사용자 프로필 정보
   * @param done - Passport에게 인증 결과를 전달하는 콜백 함수
   * 
   * 동작 순서:
   * 1. 사용자가 /auth/google 접속
   * 2. Google 로그인 페이지로 리디렉션
   * 3. 사용자가 Google 계정으로 로그인
   * 4. Google이 /auth/google/callback으로 리디렉션
   * 5. 이 validate() 메서드가 자동으로 호출됨
   * 6. 반환된 user 객체가 req.user에 저장됨
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Google 프로필에서 필요한 정보 추출
    const { id, name, emails, photos } = profile;
    
    // 우리 시스템에서 사용할 사용자 객체 생성
    const user = {
      googleId: id,                                    // Google 사용자 고유 ID
      email: emails[0].value,                          // 이메일 주소
      name: `${name.givenName} ${name.familyName}`,   // 전체 이름 (성 + 이름)
      picture: photos[0].value,                        // 프로필 사진 URL
      accessToken,                                     // Google API 호출용 토큰
    };
    
    // done(null, user)를 호출하면:
    // - 첫 번째 인자(null): 에러가 없음을 의미
    // - 두 번째 인자(user): 인증된 사용자 정보
    // - 이 user 객체가 컨트롤러의 req.user로 전달됨
    done(null, user);
  }
}

/**
 * 전체 흐름 예시:
 * 
 * 1. 사용자가 브라우저에서 http://localhost:3000/auth/google 접속
 * 
 * 2. GoogleStrategy의 설정(clientID, callbackURL 등)을 사용하여
 *    Google 로그인 페이지로 리디렉션
 *    예: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
 * 
 * 3. 사용자가 Google 계정으로 로그인하고 권한 승인
 * 
 * 4. Google이 http://localhost:3000/auth/google/callback?code=xxx 로 리디렉션
 * 
 * 5. Passport가 자동으로 code를 사용하여 Google에서 사용자 정보 가져옴
 * 
 * 6. validate() 메서드가 호출되어 사용자 정보를 우리 형식으로 변환
 * 
 * 7. 변환된 user 객체가 AuthController의 req.user로 전달됨
 * 
 * 8. AuthService.googleLogin(req)에서 req.user를 사용하여
 *    데이터베이스에 사용자 저장 및 JWT 토큰 생성
 */
