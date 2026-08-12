/**
 * Overdue Invoice Reminder Handler
 * Runs daily - sends email reminders to parents with overdue invoices
 * Reminder schedule: 3 days, 7 days, 14 days after due date
 */
import { getDb } from './db';
import { invoices, users, children } from '../drizzle/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { sendOverdueReminderEmail } from './services/emailService';

export async function handleOverdueReminders() {
  const db = await getDb();
  if (!db) {
    console.log('[Overdue Reminder] No database connection');
    return { processed: 0, sent: 0, errors: 0 };
  }

  const now = new Date();
  let sent = 0;
  let errors = 0;

  try {
    // Get all pending/overdue invoices where dueDate has passed
    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          inArray(invoices.status, ['pending', 'overdue']),
          lt(invoices.dueDate, now)
        )
      );

    console.log(`[Overdue Reminder] Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      const dueDate = new Date(invoice.dueDate!);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only send reminders at 3, 7, and 14 days
      if (daysOverdue !== 3 && daysOverdue !== 7 && daysOverdue !== 14) {
        continue;
      }

      try {
        // Get parent info
        const [parent] = await db.select().from(users).where(eq(users.id, invoice.parentId!));
        if (!parent?.email) continue;

        // Get child info
        const [child] = await db.select().from(children).where(eq(children.id, invoice.childId!));

        await sendOverdueReminderEmail(
          parent.email,
          parent.name || 'ولي الأمر',
          invoice.invoiceNumber || `INV-${invoice.id}`,
          invoice.total || '0',
          child?.firstName || 'الطفل',
          dueDate.toLocaleDateString('ar-SA'),
          daysOverdue
        );

        sent++;
        console.log(`[Overdue Reminder] Sent ${daysOverdue}-day reminder to ${parent.email} for invoice ${invoice.invoiceNumber}`);
      } catch (err: any) {
        errors++;
        console.error(`[Overdue Reminder] Failed for invoice ${invoice.id}:`, err.message);
      }
    }

    console.log(`[Overdue Reminder] Complete: ${sent} sent, ${errors} errors`);
    return { processed: overdueInvoices.length, sent, errors };
  } catch (err: any) {
    console.error('[Overdue Reminder] Handler error:', err.message);
    return { processed: 0, sent: 0, errors: 1 };
  }
}
