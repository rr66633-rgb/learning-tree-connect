import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('program')
  @ApiOperation({ summary: 'Get active loyalty program' })
  async getProgram(@Headers('x-tenant-id') tenantId: string) {
    return this.loyaltyService.getProgram(tenantId);
  }

  @Post('program')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER')
  @ApiOperation({ summary: 'Create loyalty program' })
  async createProgram(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { name: string; nameAr?: string; pointsPerSar?: number; description?: string; descriptionAr?: string },
  ) {
    return this.loyaltyService.createProgram(tenantId, body);
  }

  @Put('program/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER')
  @ApiOperation({ summary: 'Update loyalty program' })
  async updateProgram(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.loyaltyService.updateProgram(id, tenantId, body);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Get available rewards' })
  async getRewards(@Headers('x-tenant-id') tenantId: string) {
    return this.loyaltyService.getRewards(tenantId);
  }

  @Post('rewards')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER')
  @ApiOperation({ summary: 'Create a reward' })
  async createReward(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { name: string; nameAr?: string; pointsCost: number; description?: string; descriptionAr?: string },
  ) {
    return this.loyaltyService.createReward(tenantId, body);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get parent loyalty balance' })
  async getBalance(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
  ) {
    return this.loyaltyService.getBalance(tenantId, req.user.id);
  }

  @Get('balance/:parentId')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get specific parent balance' })
  async getParentBalance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('parentId') parentId: string,
  ) {
    return this.loyaltyService.getBalance(tenantId, parentId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get loyalty transactions' })
  async getTransactions(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.loyaltyService.getTransactions(tenantId, req.user.id, limit || 50);
  }

  @Post('redeem')
  @Roles('PARENT')
  @ApiOperation({ summary: 'Redeem points for a reward' })
  async redeemPoints(
    @Headers('x-tenant-id') tenantId: string,
    @Request() req: any,
    @Body() body: { rewardId: string },
  ) {
    return this.loyaltyService.redeemPoints(tenantId, req.user.id, body.rewardId);
  }

  @Post('adjust')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Manually adjust points' })
  async adjustPoints(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { parentId: string; points: number; description: string },
  ) {
    return this.loyaltyService.adjustPoints(tenantId, body.parentId, body.points, body.description);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get loyalty leaderboard' })
  async getLeaderboard(
    @Headers('x-tenant-id') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.loyaltyService.getLeaderboard(tenantId, limit || 10);
  }
}
