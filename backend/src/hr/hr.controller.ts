import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Headers, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('hr')
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('staff')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get all staff records' })
  getStaffRecords(@Headers('x-tenant-id') tenantId: string) {
    return this.hrService.getStaffRecords(tenantId);
  }

  @Get('staff/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get staff record by ID' })
  getStaffRecord(@Param('id') id: string) {
    return this.hrService.getStaffRecord(id);
  }

  @Post('staff')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create staff record' })
  createStaffRecord(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.hrService.createStaffRecord(tenantId, data);
  }

  @Put('staff/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update staff record' })
  updateStaffRecord(@Param('id') id: string, @Body() data: any) {
    return this.hrService.updateStaffRecord(id, data);
  }

  @Get('leave-requests')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get leave requests' })
  getLeaveRequests(
    @Headers('x-tenant-id') tenantId: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.getLeaveRequests(tenantId, { userId, status });
  }

  @Post('leave-requests')
  @Roles('SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'BUS_SUPERVISOR', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Submit a leave request' })
  createLeaveRequest(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.hrService.createLeaveRequest(tenantId, req.user.userId, data);
  }

  @Patch('leave-requests/:id/approve')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Approve a leave request' })
  approveLeaveRequest(@Param('id') id: string, @Request() req) {
    return this.hrService.approveLeaveRequest(id, req.user.userId);
  }

  @Patch('leave-requests/:id/reject')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Reject a leave request' })
  rejectLeaveRequest(@Param('id') id: string, @Request() req) {
    return this.hrService.rejectLeaveRequest(id, req.user.userId);
  }
}
