import { Controller, Get, Put, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all tenants (Super Admin only)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get tenant details' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/dashboard')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get tenant dashboard statistics' })
  getDashboard(@Param('id') id: string) {
    return this.tenantsService.getDashboardStats(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER')
  @ApiOperation({ summary: 'Update tenant details' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.tenantsService.update(id, data);
  }

  @Put(':id/settings')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update tenant settings' })
  updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.tenantsService.updateSettings(id, settings);
  }
}
