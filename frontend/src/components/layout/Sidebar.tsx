'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/lib/store';
import { LayoutDashboard, Users, ClipboardCheck, FileText, MessageCircle, CreditCard, Gift, UserCog, Settings, LogOut, TreePine } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/children', icon: Users, labelKey: 'children' },
  { href: '/attendance', icon: ClipboardCheck, labelKey: 'attendance' },
  { href: '/daily-reports', icon: FileText, labelKey: 'dailyReports' },
  { href: '/messaging', icon: MessageCircle, labelKey: 'messaging' },
  { href: '/finance', icon: CreditCard, labelKey: 'finance' },
  { href: '/loyalty', icon: Gift, labelKey: 'loyalty' },
  { href: '/hr', icon: UserCog, labelKey: 'hr' },
  { href: '/settings', icon: Settings, labelKey: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { logout, currentTenant, language } = useAuthStore();

  return (
    <aside className="fixed top-0 start-0 h-full w-64 bg-white border-e border-gray-200 flex flex-col z-40">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Learning Tree</h1>
            <p className="text-xs text-gray-500">{language === 'ar' ? currentTenant?.tenantNameAr : currentTenant?.tenantName}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={isActive ? 'sidebar-link-active' : 'sidebar-link'}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{(t.common as any)[item.labelKey]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => { logout(); window.location.href = '/auth/login'; }} className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="w-5 h-5" />
          <span className="text-sm">{t.common.logout}</span>
        </button>
      </div>
    </aside>
  );
}
