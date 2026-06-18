import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getByDate(tenantId: string, date: string, classId?: string) {
    const where: any = {
      tenantId,
      date: new Date(date),
    };

    if (classId) {
      const childIds = await this.prisma.classAssignment.findMany({
        where: { classId },
        select: { childId: true },
      });
      where.childId = { in: childIds.map((c) => c.childId) };
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { child: { firstName: 'asc' } },
    });
  }

  async getChildAttendance(tenantId: string, childId: string, startDate: string, endDate: string) {
    return this.prisma.attendance.findMany({
      where: {
        tenantId,
        childId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async checkIn(tenantId: string, childId: string, userId: string, qrCode?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendance.findFirst({
      where: { childId, date: today, tenantId },
    });

    if (existing && existing.checkInTime) {
      throw new ConflictException('Child already checked in today');
    }

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: 'PRESENT',
          checkInTime: new Date(),
          checkedInBy: userId,
          qrCode,
        },
      });
    }

    return this.prisma.attendance.create({
      data: {
        tenantId,
        childId,
        date: today,
        status: 'PRESENT',
        checkInTime: new Date(),
        checkedInBy: userId,
        qrCode,
      },
    });
  }

  async checkOut(tenantId: string, childId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findFirst({
      where: { childId, date: today, tenantId },
    });

    if (!attendance) {
      throw new NotFoundException('No check-in record found for today');
    }

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: new Date(),
        checkedOutBy: userId,
      },
    });
  }

  async markAbsent(tenantId: string, childId: string, date: string, notes?: string) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    return this.prisma.attendance.upsert({
      where: { childId_date: { childId, date: dateObj } },
      update: { status: 'ABSENT', notes },
      create: {
        tenantId,
        childId,
        date: dateObj,
        status: 'ABSENT',
        notes,
      },
    });
  }

  async bulkMarkAttendance(tenantId: string, date: string, records: { childId: string; status: string }[]) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const operations = records.map((record) =>
      this.prisma.attendance.upsert({
        where: { childId_date: { childId: record.childId, date: dateObj } },
        update: { status: record.status as any },
        create: {
          tenantId,
          childId: record.childId,
          date: dateObj,
          status: record.status as any,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async getDailyReport(tenantId: string, date: string) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const [total, present, absent, late] = await Promise.all([
      this.prisma.child.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.attendance.count({ where: { tenantId, date: dateObj, status: 'PRESENT' } }),
      this.prisma.attendance.count({ where: { tenantId, date: dateObj, status: 'ABSENT' } }),
      this.prisma.attendance.count({ where: { tenantId, date: dateObj, status: 'LATE' } }),
    ]);

    return {
      date,
      totalChildren: total,
      present,
      absent,
      late,
      notMarked: total - present - absent - late,
      attendanceRate: total > 0 ? ((present + late) / total * 100).toFixed(1) : '0',
    };
  }
}
