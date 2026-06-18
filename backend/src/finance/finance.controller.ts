import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ===== INVOICES =====

  @Get('invoices')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'ACCOUNTANT', 'PARENT')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'childId', required: false })
  getInvoices(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('parentId') parentId?: string,
    @Query('childId') childId?: string,
  ) {
    return this.financeService.getInvoices(tenantId, { status, parentId, childId });
  }

  @Get('invoices/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'ACCOUNTANT', 'PARENT')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.financeService.getInvoice(id, tenantId);
  }

  @Post('invoices')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create a new invoice' })
  createInvoice(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.financeService.createInvoice(tenantId, data);
  }

  @Patch('invoices/:id/status')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Update invoice status' })
  updateInvoiceStatus(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.financeService.updateInvoiceStatus(id, tenantId, body.status);
  }

  // ===== PAYMENTS =====

  @Post('payments')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Record a payment' })
  recordPayment(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.financeService.recordPayment(tenantId, data);
  }

  // ===== FEE STRUCTURES =====

  @Get('fee-structures')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get fee structures' })
  getFeeStructures(@Headers('x-tenant-id') tenantId: string) {
    return this.financeService.getFeeStructures(tenantId);
  }

  @Post('fee-structures')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create a fee structure' })
  createFeeStructure(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.financeService.createFeeStructure(tenantId, data);
  }

  // ===== REPORTS =====

  @Get('summary')
  @Roles('SUPER_ADMIN', 'SCHOOL_OWNER', 'PRINCIPAL', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get financial summary' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getFinancialSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getFinancialSummary(tenantId, startDate, endDate);
  }
}
