import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { UpdateNotificationPreferencesInput } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.list(user.id, {
      page: parsePositiveInt(page),
      pageSize: parsePositiveInt(pageSize),
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Get('preferences')
  preferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.notifications.updatePreferences(
      user.id,
      parseUpdatePreferences(body),
    );
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return { updated: await this.notifications.markAllRead(user.id) };
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.markRead(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.remove(user.id, id);
  }
}

const preferenceKeys = [
  'notificationsEnabled',
  'kanbanNotificationsEnabled',
  'chatNotificationsEnabled',
] as const;

function parseUpdatePreferences(
  value: unknown,
): UpdateNotificationPreferencesInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Notification preferences are required');
  }
  const body = value as Record<string, unknown>;
  const unknownKeys = Object.keys(body).filter(
    (key) => !preferenceKeys.includes(key as (typeof preferenceKeys)[number]),
  );
  if (unknownKeys.length > 0) {
    throw new BadRequestException(`Unknown preference: ${unknownKeys[0]}`);
  }
  const input: UpdateNotificationPreferencesInput = {};
  for (const key of preferenceKeys) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'boolean') {
      throw new BadRequestException(`${key} must be a boolean`);
    }
    input[key] = body[key];
  }
  if (Object.keys(input).length === 0) {
    throw new BadRequestException('At least one preference is required');
  }
  return input;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
