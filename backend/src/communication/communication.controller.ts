import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('communication')
@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ===== MESSAGES =====

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  getConversations(@Headers('x-tenant-id') tenantId: string, @Request() req) {
    return this.communicationService.getConversations(tenantId, req.user.userId);
  }

  @Get('messages/:partnerId')
  @ApiOperation({ summary: 'Get messages with a specific user' })
  getMessages(
    @Headers('x-tenant-id') tenantId: string,
    @Param('partnerId') partnerId: string,
    @Request() req,
  ) {
    return this.communicationService.getMessages(tenantId, req.user.userId, partnerId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  sendMessage(@Headers('x-tenant-id') tenantId: string, @Body() data: any, @Request() req) {
    return this.communicationService.sendMessage(tenantId, req.user.userId, data);
  }

  // ===== ANNOUNCEMENTS =====

  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  getAnnouncements(@Headers('x-tenant-id') tenantId: string) {
    return this.communicationService.getAnnouncements(tenantId);
  }

  @Post('announcements')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create an announcement' })
  createAnnouncement(@Headers('x-tenant-id') tenantId: string, @Body() data: any, @Request() req) {
    return this.communicationService.createAnnouncement(tenantId, req.user.userId, data);
  }

  // ===== NOTIFICATIONS =====

  @Get('notifications')
  @ApiOperation({ summary: 'Get notifications for current user' })
  getNotifications(@Headers('x-tenant-id') tenantId: string, @Request() req) {
    return this.communicationService.getNotifications(tenantId, req.user.userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @Request() req) {
    return this.communicationService.markNotificationRead(id, req.user.userId);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Headers('x-tenant-id') tenantId: string, @Request() req) {
    return this.communicationService.markAllNotificationsRead(tenantId, req.user.userId);
  }

  // ===== EVENTS =====

  @Get('events')
  @ApiOperation({ summary: 'Get events' })
  getEvents(@Headers('x-tenant-id') tenantId: string, @Query('month') month?: string) {
    return this.communicationService.getEvents(tenantId, month);
  }

  @Post('events')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create an event' })
  createEvent(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.communicationService.createEvent(tenantId, data);
  }
}
