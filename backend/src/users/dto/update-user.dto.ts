import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * 사용자 수정 DTO (Data Transfer Object)
 * PATCH /users/:id 요청 시 사용되는 데이터 구조
 * 모든 필드가 선택적이므로 부분 업데이트 가능
 */
export class UpdateUserDto {
  /**
   * 사용자 이메일 주소
   * - 이메일 형식이어야 함
   * - 선택 입력 값
   * - 중복 불가 (서비스 레이어에서 검증)
   */
  @IsEmail()
  @IsOptional()
  email?: string;

  /**
   * 사용자 비밀번호
   * - 최소 6자 이상
   * - 선택 입력 값
   * - 제공 시 bcrypt로 해싱되어 저장됨
   */
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  /**
   * 사용자 이름
   * - 선택 입력 값
   */
  @IsString()
  @IsOptional()
  name?: string;
}
