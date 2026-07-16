//check for the format of the email and password
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { RegisterInput } from '@repo/shared';

export class RegisterDto implements RegisterInput {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long.' })
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;
}
