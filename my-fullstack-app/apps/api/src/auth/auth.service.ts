// 认证的核心业务逻辑，例如：
// 查询用户是否已存在
// 使用 bcrypt 加密密码
// 创建 User
// 比较登录密码
// 签发 JWT token
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Search for the user in the database by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    // 3. Generate a JWT token for the authenticated user
    // The payload typically includes the user's ID and email, which can be used to identify the user in subsequent requests. The token is signed using the JwtService, which ensures that it can be verified later.
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    // 4. return the token and user information (excluding the password) to the client. The password is omitted from the response for security reasons, ensuring that sensitive information is not exposed.
    const { password, ...safeUser } = user;
    void password; // Do not send the password hash to the client.
    return {
      token,
      user: safeUser,
    };
  }
}
