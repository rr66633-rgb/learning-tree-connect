import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        firstNameAr: registerDto.firstNameAr,
        lastNameAr: registerDto.lastNameAr,
        phone: registerDto.phone,
        language: registerDto.language || 'ar',
      },
    });

    // If tenant info provided, create tenant and assign role
    if (registerDto.schoolName) {
      const tenant = await this.prisma.tenant.create({
        data: {
          name: registerDto.schoolName,
          nameAr: registerDto.schoolNameAr,
          subdomain: registerDto.subdomain || registerDto.schoolName.toLowerCase().replace(/\s+/g, '-'),
          contactEmail: registerDto.email,
          contactPhone: registerDto.phone || '',
        },
      });

      await this.prisma.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'SCHOOL_OWNER',
        },
      });
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        tenantUsers: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        firstNameAr: user.firstNameAr,
        lastNameAr: user.lastNameAr,
        avatarUrl: user.avatarUrl,
        language: user.language,
        tenants: user.tenantUsers.map((tu) => ({
          tenantId: tu.tenantId,
          tenantName: tu.tenant.name,
          tenantNameAr: tu.tenant.nameAr,
          role: tu.role,
          subdomain: tu.tenant.subdomain,
        })),
      },
      accessToken: token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          include: { tenant: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
