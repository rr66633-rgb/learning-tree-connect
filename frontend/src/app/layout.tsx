'use client';
import '../styles/globals.css';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { hydrate, language } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <html lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <title>Learning Tree Connect</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        <Toaster position={language === 'ar' ? 'top-left' : 'top-right'} />
      </body>
    </html>
  );
}
