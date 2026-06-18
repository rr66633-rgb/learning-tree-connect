'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { financeApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinancePage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const [inv, sum] = await Promise.all([financeApi.getInvoices(), financeApi.getFinancialSummary()]); setInvoices(inv.data); setSummary(sum.data); } catch { setInvoices([]); }
    finally { setLoading(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'PAID': return 'bg-green-100 text-green-800'; case 'PENDING': return 'bg-yellow-100 text-yellow-800'; case 'OVERDUE': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };
  const getStatusLabel = (status: string) => {
    switch (status) { case 'PAID': return t.finance.paid; case 'PENDING': return t.finance.pending; case 'OVERDUE': return t.finance.overdue; default: return status; }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.finance.title}</h1>
          <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{t.finance.createInvoice}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-green-600" /></div><div><p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي المحصل' : 'Total Collected'}</p><p className="text-xl font-bold">{(summary?.totalCollected || 0).toLocaleString()} {t.common.sar}</p></div></div>
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-yellow-600" /></div><div><p className="text-sm text-gray-500">{t.finance.pending}</p><p className="text-xl font-bold">{(summary?.totalPending || 0).toLocaleString()} {t.common.sar}</p></div></div>
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-600" /></div><div><p className="text-sm text-gray-500">{t.finance.overdue}</p><p className="text-xl font-bold">{(summary?.totalOverdue || 0).toLocaleString()} {t.common.sar}</p></div></div>
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center"><CheckCircle className="w-6 h-6 text-blue-600" /></div><div><p className="text-sm text-gray-500">{t.finance.vat}</p><p className="text-xl font-bold">{(summary?.totalVat || 0).toLocaleString()} {t.common.sar}</p></div></div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.finance.invoices}</h2>
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          : invoices.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
          : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100">
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">#</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.children.parent}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.finance.amount}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.finance.vat}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.finance.totalAmount}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.finance.dueDate}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.common.status}</th>
            </tr></thead><tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{inv.parent?.firstName} {inv.parent?.lastName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{Number(inv.subtotal).toLocaleString()} {t.common.sar}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{Number(inv.vatAmount).toLocaleString()} {t.common.sar}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{Number(inv.totalAmount).toLocaleString()} {t.common.sar}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>{getStatusLabel(inv.status)}</span></td>
                </tr>
              ))}
            </tbody></table></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
