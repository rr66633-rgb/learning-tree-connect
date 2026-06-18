import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Get all users for a tenant' })
  findAll(@Headers('x-tenant-id') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Headers('x-tenant-id') tenantId: string, @Body() createUserDto: CreateUserDto) {
    return this.usersService.create(tenantId, createUserDto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Deactivate user' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL')
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }
}
