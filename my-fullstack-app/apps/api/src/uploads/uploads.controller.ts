// apps/api/src/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  Req,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync, promises as fs } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_UPLOAD_ROOT = resolve(__dirname, '../../uploads/avatars');

mkdirSync(AVATAR_UPLOAD_ROOT, { recursive: true });

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('uploads')
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATAR_UPLOAD_ROOT,
        filename: (req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only JPEG, PNG, WEBP, or GIF images are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { provider: true },
    });
    if (user?.provider === 'google' || user?.provider === 'github') {
      await fs.unlink(file.path).catch(() => undefined);
      throw new BadRequestException(
        'Profile photos are managed by your sign-in provider.',
      );
    }

    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const avatarUrl = `${apiUrl.replace(/\/$/, '')}/uploads/avatars/${file.filename}`;
    return this.prisma.user.update({
      where: { id: request.user.id },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        avatarColor: true,
        provider: true,
      },
    });
  }
}
