import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('children')
@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER')
  @ApiOperation({ summary: 'Get all children for a tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('classId') classId?: string,
    @Query('search') search?: string,
  ) {
    return this.childrenService.findAll(tenantId, { status, classId, search });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get child details' })
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.childrenService.findOne(id, tenantId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create a new child record' })
  create(@Headers('x-tenant-id') tenantId: string, @Body() createChildDto: CreateChildDto) {
    return this.childrenService.create(tenantId, createChildDto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update child record' })
  update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() updateChildDto: UpdateChildDto,
  ) {
    return this.childrenService.update(id, tenantId, updateChildDto);
  }

  @Post(':id/emergency-contacts')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'PARENT')
  @ApiOperation({ summary: 'Add emergency contact for a child' })
  addEmergencyContact(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.childrenService.addEmergencyContact(id, tenantId, data);
  }

  @Get(':id/emergency-contacts')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get emergency contacts for a child' })
  getEmergencyContacts(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.childrenService.getEmergencyContacts(id, tenantId);
  }

  @Post(':id/assign-class')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Assign child to a class' })
  assignToClass(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { classId: string; academicYear: string },
  ) {
    return this.childrenService.assignToClass(id, tenantId, body.classId, body.academicYear);
  }
}
