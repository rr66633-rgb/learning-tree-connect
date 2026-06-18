import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';

@Injectable()
export class DailyReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { date?: string; childId?: string; teacherId?: string }) {
    const where: any = { tenantId };

    if (query?.date) {
      where.date = new Date(query.date);
    }
    if (query?.childId) {
      where.childId = query.childId;
    }
    if (query?.teacherId) {
      where.teacherId = query.teacherId;
    }

    return this.prisma.dailyReport.findMany({
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
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id, tenantId },
      include: {
        child: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    return report;
  }

  async create(tenantId: string, teacherId: string, dto: CreateDailyReportDto) {
    return this.prisma.dailyReport.create({
      data: {
        tenantId,
        childId: dto.childId,
        teacherId,
        date: new Date(dto.date),
        meals: dto.meals || [],
        sleep: dto.sleep || {},
        toileting: dto.toileting || {},
        activities: dto.activities,
        mood: dto.mood,
        teacherNotes: dto.teacherNotes,
        photos: dto.photos || [],
        isPublished: dto.isPublished || false,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const report = await this.prisma.dailyReport.findFirst({ where: { id, tenantId } });
    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data,
    });
  }

  async publish(id: string, tenantId: string) {
    return this.prisma.dailyReport.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async getChildReports(tenantId: string, childId: string, limit = 30) {
    return this.prisma.dailyReport.findMany({
      where: { tenantId, childId, isPublished: true },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}
