import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const SAUDI_VAT_RATE = 0.15; // 15% VAT

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ===== INVOICES =====

  async getInvoices(tenantId: string, query?: { status?: string; parentId?: string; childId?: string }) {
    const where: any = { tenantId };
    if (query?.status) where.status = query.status;
    if (query?.parentId) where.parentId = query.parentId;
    if (query?.childId) where.childId = query.childId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        child: {
          select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
        },
        payments: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getInvoice(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        child: true,
        payments: true,
        tenant: {
          select: { name: true, nameAr: true, vatNumber: true, address: true, contactPhone: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async createInvoice(tenantId: string, data: any) {
    // Generate invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const nextNumber = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') + 1
      : 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

    // Calculate VAT
    const subtotal = parseFloat(data.amount);
    const vatRate = data.vatRate || SAUDI_VAT_RATE;
    const vatAmount = subtotal * vatRate;
    const totalAmount = subtotal + vatAmount;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        parentId: data.parentId,
        childId: data.childId,
        invoiceNumber,
        description: data.description,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        issueDate: new Date(data.issueDate || new Date()),
        dueDate: new Date(data.dueDate),
        items: data.items || [],
        notes: data.notes,
      },
    });
  }

  async updateInvoiceStatus(id: string, tenantId: string, status: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // ===== PAYMENTS =====

  async recordPayment(tenantId: string, data: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        amount: parseFloat(data.amount),
        paymentDate: new Date(data.paymentDate || new Date()),
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        notes: data.notes,
      },
    });

    // Update invoice status
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + parseFloat(data.amount);
    const invoiceTotal = Number(invoice.totalAmount);

    let newStatus = 'PARTIALLY_PAID';
    if (totalPaid >= invoiceTotal) {
      newStatus = 'PAID';
    }

    await this.prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { status: newStatus as any },
    });

    return payment;
  }

  // ===== FEE STRUCTURES =====

  async getFeeStructures(tenantId: string) {
    return this.prisma.feeStructure.findMany({
      where: { tenantId, isActive: true },
    });
  }

  async createFeeStructure(tenantId: string, data: any) {
    return this.prisma.feeStructure.create({
      data: {
        tenantId,
        name: data.name,
        nameAr: data.nameAr,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        description: data.description,
      },
    });
  }

  // ===== FINANCIAL REPORTS =====

  async getFinancialSummary(tenantId: string, startDate: string, endDate: string) {
    const [totalInvoiced, totalCollected, pendingInvoices, overdueInvoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          issueDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.invoice.count({
        where: { tenantId, status: 'OVERDUE' },
      }),
    ]);

    return {
      period: { startDate, endDate },
      totalInvoiced: totalInvoiced._sum.totalAmount || 0,
      invoiceCount: totalInvoiced._count,
      totalCollected: totalCollected._sum.amount || 0,
      paymentCount: totalCollected._count,
      pendingInvoices,
      overdueInvoices,
      collectionRate: totalInvoiced._sum.totalAmount
        ? ((Number(totalCollected._sum.amount || 0) / Number(totalInvoiced._sum.totalAmount)) * 100).toFixed(1)
        : '0',
    };
  }
}
