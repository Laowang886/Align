// apps/api/src/users/dto/update-profile.dto.ts
import { IsString, IsOptional } from 'class-validator';
import type { UpdateProfileInput } from '@repo/shared';

export class UpdateProfileDto implements UpdateProfileInput {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarColor?: string;
}
