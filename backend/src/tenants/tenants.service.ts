import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            children: true,
            tenantUsers: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            tenantUsers: true,
            classes: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (!tenant) {
      throw new NotFoundException('School not found');
    }

    return tenant;
  }

  async update(id: string, data: any) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async updateSettings(id: string, settings: any) {
    return this.prisma.tenant.update({
      where: { id },
      data: { settings },
    });
  }

  async getDashboardStats(tenantId: string) {
    const [childrenCount, staffCount, classesCount, activeInvoices] = await Promise.all([
      this.prisma.child.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.class.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId, status: 'PENDING' } }),
    ]);

    return {
      totalChildren: childrenCount,
      totalStaff: staffCount,
      totalClasses: classesCount,
      pendingInvoices: activeInvoices,
    };
  }
}
