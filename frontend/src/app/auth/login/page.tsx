'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/i18n';
import { TreePine, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.data.user, res.data.accessToken);
      toast.success(t.common.welcome + '!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(t.auth.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
            <TreePine className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Tree Connect</h1>
          <p className="text-gray-500 mt-2">{t.auth.loginSubtitle}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.auth.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="email@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.auth.password}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pe-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t.common.loading : t.auth.login}
            </button>
          </form>
        </div>
        <div className="mt-6 p-4 bg-white/80 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 text-center mb-2 font-medium">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="bg-gray-50 p-2 rounded"><p className="font-medium">Admin</p><p>admin@learningtree.sa</p></div>
            <div className="bg-gray-50 p-2 rounded"><p className="font-medium">Teacher</p><p>sara.teacher@brightstars.sa</p></div>
            <div className="bg-gray-50 p-2 rounded"><p className="font-medium">Parent</p><p>mohammed.parent@gmail.com</p></div>
            <div className="bg-gray-50 p-2 rounded"><p className="font-medium">Password</p><p>admin123 / teacher123 / parent123</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
