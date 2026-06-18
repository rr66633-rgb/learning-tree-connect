import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// EYFS Areas of Learning
export const EYFS_AREAS = {
  COMMUNICATION_LANGUAGE: 'Communication and Language',
  PHYSICAL_DEVELOPMENT: 'Physical Development',
  PERSONAL_SOCIAL_EMOTIONAL: 'Personal, Social and Emotional Development',
  LITERACY: 'Literacy',
  MATHEMATICS: 'Mathematics',
  UNDERSTANDING_WORLD: 'Understanding the World',
  EXPRESSIVE_ARTS: 'Expressive Arts and Design',
};

export const EYFS_AGE_RANGES = [
  '0-11 months',
  '8-20 months',
  '16-26 months',
  '22-36 months',
  '30-50 months',
  '40-60+ months',
];

@Injectable()
export class ObservationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { childId?: string; eyfsArea?: string; teacherId?: string }) {
    const where: any = { tenantId };

    if (query?.childId) where.childId = query.childId;
    if (query?.eyfsArea) where.eyfsArea = query.eyfsArea;
    if (query?.teacherId) where.teacherId = query.teacherId;

    return this.prisma.observation.findMany({
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
    const observation = await this.prisma.observation.findFirst({
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

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return observation;
  }

  async create(tenantId: string, teacherId: string, data: any) {
    return this.prisma.observation.create({
      data: {
        tenantId,
        childId: data.childId,
        teacherId,
        date: new Date(data.date),
        title: data.title,
        description: data.description,
        eyfsArea: data.eyfsArea,
        eyfsStrand: data.eyfsStrand,
        ageRange: data.ageRange,
        mediaUrls: data.mediaUrls || [],
        isSharedWithParent: data.isSharedWithParent || false,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const observation = await this.prisma.observation.findFirst({ where: { id, tenantId } });
    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return this.prisma.observation.update({
      where: { id },
      data,
    });
  }

  async shareWithParent(id: string, tenantId: string) {
    return this.prisma.observation.update({
      where: { id },
      data: { isSharedWithParent: true },
    });
  }

  async getChildProgress(tenantId: string, childId: string) {
    const observations = await this.prisma.observation.findMany({
      where: { tenantId, childId },
      orderBy: { date: 'asc' },
    });

    // Group by EYFS area
    const progressByArea: Record<string, any[]> = {};
    observations.forEach((obs) => {
      if (obs.eyfsArea) {
        if (!progressByArea[obs.eyfsArea]) {
          progressByArea[obs.eyfsArea] = [];
        }
        progressByArea[obs.eyfsArea].push({
          id: obs.id,
          date: obs.date,
          title: obs.title,
          description: obs.description,
          ageRange: obs.ageRange,
          strand: obs.eyfsStrand,
        });
      }
    });

    return {
      childId,
      totalObservations: observations.length,
      progressByArea,
      eyfsAreas: EYFS_AREAS,
      ageRanges: EYFS_AGE_RANGES,
    };
  }

  async getEyfsFramework() {
    return {
      areas: EYFS_AREAS,
      ageRanges: EYFS_AGE_RANGES,
    };
  }
}
