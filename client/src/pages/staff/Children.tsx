import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Plus, Eye, Pencil, Trash2, Archive, CheckCircle, Camera, Download } from "lucide-react";
import { useLocation } from "wouter";
import { apiUrl } from "@/lib/apiBase";


const initialFormState = {
  firstName: "",
  lastName: "",
  arabicName: "",
  dateOfBirth: "",
  gender: "male" as "male" | "female",
  nationality: "",
  childNationalId: "",
  classId: undefined as number | undefined,
  fatherName: "",
  motherName: "",
  parentEmail: "",
  parentMobile: "",
  altPhone: "",
  homeAddress: "",
  allergies: "",
  medicalConditions: "",
  medications: "",
  specialNeeds: "",
  doctorName: "",
  bloodType: "",
  medicalNotes: "",
  pickupAuthorization: "",
  busRequired: false,
  notes: "",
  photo: "",
};

export default function StaffChildren() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<any>(null);
  const [form, setForm] = useState(initialFormState);

  const { data: children = [], refetch, isLoading } = trpc.children.list.useQuery();
  const { data: classes = [] } = trpc.classes.list.useQuery();
  const createChild = trpc.children.create.useMutation({
    onSuccess: () => { refetch(); setShowAddDialog(false); setForm(initialFormState); toast.success("\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0641\u0644 \u0628\u0646\u062C\u0627\u062D"); },
    onError: (e) => toast.error(e.message),
  });
  const updateChild = trpc.children.update.useMutation({
    onSuccess: () => { refetch(); setShowEditDialog(false); setEditingChild(null); toast.success("\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0641\u0644"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteChild = trpc.children.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0637\u0641\u0644"); },
    onError: (e) => toast.error(e.message),
  });
  const archiveChild = trpc.children.archive.useMutation({
    onSuccess: () => { refetch(); toast.success("\u062A\u0645 \u0623\u0631\u0634\u0641\u0629 \u0627\u0644\u0637\u0641\u0644"); },
    onError: (e) => toast.error(e.message),
  });
  const activateChild = trpc.children.activate.useMutation({
    onSuccess: () => { refetch(); toast.success("\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0637\u0641\u0644"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (children as any[]).filter((c: any) => {
      const matchSearch = !search || `${c.firstName} ${c.lastName} ${c.arabicName || ""}`.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || String(c.classId) === classFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchClass && matchStatus;
    });
  }, [children, search, classFilter, statusFilter]);

  const handleCreate = () => {
    if (!form.firstName || !form.lastName || !form.dateOfBirth) {
      toast.error("\u064A\u0631\u062C\u0649 \u062A\u0639\u0628\u0626\u0629 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644\u060C \u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629\u060C \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u064A\u0644\u0627\u062F");
      return;
    }
    createChild.mutate({
      ...form,
      classId: form.classId || undefined,
      busRequired: form.busRequired,
    });
  };

  const handleEdit = (child: any) => {
    setEditingChild(child);
    setForm({
      firstName: child.firstName || "",
      lastName: child.lastName || "",
      arabicName: child.arabicName || "",
      dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split("T")[0] : "",
      gender: child.gender || "male",
      nationality: child.nationality || "",
      childNationalId: child.childNationalId || "",
      classId: child.classId || undefined,
      fatherName: child.fatherName || "",
      motherName: child.motherName || "",
      parentEmail: child.parentEmail || "",
      parentMobile: child.parentMobile || "",
      altPhone: child.altPhone || "",
      homeAddress: child.homeAddress || "",
      allergies: child.allergies || "",
      medicalConditions: child.medicalConditions || "",
      medications: child.medications || "",
      specialNeeds: child.specialNeeds || "",
      doctorName: child.doctorName || "",
      bloodType: child.bloodType || "",
      medicalNotes: child.medicalNotes || "",
      pickupAuthorization: child.pickupAuthorization || "",
      busRequired: child.busRequired || false,
      notes: child.notes || "",
      photo: child.photo || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingChild) return;
    updateChild.mutate({
      id: editingChild.id,
      ...form,
      classId: form.classId || null,
    });
  };

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار صورة'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('حجم الصورة يجب أن يكون أقل من 10 ميغابايت'); return; }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload-photo'), { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setForm(prev => ({ ...prev, photo: data.url }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (err) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const renderForm = () => (
    <Tabs defaultValue="personal" className="w-full" dir="rtl">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="personal">{t('children.personalData')}</TabsTrigger>
        <TabsTrigger value="parent">{t('children.parentInfo')}</TabsTrigger>
        <TabsTrigger value="medical">{t('children.medicalInfo')}</TabsTrigger>
        <TabsTrigger value="nursery">{t('children.nurseryInfo')}</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-4 mt-4">
        {/* Child Photo Upload */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="relative cursor-pointer" onClick={() => photoInputRef.current?.click()}>
            {form.photo ? (
              <img src={form.photo} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                <Camera className="h-8 w-8 text-primary/50" />
              </div>
            )}
            <div className="absolute -bottom-1 -left-1 bg-primary text-white rounded-full p-1">
              <Camera className="h-3 w-3" />
            </div>
          </div>
          <div>
            <p className="font-medium text-sm">{form.photo ? 'تغيير الصورة' : 'إضافة صورة الطفل'}</p>
            <p className="text-xs text-muted-foreground">{uploadingPhoto ? 'جارٍ الرفع...' : 'اضغط لرفع صورة أو التقاطها من الكاميرا'}</p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('children.firstName')} *</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.lastName')} *</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.arabicName')}</Label>
            <Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.dateOfBirth')} *</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.gender')} *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "male" | "female" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('children.male')}</SelectItem>
                <SelectItem value="female">{t('children.female')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('children.nationality')}</Label>
            <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.nationalId')}</Label>
            <Input value={form.childNationalId} onChange={(e) => setForm({ ...form, childNationalId: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.class')}</Label>
            <Select value={form.classId ? String(form.classId) : "none"} onValueChange={(v) => setForm({ ...form, classId: v === "none" ? undefined : Number(v) })}>
              <SelectTrigger><SelectValue placeholder={t('children.selectClass')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('children.noClass')}</SelectItem>
                {(classes as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nameAr || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="parent" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('children.fatherName')}</Label>
            <Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.motherName')}</Label>
            <Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.email')}</Label>
            <Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} dir="ltr" />
          </div>
          <div>
            <Label>{t('children.mobile')}</Label>
            <Input value={form.parentMobile} onChange={(e) => setForm({ ...form, parentMobile: e.target.value })} dir="ltr" />
          </div>
          <div>
            <Label>{t('children.altPhone')}</Label>
            <Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} dir="ltr" />
          </div>
          <div className="col-span-2">
            <Label>{t('children.address')}</Label>
            <Textarea value={form.homeAddress} onChange={(e) => setForm({ ...form, homeAddress: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="medical" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('children.allergies')}</Label>
            <Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.medicalConditions')}</Label>
            <Textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.medications')}</Label>
            <Textarea value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.specialNeeds')}</Label>
            <Textarea value={form.specialNeeds} onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.doctorName')}</Label>
            <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
          </div>
          <div>
            <Label>{t('children.bloodType')}</Label>
            <Select value={form.bloodType || "unknown"} onValueChange={(v) => setForm({ ...form, bloodType: v === "unknown" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder={"\u0627\u062E\u062A\u0631"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">{t('children.unknown')}</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>{t('children.medicalNotes')}</Label>
            <Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="nursery" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>{t('children.pickupAuth')}</Label>
            <Textarea value={form.pickupAuthorization} onChange={(e) => setForm({ ...form, pickupAuthorization: e.target.value })} rows={4} placeholder={t('children.pickupPlaceholder')} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.busRequired} onCheckedChange={(v) => setForm({ ...form, busRequired: v })} />
            <Label>{t('children.busRequired')}</Label>
          </div>
          <div>
            <Label>{t('children.generalNotes')}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('children.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} {t('children.childRegistered')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => {
              const params = new URLSearchParams();
              if (classFilter !== 'all') params.set('classId', classFilter);
              if (statusFilter !== 'all') params.set('status', statusFilter);
              const url = `/api/export-children${params.toString() ? '?' + params.toString() : ''}`;
              toast.info(t('children.exportDownloading'));
              fetch(url, { credentials: 'include' })
                .then(r => {
                  if (!r.ok) throw new Error('export failed');
                  return r.blob();
                })
                .then(blob => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `children_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  toast.success(t('children.exportSuccess'));
                })
                .catch(() => toast.error(t('children.exportFailed')));
            }}
          >
            <Download className="h-4 w-4" />
            {t('children.exportExcel')}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setForm(initialFormState); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-sm btn-press"><Plus className="ml-2 h-4 w-4" /> {t('children.addChild')}</Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('children.addNewChild')}</DialogTitle>
            </DialogHeader>
            {renderForm()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('children.cancel')}</Button>
              <Button onClick={handleCreate} disabled={createChild.isPending}>
                {createChild.isPending ? t('children.saving') : t('children.save')}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('children.searchByName')} className="pr-10 rounded-xl" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('children.allClasses')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('children.allClasses')}</SelectItem>
            {(classes as any[]).map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nameAr || c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('children.allStatuses')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('children.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('children.active')}</SelectItem>
            <SelectItem value="inactive">{t('children.inactive')}</SelectItem>
            <SelectItem value="graduated">{t('children.graduated')}</SelectItem>
            <SelectItem value="waitlist">{t('children.waitlist')}</SelectItem>
          </SelectContent>
        </Select>
      </div>



      {/* Children Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-right">{t('children.name')}</th>
                  <th className="p-3 text-right">{t('children.arabicName')}</th>
                  <th className="p-3 text-right">{t('children.class')}</th>
                  <th className="p-3 text-right">{t('children.dateOfBirth')}</th>
                  <th className="p-3 text-right">{t('children.gender')}</th>
                  <th className="p-3 text-right">{t('children.status')}</th>
                  <th className="p-3 text-right">{t('children.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && [1,2,3,4,5].map(i => (
                  <tr key={`skel-${i}`} className="border-t"><td className="p-3" colSpan={7}><div className="h-4 bg-muted animate-pulse rounded w-full" /></td></tr>
                ))}
                {filtered.map((child: any) => (
                  <tr key={child.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        {child.photo ? (
                          <img src={child.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(child.firstName?.[0] || "")}{(child.lastName?.[0] || "")}
                          </div>
                        )}
                        <span>{child.firstName} {child.lastName}</span>
                      </div>
                    </td>
                    <td className="p-3">{child.arabicName || "-"}</td>
                    <td className="p-3">{(classes as any[]).find((c: any) => c.id === child.classId)?.nameAr || (classes as any[]).find((c: any) => c.id === child.classId)?.name || "-"}</td>
                    <td className="p-3">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString("ar-SA") : "-"}</td>
                    <td className="p-3">{child.gender === "male" ? t('children.male') : t('children.female')}</td>
                    <td className="p-3">
                      <Badge variant={child.status === "active" ? "default" : "secondary"}>
                        {child.status === "active" ? t('children.active') : child.status === "inactive" ? t('children.inactive') : child.status === "graduated" ? t('children.graduated') : t('children.waitlist')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/staff/children/${child.id}`)} title={t('children.viewProfile')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(child)} title={t('children.edit')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {child.status === "active" ? (
                          <Button size="sm" variant="ghost" onClick={() => archiveChild.mutate({ id: child.id })} title={t('children.archive')}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => activateChild.mutate({ id: child.id })} title={t('children.activate')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive" title={t('children.delete')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('children.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('children.confirmDeleteMsg')} {child.firstName} {child.lastName}? {t('children.cannotUndo')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteChild.mutate({ id: child.id })}>{t('children.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">{t('children.noChildren')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setEditingChild(null); setForm(initialFormState); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('children.editChild')}</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('children.cancel')}</Button>
            <Button onClick={handleUpdate} disabled={updateChild.isPending}>
              {updateChild.isPending ? t('children.saving') : t('children.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
