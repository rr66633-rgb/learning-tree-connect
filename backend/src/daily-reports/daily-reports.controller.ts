import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Headers, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DailyReportsService } from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('daily-reports')
@Controller('daily-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get all daily reports' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'childId', required: false })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('date') date?: string,
    @Query('childId') childId?: string,
  ) {
    return this.dailyReportsService.findAll(tenantId, { date, childId });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get daily report by ID' })
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.dailyReportsService.findOne(id, tenantId);
  }

  @Get('child/:childId')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get daily reports for a specific child' })
  getChildReports(
    @Param('childId') childId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dailyReportsService.getChildReports(tenantId, childId, limit);
  }

  @Post()
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create a daily report' })
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateDailyReportDto,
    @Request() req,
  ) {
    return this.dailyReportsService.create(tenantId, req.user.userId, dto);
  }

  @Put(':id')
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update a daily report' })
  update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.dailyReportsService.update(id, tenantId, data);
  }

  @Patch(':id/publish')
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Publish a daily report (visible to parents)' })
  publish(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.dailyReportsService.publish(id, tenantId);
  }
}
