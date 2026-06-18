'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { hrApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Users, Calendar, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HRPage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [staff, setStaff] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'staff' | 'leaves'>('staff');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { const [s, l] = await Promise.all([hrApi.getStaff(), hrApi.getLeaveRequests()]); setStaff(s.data); setLeaves(l.data); } catch {} finally { setLoading(false); } };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.common.hr}</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'staff' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{language === 'ar' ? 'الموظفون' : 'Staff'}</button>
          <button onClick={() => setTab('leaves')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'leaves' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{language === 'ar' ? 'طلبات الإجازة' : 'Leave Requests'}</button>
        </div>
        <div className="card">
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          : tab === 'staff' ? (
            staff.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
            : <div className="space-y-3">{staff.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
                    <div><p className="font-medium text-gray-900">{s.user?.firstName} {s.user?.lastName}</p><p className="text-xs text-gray-500">{s.position} | {s.department}</p></div>
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span>
                </div>
              ))}</div>
          ) : (
            leaves.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
            : <div className="space-y-3">{leaves.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Calendar className="w-5 h-5 text-purple-600" /></div>
                    <div><p className="font-medium text-gray-900">{l.user?.firstName} {l.user?.lastName}</p><p className="text-xs text-gray-500">{l.leaveType} | {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</p></div>
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${l.status === 'APPROVED' ? 'bg-green-100 text-green-800' : l.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{l.status}</span>
                </div>
              ))}</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
