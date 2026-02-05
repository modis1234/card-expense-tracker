import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({
    description: '사용자 고유 ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'user@example.com',
  })
  email: string;
  
  @Exclude()
  password: string | null;
  
  @ApiProperty({
    description: '사용자 이름',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Google 사용자 ID',
    example: '1234567890',
    nullable: true,
  })
  googleId?: string | null;

  @ApiProperty({
    description: '프로필 사진 URL',
    example: 'https://lh3.googleusercontent.com/...',
    nullable: true,
  })
  picture?: string | null;

  @ApiProperty({
    description: '인증 제공자',
    example: 'google',
    default: 'local',
  })
  provider?: string | null;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
