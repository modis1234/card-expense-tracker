import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * 사용자 생성 DTO (Data Transfer Object)
 * POST /users 요청 시 사용되는 데이터 구조
 */
export class CreateUserDto {
  /**
   * 사용자 이메일 주소
   * - 이메일 형식이어야 함
   * - 필수 입력 값
   * - 중복 불가 (서비스 레이어에서 검증)
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * 사용자 비밀번호
   * - 최소 6자 이상
   * - 필수 입력 값
   * - bcrypt로 해싱되어 저장됨
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /**
   * 사용자 이름
   * - 선택 입력 값
   * - null 허용
   */
  @IsString()
  @IsOptional()
  name?: string;
}
