import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;

      // Join user-specific room
      client.join(`user:${userId}`);

      // Track connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      console.log(`User ${userId} connected (socket: ${client.id})`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('joinTenant')
  handleJoinTenant(@ConnectedSocket() client: Socket, @MessageBody() data: { tenantId: string }) {
    client.join(`tenant:${data.tenantId}`);
    return { event: 'joined', data: { tenantId: data.tenantId } };
  }

  @SubscribeMessage('joinClass')
  handleJoinClass(@ConnectedSocket() client: Socket, @MessageBody() data: { classId: string }) {
    client.join(`class:${data.classId}`);
    return { event: 'joined', data: { classId: data.classId } };
  }

  // ============ NOTIFICATION METHODS ============

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  sendAttendanceUpdate(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('attendanceUpdate', data);
  }

  sendDailyReportPublished(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('dailyReportPublished', data);
  }

  sendNewMessage(userId: string, message: any) {
    this.server.to(`user:${userId}`).emit('newMessage', message);
  }

  sendAnnouncementToTenant(tenantId: string, announcement: any) {
    this.server.to(`tenant:${tenantId}`).emit('announcement', announcement);
  }

  sendInvoiceUpdate(userId: string, invoice: any) {
    this.server.to(`user:${userId}`).emit('invoiceUpdate', invoice);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && (this.connectedUsers.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }
}
