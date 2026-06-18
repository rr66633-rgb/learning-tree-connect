import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportationService } from './transportation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('transportation')
@Controller('transportation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransportationController {
  constructor(private readonly transportationService: TransportationService) {}

  @Get('routes')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'BUS_SUPERVISOR')
  @ApiOperation({ summary: 'Get all bus routes' })
  getBusRoutes(@Headers('x-tenant-id') tenantId: string) {
    return this.transportationService.getBusRoutes(tenantId);
  }

  @Get('routes/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'BUS_SUPERVISOR')
  @ApiOperation({ summary: 'Get bus route details' })
  getBusRoute(@Param('id') id: string) {
    return this.transportationService.getBusRoute(id);
  }

  @Post('routes')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create a bus route' })
  createBusRoute(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.transportationService.createBusRoute(tenantId, data);
  }

  @Put('routes/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update a bus route' })
  updateBusRoute(@Param('id') id: string, @Body() data: any) {
    return this.transportationService.updateBusRoute(id, data);
  }

  @Post('routes/:id/assign-child')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Assign a child to a bus route' })
  assignChild(@Param('id') id: string, @Body() data: any) {
    return this.transportationService.assignChildToRoute(id, data);
  }

  @Delete('routes/:routeId/children/:childId')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Remove a child from a bus route' })
  removeChild(@Param('routeId') routeId: string, @Param('childId') childId: string) {
    return this.transportationService.removeChildFromRoute(routeId, childId);
  }
}
