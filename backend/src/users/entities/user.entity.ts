import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  
  @Exclude()
  password: string;
  
  name: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
