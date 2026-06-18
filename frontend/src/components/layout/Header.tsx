'use client';
import { useState, useEffect } from 'react';
import { Bell, Globe, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/i18n';
import { notificationsApi } from '@/lib/api';

export default function Header() {
  const { user, language, setLanguage } = useAuthStore();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsApi.getUnreadCount().then(res => setUnreadCount(res.data.count)).catch(() => {});
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
    window.location.reload();
  };

  const displayName = language === 'ar'
    ? `${user?.firstNameAr || user?.firstName} ${user?.lastNameAr || user?.lastName}`
    : `${user?.firstName} ${user?.lastName}`;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t.common.search + '...'} className="w-full ps-10 pe-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm text-gray-600">
          <Globe className="w-4 h-4" />
          {language === 'ar' ? 'EN' : 'عربي'}
        </button>
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && <span className="absolute -top-0.5 -end-0.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
        </button>
        <div className="flex items-center gap-3 ps-4 border-s border-gray-200">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-700 font-medium text-sm">{user?.firstName?.[0]}</span>
          </div>
          <span className="text-sm font-medium text-gray-700">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
