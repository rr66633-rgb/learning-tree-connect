import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ===== STAFF RECORDS =====

  async getStaffRecords(tenantId: string) {
    return this.prisma.staffRecord.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    });
  }

  async getStaffRecord(id: string) {
    const record = await this.prisma.staffRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Staff record not found');
    }

    return record;
  }

  async createStaffRecord(tenantId: string, data: any) {
    return this.prisma.staffRecord.create({
      data: {
        tenantId,
        userId: data.userId,
        employeeId: data.employeeId,
        department: data.department,
        position: data.position,
        hireDate: new Date(data.hireDate),
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        salary: data.salary ? parseFloat(data.salary) : null,
        iqamaNumber: data.iqamaNumber,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
      },
    });
  }

  async updateStaffRecord(id: string, data: any) {
    return this.prisma.staffRecord.update({
      where: { id },
      data: {
        department: data.department,
        position: data.position,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        iqamaNumber: data.iqamaNumber,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
      },
    });
  }

  // ===== LEAVE REQUESTS =====

  async getLeaveRequests(tenantId: string, query?: { userId?: string; status?: string }) {
    const where: any = { tenantId };
    if (query?.userId) where.userId = query.userId;
    if (query?.status) where.status = query.status;

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveRequest(tenantId: string, userId: string, data: any) {
    return this.prisma.leaveRequest.create({
      data: {
        tenantId,
        userId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
  }

  async approveLeaveRequest(id: string, approvedBy: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy },
    });
  }

  async rejectLeaveRequest(id: string, approvedBy: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy },
    });
  }
}
