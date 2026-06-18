'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  const router = useRouter();

  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ms-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
