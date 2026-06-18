'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/lib/store';
import { Globe, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage, user } = useAuthStore();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.common.settings}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-4"><Globe className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-semibold">{language === 'ar' ? 'اللغة' : 'Language'}</h2></div>
            <div className="space-y-3">
              <button onClick={() => { setLanguage('ar'); window.location.reload(); }} className={`w-full p-4 rounded-xl border text-start ${language === 'ar' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <p className="font-medium">العربية</p><p className="text-sm text-gray-500">Arabic - RTL</p>
              </button>
              <button onClick={() => { setLanguage('en'); window.location.reload(); }} className={`w-full p-4 rounded-xl border text-start ${language === 'en' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <p className="font-medium">English</p><p className="text-sm text-gray-500">English - LTR</p>
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-4"><Shield className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-semibold">{language === 'ar' ? 'معلومات الحساب' : 'Account Info'}</h2></div>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-500">{t.common.email}</label><p className="font-medium">{user?.email}</p></div>
              <div><label className="text-sm text-gray-500">{t.common.name}</label><p className="font-medium">{user?.firstName} {user?.lastName}</p></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
