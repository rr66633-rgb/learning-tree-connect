import { Controller, Get, Post, Body, Query, Param, UseGuards, Headers, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get attendance records by date' })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'classId', required: false })
  getByDate(
    @Headers('x-tenant-id') tenantId: string,
    @Query('date') date: string,
    @Query('classId') classId?: string,
  ) {
    return this.attendanceService.getByDate(tenantId, date, classId);
  }

  @Get('child/:childId')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get attendance history for a child' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getChildAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Param('childId') childId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getChildAttendance(tenantId, childId, startDate, endDate);
  }

  @Post('check-in')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Check in a child' })
  checkIn(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { childId: string; qrCode?: string },
    @Request() req,
  ) {
    return this.attendanceService.checkIn(tenantId, body.childId, req.user.userId, body.qrCode);
  }

  @Post('check-out')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Check out a child' })
  checkOut(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { childId: string },
    @Request() req,
  ) {
    return this.attendanceService.checkOut(tenantId, body.childId, req.user.userId);
  }

  @Post('mark-absent')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Mark a child as absent' })
  markAbsent(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { childId: string; date: string; notes?: string },
  ) {
    return this.attendanceService.markAbsent(tenantId, body.childId, body.date, body.notes);
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Bulk mark attendance for multiple children' })
  bulkMark(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { date: string; records: { childId: string; status: string }[] },
  ) {
    return this.attendanceService.bulkMarkAttendance(tenantId, body.date, body.records);
  }

  @Get('daily-report')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get daily attendance report' })
  @ApiQuery({ name: 'date', required: true })
  getDailyReport(@Headers('x-tenant-id') tenantId: string, @Query('date') date: string) {
    return this.attendanceService.getDailyReport(tenantId, date);
  }
}
