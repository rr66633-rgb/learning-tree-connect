import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { Gender, ChildStatus } from '@prisma/client';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { status?: string; classId?: string; search?: string }) {
    const where: any = { tenantId };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { firstNameAr: { contains: query.search, mode: 'insensitive' } },
        { lastNameAr: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.child.findMany({
      where,
      include: {
        parentChildren: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        classAssignments: {
          include: { class: true },
          orderBy: { academicYear: 'desc' },
          take: 1,
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id, tenantId },
      include: {
        parentChildren: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        classAssignments: {
          include: { class: true },
        },
        emergencyContacts: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return child;
  }

  async create(tenantId: string, createChildDto: CreateChildDto) {
    const child = await this.prisma.child.create({
      data: {
        tenantId,
        firstName: createChildDto.firstName,
        lastName: createChildDto.lastName,
        firstNameAr: createChildDto.firstNameAr,
        lastNameAr: createChildDto.lastNameAr,
        dateOfBirth: new Date(createChildDto.dateOfBirth),
        gender: createChildDto.gender as Gender,
        enrollmentDate: new Date(createChildDto.enrollmentDate || new Date()),
        medicalNotes: createChildDto.medicalNotes,
        allergies: createChildDto.allergies,
        bloodType: createChildDto.bloodType,
        nationality: createChildDto.nationality,
        nationalId: createChildDto.nationalId,
      },
    });

    // Assign parent if provided
    if (createChildDto.parentId) {
      await this.prisma.parentChild.create({
        data: {
          tenantId,
          parentId: createChildDto.parentId,
          childId: child.id,
          relationship: createChildDto.parentRelationship || 'Parent',
        },
      });
    }

    // Assign to class if provided
    if (createChildDto.classId) {
      await this.prisma.classAssignment.create({
        data: {
          tenantId,
          classId: createChildDto.classId,
          childId: child.id,
          academicYear: createChildDto.academicYear || new Date().getFullYear().toString(),
        },
      });
    }

    return child;
  }

  async update(id: string, tenantId: string, updateChildDto: UpdateChildDto) {
    const child = await this.prisma.child.findFirst({ where: { id, tenantId } });
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return this.prisma.child.update({
      where: { id },
      data: {
        firstName: updateChildDto.firstName,
        lastName: updateChildDto.lastName,
        firstNameAr: updateChildDto.firstNameAr,
        lastNameAr: updateChildDto.lastNameAr,
        dateOfBirth: updateChildDto.dateOfBirth ? new Date(updateChildDto.dateOfBirth) : undefined,
        gender: updateChildDto.gender as Gender,
        status: updateChildDto.status as ChildStatus,
        medicalNotes: updateChildDto.medicalNotes,
        allergies: updateChildDto.allergies,
        bloodType: updateChildDto.bloodType,
        nationality: updateChildDto.nationality,
        nationalId: updateChildDto.nationalId,
        photoUrl: updateChildDto.photoUrl,
      },
    });
  }

  async addEmergencyContact(childId: string, tenantId: string, data: any) {
    return this.prisma.emergencyContact.create({
      data: {
        tenantId,
        childId,
        name: data.name,
        phone: data.phone,
        relationship: data.relationship,
        isAuthorizedPickup: data.isAuthorizedPickup || false,
      },
    });
  }

  async getEmergencyContacts(childId: string, tenantId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { childId, tenantId },
    });
  }

  async assignToClass(childId: string, tenantId: string, classId: string, academicYear: string) {
    return this.prisma.classAssignment.create({
      data: {
        tenantId,
        classId,
        childId,
        academicYear,
      },
    });
  }
}
