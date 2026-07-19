//check for the format of the email and password
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { LoginInput } from '@repo/shared'; 

export class LoginDto implements LoginInput {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;
}
