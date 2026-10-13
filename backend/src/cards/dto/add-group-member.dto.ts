import { IsEmail } from 'class-validator';

export class AddGroupMemberDto {
  /**
   * 공유할 사용자 이메일 (Google 로그인으로 가입된 계정)
   * @example 'family@gmail.com'
   */
  @IsEmail()
  email: string;
}
