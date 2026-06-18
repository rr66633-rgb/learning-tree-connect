'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { attendanceApi, childrenApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { UserCheck, UserX, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadData(); }, [selectedDate]);
  const loadData = async () => {
    setLoading(true);
    try { const [c, a] = await Promise.all([childrenApi.getAll(), attendanceApi.getByDate(selectedDate)]); setChildren(c.data); setAttendance(a.data); } catch { setChildren([]); setAttendance([]); } finally { setLoading(false); }
  };
  const handleCheckIn = async (childId: string) => { try { await attendanceApi.checkIn(childId); toast.success(language === 'ar' ? 'تم تسجيل الحضور' : 'Checked in'); loadData(); } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } };
  const handleCheckOut = async (childId: string) => { try { await attendanceApi.checkOut(childId); toast.success(language === 'ar' ? 'تم تسجيل الانصراف' : 'Checked out'); loadData(); } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); } };
  const getAtt = (childId: string) => attendance.find((a: any) => a.childId === childId);
  const presentCount = attendance.filter((a: any) => a.status === 'PRESENT').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.attendance.title}</h1>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field w-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center"><UserCheck className="w-6 h-6 text-green-600" /></div><div><p className="text-sm text-gray-500">{t.attendance.present}</p><p className="text-xl font-bold">{presentCount}</p></div></div>
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center"><UserX className="w-6 h-6 text-red-600" /></div><div><p className="text-sm text-gray-500">{t.attendance.absent}</p><p className="text-xl font-bold">{children.length - presentCount}</p></div></div>
          <div className="card flex items-center gap-4"><div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-blue-600" /></div><div><p className="text-sm text-gray-500">{t.attendance.attendanceRate}</p><p className="text-xl font-bold">{children.length > 0 ? Math.round((presentCount / children.length) * 100) : 0}%</p></div></div>
        </div>
        <div className="card">
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          : children.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
          : <div className="space-y-2">{children.map((child) => {
              const att = getAtt(child.id);
              const isPresent = att?.status === 'PRESENT';
              return (
                <div key={child.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPresent ? 'bg-green-100' : 'bg-gray-100'}`}><span className={`font-medium text-sm ${isPresent ? 'text-green-700' : 'text-gray-500'}`}>{(language === 'ar' ? child.firstNameAr : child.firstName)?.[0]}</span></div>
                    <div><p className="font-medium text-gray-900">{language === 'ar' ? `${child.firstNameAr || child.firstName} ${child.lastNameAr || child.lastName}` : `${child.firstName} ${child.lastName}`}</p>
                    {att?.checkInTime && <p className="text-xs text-gray-500">{t.attendance.checkIn}: {new Date(att.checkInTime).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPresent ? <button onClick={() => handleCheckIn(child.id)} className="btn-primary text-sm py-1.5 px-3">{t.attendance.checkIn}</button>
                    : !att?.checkOutTime ? <button onClick={() => handleCheckOut(child.id)} className="btn-secondary text-sm py-1.5 px-3">{t.attendance.checkOut}</button>
                    : <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">{language === 'ar' ? 'انصرف' : 'Left'}</span>}
                  </div>
                </div>
              );
            })}</div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
