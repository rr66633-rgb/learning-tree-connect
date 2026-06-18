import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async getUserNotifications(tenantId: string, userId: string, query?: { unreadOnly?: boolean; limit?: number }) {
    const where: any = { tenantId, userId };
    if (query?.unreadOnly) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 50,
    });
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ============ NOTIFICATION CREATORS ============

  async sendNotification(tenantId: string, userId: string, data: {
    title: string;
    titleAr?: string;
    body: string;
    bodyAr?: string;
    type: NotificationType;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        title: data.title,
        titleAr: data.titleAr,
        body: data.body,
        bodyAr: data.bodyAr,
        type: data.type,
        data: data.metadata || {},
      },
    });

    // Send real-time via WebSocket
    this.eventsGateway.sendNotificationToUser(userId, notification);

    return notification;
  }

  async notifyAttendanceCheckIn(tenantId: string, childId: string, childName: string, time: string) {
    // Find parents of this child
    const parentLinks = await this.prisma.parentChild.findMany({
      where: { childId },
      select: { parentId: true },
    });

    for (const link of parentLinks) {
      await this.sendNotification(tenantId, link.parentId, {
        title: 'Attendance Check-In',
        titleAr: 'تسجيل حضور',
        body: `${childName} checked in at ${time}`,
        bodyAr: `تم تسجيل حضور ${childName} الساعة ${time}`,
        type: 'ATTENDANCE',
        metadata: { childId },
      });
    }
  }

  async notifyAttendanceCheckOut(tenantId: string, childId: string, childName: string, time: string) {
    const parentLinks = await this.prisma.parentChild.findMany({
      where: { childId },
      select: { parentId: true },
    });

    for (const link of parentLinks) {
      await this.sendNotification(tenantId, link.parentId, {
        title: 'Attendance Check-Out',
        titleAr: 'تسجيل انصراف',
        body: `${childName} checked out at ${time}`,
        bodyAr: `تم تسجيل انصراف ${childName} الساعة ${time}`,
        type: 'ATTENDANCE',
        metadata: { childId },
      });
    }
  }

  async notifyDailyReportPublished(tenantId: string, childId: string, childName: string, reportId: string) {
    const parentLinks = await this.prisma.parentChild.findMany({
      where: { childId },
      select: { parentId: true },
    });

    for (const link of parentLinks) {
      await this.sendNotification(tenantId, link.parentId, {
        title: 'Daily Report Ready',
        titleAr: 'التقرير اليومي جاهز',
        body: `${childName}'s daily report is now available`,
        bodyAr: `التقرير اليومي لـ ${childName} جاهز الآن`,
        type: 'DAILY_REPORT',
        metadata: { childId, reportId },
      });
    }
  }

  async notifyNewInvoice(tenantId: string, parentId: string, invoiceNumber: string, amount: number) {
    await this.sendNotification(tenantId, parentId, {
      title: 'New Invoice',
      titleAr: 'فاتورة جديدة',
      body: `Invoice ${invoiceNumber} for SAR ${amount} has been issued`,
      bodyAr: `تم إصدار الفاتورة ${invoiceNumber} بمبلغ ${amount} ريال`,
      type: 'INVOICE',
      metadata: { invoiceNumber, amount },
    });
  }

  async notifyNewMessage(tenantId: string, receiverId: string, senderName: string) {
    await this.sendNotification(tenantId, receiverId, {
      title: 'New Message',
      titleAr: 'رسالة جديدة',
      body: `You have a new message from ${senderName}`,
      bodyAr: `لديك رسالة جديدة من ${senderName}`,
      type: 'MESSAGE',
      metadata: {},
    });
  }

  async notifyAnnouncement(tenantId: string, title: string, titleAr: string, targetRole?: string) {
    // Get all users in tenant matching role
    const where: any = { tenantId, isActive: true };
    if (targetRole) {
      where.role = targetRole;
    }

    const tenantUsers = await this.prisma.tenantUser.findMany({
      where,
      select: { userId: true },
    });

    for (const tu of tenantUsers) {
      await this.sendNotification(tenantId, tu.userId, {
        title: 'New Announcement',
        titleAr: 'إعلان جديد',
        body: title,
        bodyAr: titleAr || title,
        type: 'ANNOUNCEMENT',
        metadata: {},
      });
    }
  }
}
