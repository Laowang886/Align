//接收浏览器或前端的 HTTP 请求，并把工作交给 Service
//AuthController 接收 email 和 password
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Get,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(dto);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user };
  }
}

// POST /auth/register
// POST /auth/login

// Send registration request:
// POST http://localhost:4000/auth/register
// Content-Type: application/json

// Body:
// {
//   "name": "Wenshuo",
//   "email": "wenshuo@example.com",
//   "password": "secure-password"
// }

// return:
// {
//   "id": "user-id",
//   "name": "Wenshuo",
//   "email": "wenshuo@example.com",
//   "avatarUrl": null,
//   "createdAt": "..."
// }

// not return:
// password
// Because the database stores bcrypt hashes, it must not be returned to the front end.
