'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { loyaltyApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Gift, Star, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [balance, setBalance] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [b, r, tr] = await Promise.all([loyaltyApi.getBalance(), loyaltyApi.getRewards(), loyaltyApi.getTransactions()]);
      setBalance(b.data); setRewards(r.data); setTransactions(tr.data);
    } catch {} finally { setLoading(false); }
  };

  const handleRedeem = async (rewardId: string) => {
    try { await loyaltyApi.redeemReward(rewardId); toast.success(language === 'ar' ? 'تم استبدال المكافأة بنجاح' : 'Reward redeemed!'); loadData(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.loyalty.title}</h1>
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">{t.loyalty.balance}</p>
              <p className="text-4xl font-bold mt-1">{balance?.points || 0}</p>
              <p className="text-emerald-200 text-sm mt-1">{t.loyalty.points}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><Trophy className="w-8 h-8" /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rewards */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.loyalty.rewards}</h2>
            {rewards.length === 0 ? <p className="text-gray-500 text-sm">{t.common.noData}</p>
            : <div className="space-y-3">{rewards.map((reward: any) => (
                <div key={reward.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Gift className="w-5 h-5 text-amber-600" /></div>
                    <div><p className="font-medium text-gray-900">{language === 'ar' ? reward.nameAr || reward.name : reward.name}</p><p className="text-xs text-gray-500">{reward.pointsCost} {t.loyalty.points}</p></div>
                  </div>
                  <button onClick={() => handleRedeem(reward.id)} disabled={(balance?.points || 0) < reward.pointsCost} className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50">{t.loyalty.redeem}</button>
                </div>
              ))}</div>}
          </div>

          {/* Transactions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.loyalty.transactions}</h2>
            {transactions.length === 0 ? <p className="text-gray-500 text-sm">{t.common.noData}</p>
            : <div className="space-y-3">{transactions.map((tx: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      {tx.points > 0 ? <ArrowUpRight className="w-4 h-4 text-green-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                    </div>
                    <div><p className="text-sm font-medium text-gray-900">{tx.description}</p><p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p></div>
                  </div>
                  <span className={`font-medium text-sm ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>{tx.points > 0 ? '+' : ''}{tx.points}</span>
                </div>
              ))}</div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
