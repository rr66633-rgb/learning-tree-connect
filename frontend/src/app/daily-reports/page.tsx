'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { dailyReportsApi, childrenApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, FileText, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyReportsPage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ childId: '', meals: '', sleepFrom: '', sleepTo: '', sleepQuality: 'GOOD', toileting: '', activities: '', mood: 'HAPPY', teacherNotes: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { const [r, c] = await Promise.all([dailyReportsApi.getAll(), childrenApi.getAll()]); setReports(r.data); setChildren(c.data); } catch {} finally { setLoading(false); } };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await dailyReportsApi.create({ ...form, date: new Date().toISOString().split('T')[0] }); toast.success(language === 'ar' ? 'تم إنشاء التقرير' : 'Report created'); setShowCreate(false); loadData(); } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handlePublish = async (id: string) => { try { await dailyReportsApi.publish(id); toast.success(language === 'ar' ? 'تم نشر التقرير' : 'Published'); loadData(); } catch {} };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.dailyReports.title}</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{t.dailyReports.createReport}</button>
        </div>
        <div className="card">
          {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          : reports.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
          : <div className="space-y-3">{reports.map((report: any) => (
              <div key={report.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">{report.child?.firstName} - {new Date(report.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{report.mood} | {report.activities?.substring(0, 50)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${report.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{report.isPublished ? t.dailyReports.published : t.dailyReports.draft}</span>
                    {!report.isPublished && <button onClick={() => handlePublish(report.id)} className="p-1.5 rounded-lg hover:bg-green-50"><Send className="w-4 h-4 text-green-600" /></button>}
                  </div>
                </div>
              </div>
            ))}</div>}
        </div>
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t.dailyReports.createReport}</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.common.children}</label><select className="input-field" value={form.childId} onChange={e => setForm({...form, childId: e.target.value})} required><option value="">--</option>{children.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.meals}</label><input className="input-field" value={form.meals} onChange={e => setForm({...form, meals: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.mood}</label><select className="input-field" value={form.mood} onChange={e => setForm({...form, mood: e.target.value})}><option value="HAPPY">Happy</option><option value="CALM">Calm</option><option value="TIRED">Tired</option><option value="UPSET">Upset</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.sleep}</label><div className="grid grid-cols-2 gap-4"><input type="time" className="input-field" value={form.sleepFrom} onChange={e => setForm({...form, sleepFrom: e.target.value})} /><input type="time" className="input-field" value={form.sleepTo} onChange={e => setForm({...form, sleepTo: e.target.value})} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.toileting}</label><input className="input-field" value={form.toileting} onChange={e => setForm({...form, toileting: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.activities}</label><textarea className="input-field" rows={2} value={form.activities} onChange={e => setForm({...form, activities: e.target.value})}></textarea></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.dailyReports.teacherNotes}</label><textarea className="input-field" rows={2} value={form.teacherNotes} onChange={e => setForm({...form, teacherNotes: e.target.value})}></textarea></div>
                <div className="flex gap-3 pt-4"><button type="submit" className="btn-primary flex-1">{t.common.save}</button><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t.common.cancel}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
