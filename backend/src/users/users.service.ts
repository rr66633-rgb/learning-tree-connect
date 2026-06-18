import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.tenantUser.findMany({
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
            createdAt: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        tenantUsers: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async create(tenantId: string, createUserDto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        firstNameAr: createUserDto.firstNameAr,
        lastNameAr: createUserDto.lastNameAr,
        phone: createUserDto.phone,
        language: createUserDto.language || 'ar',
      },
    });

    await this.prisma.tenantUser.create({
      data: {
        tenantId,
        userId: user.id,
        role: createUserDto.role as UserRole,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        firstNameAr: updateUserDto.firstNameAr,
        lastNameAr: updateUserDto.lastNameAr,
        phone: updateUserDto.phone,
        language: updateUserDto.language,
      },
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
