import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get dashboard overview' })
  getDashboard(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getDashboardOverview(tenantId);
  }

  @Get('enrollment')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get enrollment statistics' })
  getEnrollmentStats(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getEnrollmentStats(tenantId);
  }

  @Get('attendance')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getAttendanceStats(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getAttendanceStats(tenantId, startDate, endDate);
  }

  @Get('revenue')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'year', required: true })
  getRevenueStats(@Headers('x-tenant-id') tenantId: string, @Query('year') year: string) {
    return this.analyticsService.getRevenueStats(tenantId, year);
  }
}
