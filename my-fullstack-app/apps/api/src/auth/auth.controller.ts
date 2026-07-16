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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; name: string; avatarUrl: string | null };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 1000 : 3,
      ttl: 60000,
    },
  }) // Registration is more stringent, with a maximum of 3 attempts within 60 seconds.
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    //this code gets the JWT token from the AuthService and sets it as a cookie in the response. The cookie is set to be HTTP-only, secure (in production), and has a max age of 7 days.
    const result = await this.authService.register(dto);
    //this line of code send the JWT token to the client as a cookie named 'token'. The cookie is set to be HTTP-only, secure (in production), and has a max age of 7 days. This allows the client to automatically send the token with subsequent requests, enabling authentication without requiring the user to manually include the token in each request.
    this.setAuthCookie(res, result.accessToken);
    //this line of code returns the user object from the registration result to the client. The user object typically contains information about the newly registered user, such as their ID, email, name, and avatar URL. This allows the client to have immediate access to the user's information after successful registration.
    return { user: result.user };
  }

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
      ttl: 60000,
    },
  }) // Maximum 5 times within 60 seconds
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('logout') //@Post('logout'): Defines this as a route for a POST request with the path /auth/logout.
  @HttpCode(HttpStatus.NO_CONTENT) //Set the response status code to 204. 204 means "success, but no data was returned".
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  private setAuthCookie(res: Response, accessToken: string) {
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
