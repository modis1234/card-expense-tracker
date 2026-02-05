import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async googleLogin(req: any) {
    if (!req.user) {
      return { message: 'No user from google' };
    }

    const { googleId, email, name, picture } = req.user;

    // 기존 사용자 확인 또는 새 사용자 생성
    let user = await this.usersService.findByGoogleId(googleId);
    
    if (!user) {
      user = await this.usersService.findByEmail(email);
      
      if (user) {
        // 이메일은 있지만 Google ID가 없는 경우 업데이트
        user = await this.usersService.updateGoogleId(user.id, googleId, picture);
      } else {
        // 완전히 새로운 사용자 생성
        user = await this.usersService.createGoogleUser({
          googleId,
          email,
          name,
          picture,
        });
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: (user as any).picture || null,
      },
    };
  }
}
