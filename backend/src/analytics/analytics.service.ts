import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getEnrollmentStats(tenantId: string) {
    const [total, active, inactive, graduated] = await Promise.all([
      this.prisma.child.count({ where: { tenantId } }),
      this.prisma.child.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.child.count({ where: { tenantId, status: 'INACTIVE' } }),
      this.prisma.child.count({ where: { tenantId, status: 'GRADUATED' } }),
    ]);

    // Monthly enrollment trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyEnrollments = await this.prisma.child.groupBy({
      by: ['enrollmentDate'],
      where: {
        tenantId,
        enrollmentDate: { gte: twelveMonthsAgo },
      },
      _count: true,
    });

    return {
      total,
      active,
      inactive,
      graduated,
      occupancyRate: total > 0 ? ((active / total) * 100).toFixed(1) : '0',
      monthlyTrend: monthlyEnrollments,
    };
  }

  async getAttendanceStats(tenantId: string, startDate: string, endDate: string) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const totalRecords = attendances.length;
    const present = attendances.filter((a) => a.status === 'PRESENT').length;
    const absent = attendances.filter((a) => a.status === 'ABSENT').length;
    const late = attendances.filter((a) => a.status === 'LATE').length;

    return {
      period: { startDate, endDate },
      totalRecords,
      present,
      absent,
      late,
      averageAttendanceRate: totalRecords > 0 ? (((present + late) / totalRecords) * 100).toFixed(1) : '0',
    };
  }

  async getRevenueStats(tenantId: string, year: string) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });

    // Group by month
    const monthlyRevenue: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      monthlyRevenue[i] = 0;
    }

    payments.forEach((p) => {
      const month = new Date(p.paymentDate).getMonth() + 1;
      monthlyRevenue[month] += Number(p.amount);
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      year,
      totalRevenue,
      monthlyRevenue,
      transactionCount: payments.length,
    };
  }

  async getDashboardOverview(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalChildren,
      totalStaff,
      todayPresent,
      todayAbsent,
      pendingInvoices,
      totalRevenue,
      recentObservations,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.child.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.attendance.count({ where: { tenantId, date: today, status: 'PRESENT' } }),
      this.prisma.attendance.count({ where: { tenantId, date: today, status: 'ABSENT' } }),
      this.prisma.invoice.count({ where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] } } }),
      this.prisma.payment.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      this.prisma.observation.count({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.event.findMany({
        where: { tenantId, startDate: { gte: today } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
    ]);

    return {
      children: {
        total: totalChildren,
        presentToday: todayPresent,
        absentToday: todayAbsent,
        attendanceRate: totalChildren > 0 ? ((todayPresent / totalChildren) * 100).toFixed(1) : '0',
      },
      staff: { total: totalStaff },
      finance: {
        pendingInvoices,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      academic: {
        recentObservations,
      },
      upcomingEvents,
    };
  }
}
