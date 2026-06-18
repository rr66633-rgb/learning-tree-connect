import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Headers, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ObservationsService } from './observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('observations')
@Controller('observations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get all observations' })
  @ApiQuery({ name: 'childId', required: false })
  @ApiQuery({ name: 'eyfsArea', required: false })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('childId') childId?: string,
    @Query('eyfsArea') eyfsArea?: string,
  ) {
    return this.observationsService.findAll(tenantId, { childId, eyfsArea });
  }

  @Get('eyfs-framework')
  @ApiOperation({ summary: 'Get EYFS framework reference data' })
  getEyfsFramework() {
    return this.observationsService.getEyfsFramework();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get observation by ID' })
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.observationsService.findOne(id, tenantId);
  }

  @Get('child/:childId/progress')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get child EYFS progress summary' })
  getChildProgress(@Param('childId') childId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.observationsService.getChildProgress(tenantId, childId);
  }

  @Post()
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create a new observation' })
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.observationsService.create(tenantId, req.user.userId, data);
  }

  @Put(':id')
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update an observation' })
  update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.observationsService.update(id, tenantId, data);
  }

  @Patch(':id/share')
  @Roles('TEACHER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Share observation with parent' })
  shareWithParent(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.observationsService.shareWithParent(id, tenantId);
  }
}
