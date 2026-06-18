import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TransportationService {
  constructor(private prisma: PrismaService) {}

  async getBusRoutes(tenantId: string) {
    return this.prisma.busRoute.findMany({
      where: { tenantId },
      include: {
        assignments: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });
  }

  async getBusRoute(id: string) {
    const route = await this.prisma.busRoute.findUnique({
      where: { id },
      include: {
        assignments: {
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
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Bus route not found');
    }

    return route;
  }

  async createBusRoute(tenantId: string, data: any) {
    return this.prisma.busRoute.create({
      data: {
        tenantId,
        name: data.name,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        busNumber: data.busNumber,
        capacity: data.capacity,
      },
    });
  }

  async updateBusRoute(id: string, data: any) {
    return this.prisma.busRoute.update({
      where: { id },
      data: {
        name: data.name,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        busNumber: data.busNumber,
        capacity: data.capacity,
        isActive: data.isActive,
      },
    });
  }

  async assignChildToRoute(busRouteId: string, data: any) {
    return this.prisma.busChildAssignment.create({
      data: {
        busRouteId,
        childId: data.childId,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        pickupTime: data.pickupTime,
      },
    });
  }

  async removeChildFromRoute(busRouteId: string, childId: string) {
    return this.prisma.busChildAssignment.delete({
      where: { busRouteId_childId: { busRouteId, childId } },
    });
  }
}
