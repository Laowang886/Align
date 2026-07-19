// apps/api/src/users/users.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { provider: true },
    });
    const data: Record<string, string> = {};

    if (dto.name) data.name = dto.name;

    if (dto.avatarColor) {
      if (user?.provider === 'google' || user?.provider === 'github') {
        throw new ForbiddenException(
          'Avatar colors are managed by your sign-in provider.',
        );
      }
      data.avatarColor = dto.avatarColor;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    const { passwordHash, ...safeUser } = updatedUser;
    void passwordHash;
    return safeUser;
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.deleteMany({ where: { ownerId: userId } });
      await tx.wikiDocument.deleteMany({
        where: {
          OR: [{ createdById: userId }, { updatedById: userId }],
        },
      });
      await tx.message.deleteMany({ where: { authorId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
