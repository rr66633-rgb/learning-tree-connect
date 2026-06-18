import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  // ===== MESSAGES =====

  async getConversations(tenantId: string, userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner
    const conversations = new Map();
    messages.forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partnerId,
          partner: msg.senderId === userId ? msg.receiver : msg.sender,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      if (msg.receiverId === userId && !msg.isRead) {
        const conv = conversations.get(partnerId);
        conv.unreadCount++;
      }
    });

    return Array.from(conversations.values());
  }

  async getMessages(tenantId: string, userId: string, partnerId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark as read
    await this.prisma.message.updateMany({
      where: {
        tenantId,
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  async sendMessage(tenantId: string, senderId: string, data: any) {
    return this.prisma.message.create({
      data: {
        tenantId,
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || 'TEXT',
      },
    });
  }

  // ===== ANNOUNCEMENTS =====

  async getAnnouncements(tenantId: string) {
    return this.prisma.announcement.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(tenantId: string, authorId: string, data: any) {
    return this.prisma.announcement.create({
      data: {
        tenantId,
        title: data.title,
        titleAr: data.titleAr,
        content: data.content,
        contentAr: data.contentAr,
        authorId,
        targetRole: data.targetRole,
        isPublished: data.isPublished !== false,
      },
    });
  }

  // ===== NOTIFICATIONS =====

  async getNotifications(tenantId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(tenantId: string, data: any) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId: data.userId,
        title: data.title,
        titleAr: data.titleAr,
        body: data.body,
        bodyAr: data.bodyAr,
        type: data.type,
        data: data.metadata || {},
      },
    });
  }

  // ===== EVENTS =====

  async getEvents(tenantId: string, month?: string) {
    const where: any = { tenantId };

    if (month) {
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      where.startDate = { gte: startOfMonth, lte: endOfMonth };
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  async createEvent(tenantId: string, data: any) {
    return this.prisma.event.create({
      data: {
        tenantId,
        title: data.title,
        titleAr: data.titleAr,
        description: data.description,
        descriptionAr: data.descriptionAr,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        location: data.location,
        isAllDay: data.isAllDay || false,
      },
    });
  }
}
