'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from '@/i18n';
import { childrenApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildrenPage() {
  const { t } = useTranslation();
  const { language } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', firstNameAr: '', lastNameAr: '', dateOfBirth: '', gender: 'MALE', nationality: 'Saudi', bloodType: '', allergies: '', medicalNotes: '' });

  useEffect(() => { loadChildren(); }, []);
  const loadChildren = async () => { try { const res = await childrenApi.getAll(); setChildren(res.data); } catch { setChildren([]); } finally { setLoading(false); } };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await childrenApi.create(formData); toast.success(language === 'ar' ? 'تم إضافة الطفل بنجاح' : 'Child added'); setShowAddModal(false); loadChildren(); } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const filtered = children.filter(c => `${c.firstName} ${c.lastName} ${c.firstNameAr} ${c.lastNameAr}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.children.title}</h1>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{t.children.addChild}</button>
        </div>
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.common.search + '...'} className="input-field ps-10" /></div>
          </div>
          {loading ? <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          : filtered.length === 0 ? <div className="text-center py-12 text-gray-500">{t.common.noData}</div>
          : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100">
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.common.name}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.children.dateOfBirth}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.children.gender}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.common.status}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{t.common.actions}</th>
            </tr></thead><tbody>
              {filtered.map((child) => (
                <tr key={child.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center"><span className="text-emerald-700 font-medium text-sm">{(language === 'ar' ? child.firstNameAr : child.firstName)?.[0]}</span></div><p className="font-medium text-gray-900">{language === 'ar' ? `${child.firstNameAr || child.firstName} ${child.lastNameAr || child.lastName}` : `${child.firstName} ${child.lastName}`}</p></div></td>
                  <td className="py-3 px-4 text-sm text-gray-600">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{child.gender === 'MALE' ? t.children.male : t.children.female}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${child.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{child.status === 'ACTIVE' ? t.common.active : t.common.inactive}</span></td>
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><button className="p-1.5 rounded-lg hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-500" /></button><button className="p-1.5 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-500" /></button></div></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t.children.addChild}</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.firstName} (EN)</label><input className="input-field" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.lastName} (EN)</label><input className="input-field" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.firstName} (AR)</label><input className="input-field" value={formData.firstNameAr} onChange={e => setFormData({...formData, firstNameAr: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.lastName} (AR)</label><input className="input-field" value={formData.lastNameAr} onChange={e => setFormData({...formData, lastNameAr: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.dateOfBirth}</label><input type="date" className="input-field" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.gender}</label><select className="input-field" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option value="MALE">{t.children.male}</option><option value="FEMALE">{t.children.female}</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.allergies}</label><input className="input-field" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.children.medicalNotes}</label><textarea className="input-field" rows={2} value={formData.medicalNotes} onChange={e => setFormData({...formData, medicalNotes: e.target.value})}></textarea></div>
                <div className="flex gap-3 pt-4"><button type="submit" className="btn-primary flex-1">{t.common.save}</button><button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">{t.common.cancel}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
