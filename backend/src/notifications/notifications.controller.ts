import { Controller, Get, Patch, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(tenantId, req.user.id, { unreadOnly, limit });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
  ) {
    return this.notificationsService.getUnreadCount(tenantId, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
  ) {
    return this.notificationsService.markAllAsRead(tenantId, req.user.id);
  }
}
