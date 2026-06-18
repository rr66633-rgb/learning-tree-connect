import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoyaltyTransactionType } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  // ============ PROGRAM MANAGEMENT ============

  async getProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
      include: { rewards: { where: { isActive: true } } },
    });
  }

  async createProgram(tenantId: string, data: {
    name: string;
    nameAr?: string;
    pointsPerSar?: number;
    description?: string;
    descriptionAr?: string;
  }) {
    return this.prisma.loyaltyProgram.create({
      data: {
        tenantId,
        name: data.name,
        nameAr: data.nameAr,
        pointsPerSar: data.pointsPerSar || 1,
        description: data.description,
        descriptionAr: data.descriptionAr,
        isActive: true,
      },
    });
  }

  async updateProgram(id: string, tenantId: string, data: any) {
    const program = await this.prisma.loyaltyProgram.findFirst({ where: { id, tenantId } });
    if (!program) throw new NotFoundException('Loyalty program not found');
    return this.prisma.loyaltyProgram.update({ where: { id }, data });
  }

  // ============ REWARDS MANAGEMENT ============

  async getRewards(tenantId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!program) return [];
    return this.prisma.loyaltyReward.findMany({
      where: { programId: program.id, isActive: true },
      orderBy: { pointsCost: 'asc' },
    });
  }

  async createReward(tenantId: string, data: {
    name: string;
    nameAr?: string;
    pointsCost: number;
    description?: string;
    descriptionAr?: string;
  }) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!program) throw new NotFoundException('No active loyalty program found');

    return this.prisma.loyaltyReward.create({
      data: {
        programId: program.id,
        name: data.name,
        nameAr: data.nameAr,
        pointsCost: data.pointsCost,
        description: data.description,
        descriptionAr: data.descriptionAr,
      },
    });
  }

  // ============ BALANCE & TRANSACTIONS ============

  async getBalance(tenantId: string, parentId: string) {
    if (!tenantId || !parentId) {
      return { points: 0, tenantId, parentId };
    }
    try {
      let balance = await this.prisma.loyaltyBalance.findUnique({
        where: { tenantId_parentId: { tenantId, parentId } },
      });

      if (!balance) {
        balance = await this.prisma.loyaltyBalance.create({
          data: { tenantId, parentId, points: 0 },
        });
      }

      return balance;
    } catch (e) {
      return { points: 0, tenantId, parentId };
    }
  }

  async getTransactions(tenantId: string, parentId: string, limit = 50) {
    return this.prisma.loyaltyTransaction.findMany({
      where: { tenantId, parentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async earnPoints(tenantId: string, parentId: string, points: number, description: string, referenceId?: string) {
    // Update balance
    await this.prisma.loyaltyBalance.upsert({
      where: { tenantId_parentId: { tenantId, parentId } },
      update: { points: { increment: points } },
      create: { tenantId, parentId, points },
    });

    // Create transaction
    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        parentId,
        type: 'EARNED',
        points,
        description,
        referenceId,
      },
    });
  }

  async redeemPoints(tenantId: string, parentId: string, rewardId: string) {
    const reward = await this.prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');

    const balance = await this.getBalance(tenantId, parentId);
    if (balance.points < reward.pointsCost) {
      throw new BadRequestException('Insufficient points');
    }

    // Deduct points
    await this.prisma.loyaltyBalance.update({
      where: { tenantId_parentId: { tenantId, parentId } },
      data: { points: { decrement: reward.pointsCost } },
    });

    // Create transaction
    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        parentId,
        type: 'REDEEMED',
        points: -reward.pointsCost,
        description: `Redeemed: ${reward.name}`,
        referenceId: rewardId,
      },
    });
  }

  async adjustPoints(tenantId: string, parentId: string, points: number, description: string) {
    await this.prisma.loyaltyBalance.upsert({
      where: { tenantId_parentId: { tenantId, parentId } },
      update: { points: { increment: points } },
      create: { tenantId, parentId, points: Math.max(0, points) },
    });

    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        parentId,
        type: 'ADJUSTED',
        points,
        description,
      },
    });
  }

  // Called when a payment is made - auto earn points
  async processPaymentPoints(tenantId: string, parentId: string, paymentAmount: number, invoiceId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!program) return null;

    const pointsEarned = Math.floor(paymentAmount * Number(program.pointsPerSar));
    if (pointsEarned <= 0) return null;

    return this.earnPoints(
      tenantId,
      parentId,
      pointsEarned,
      `نقاط مكتسبة من دفع فاتورة`,
      invoiceId,
    );
  }

  // ============ LEADERBOARD ============

  async getLeaderboard(tenantId: string, limit = 10) {
    return this.prisma.loyaltyBalance.findMany({
      where: { tenantId, points: { gt: 0 } },
      orderBy: { points: 'desc' },
      take: limit,
    });
  }
}
