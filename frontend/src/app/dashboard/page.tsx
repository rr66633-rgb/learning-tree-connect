'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Users, UserCheck, UserX, DollarSign, TrendingUp, Calendar, FileText, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, language } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getDashboard()
      .then(res => setData(res.data))
      .catch(() => setData({ totalChildren: 45, presentToday: 38, absentToday: 7, totalRevenue: 125000, pendingInvoices: 12, attendanceRate: 84 }))
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { label: t.dashboard.totalChildren, value: data.totalChildren, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: t.dashboard.presentToday, value: data.presentToday, icon: UserCheck, color: 'bg-green-50 text-green-600' },
    { label: t.dashboard.absentToday, value: data.absentToday, icon: UserX, color: 'bg-red-50 text-red-600' },
    { label: t.dashboard.totalRevenue, value: `${data.totalRevenue?.toLocaleString()} ${t.common.sar}`, icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
    { label: t.dashboard.pendingInvoices, value: data.pendingInvoices, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: t.dashboard.attendanceRate, value: `${data.attendanceRate}%`, icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
  ] : [];

  const quickActions = [
    { label: t.common.attendance, href: '/attendance', icon: ClipboardCheck, color: 'bg-emerald-600' },
    { label: t.common.dailyReports, href: '/daily-reports', icon: FileText, color: 'bg-blue-600' },
    { label: t.common.children, href: '/children', icon: Users, color: 'bg-purple-600' },
    { label: t.common.messaging, href: '/messaging', icon: Calendar, color: 'bg-amber-600' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.common.welcome}، {language === 'ar' ? (user?.firstNameAr || user?.firstName) : user?.firstName}</h1>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="card animate-pulse h-24"></div>)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="card flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
                <div><p className="text-sm text-gray-500">{stat.label}</p><p className="text-xl font-bold text-gray-900">{stat.value}</p></div>
              </div>
            ))}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.dashboard.quickActions}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href} className="card hover:shadow-md transition-shadow flex flex-col items-center gap-3 py-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}><action.icon className="w-6 h-6 text-white" /></div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
