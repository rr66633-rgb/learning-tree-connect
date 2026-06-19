import { useState, useMemo, useRef } from "react";
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
import { Search, Plus, Eye, Pencil, Trash2, Archive, CheckCircle, Camera } from "lucide-react";
import { useLocation } from "wouter";


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
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<any>(null);
  const [form, setForm] = useState(initialFormState);

  const { data: children = [], refetch } = trpc.children.list.useQuery();
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
      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData, credentials: 'include' });
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
        <TabsTrigger value="personal">{"البيانات الشخصية"}</TabsTrigger>
        <TabsTrigger value="parent">{"ولي الأمر"}</TabsTrigger>
        <TabsTrigger value="medical">{"المعلومات الطبية"}</TabsTrigger>
        <TabsTrigger value="nursery">{"الحضانة"}</TabsTrigger>
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
            <Label>{"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 *"}</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 *"}</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A"}</Label>
            <Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u064A\u0644\u0627\u062F *"}</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u062C\u0646\u0633 *"}</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "male" | "female" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{"\u0630\u0643\u0631"}</SelectItem>
                <SelectItem value="female">{"\u0623\u0646\u062B\u0649"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{"\u0627\u0644\u062C\u0646\u0633\u064A\u0629"}</Label>
            <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 / \u0627\u0644\u0625\u0642\u0627\u0645\u0629"}</Label>
            <Input value={form.childNationalId} onChange={(e) => setForm({ ...form, childNationalId: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u0641\u0635\u0644"}</Label>
            <Select value={form.classId ? String(form.classId) : "none"} onValueChange={(v) => setForm({ ...form, classId: v === "none" ? undefined : Number(v) })}>
              <SelectTrigger><SelectValue placeholder={"\u0627\u062E\u062A\u0631 \u0627\u0644\u0641\u0635\u0644"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{"\u0628\u062F\u0648\u0646 \u0641\u0635\u0644"}</SelectItem>
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
            <Label>{"\u0627\u0633\u0645 \u0627\u0644\u0623\u0628"}</Label>
            <Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0633\u0645 \u0627\u0644\u0623\u0645"}</Label>
            <Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"}</Label>
            <Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} dir="ltr" />
          </div>
          <div>
            <Label>{"\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644"}</Label>
            <Input value={form.parentMobile} onChange={(e) => setForm({ ...form, parentMobile: e.target.value })} dir="ltr" />
          </div>
          <div>
            <Label>{"\u0631\u0642\u0645 \u0628\u062F\u064A\u0644"}</Label>
            <Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} dir="ltr" />
          </div>
          <div className="col-span-2">
            <Label>{"\u0627\u0644\u0639\u0646\u0648\u0627\u0646"}</Label>
            <Textarea value={form.homeAddress} onChange={(e) => setForm({ ...form, homeAddress: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="medical" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{"\u0627\u0644\u062D\u0633\u0627\u0633\u064A\u0629"}</Label>
            <Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629"}</Label>
            <Textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u0623\u062F\u0648\u064A\u0629"}</Label>
            <Textarea value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0644\u0627\u062D\u062A\u064A\u0627\u062C\u0627\u062A \u0627\u0644\u062E\u0627\u0635\u0629"}</Label>
            <Textarea value={form.specialNeeds} onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0627\u0633\u0645 \u0627\u0644\u0637\u0628\u064A\u0628"}</Label>
            <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
          </div>
          <div>
            <Label>{"\u0641\u0635\u064A\u0644\u0629 \u0627\u0644\u062F\u0645"}</Label>
            <Select value={form.bloodType || "unknown"} onValueChange={(v) => setForm({ ...form, bloodType: v === "unknown" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder={"\u0627\u062E\u062A\u0631"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">{"\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}</SelectItem>
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
            <Label>{"\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0637\u0628\u064A\u0629"}</Label>
            <Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="nursery" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>{"\u0627\u0644\u0645\u0635\u0631\u062D \u0644\u0647\u0645 \u0628\u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645"}</Label>
            <Textarea value={form.pickupAuthorization} onChange={(e) => setForm({ ...form, pickupAuthorization: e.target.value })} rows={4} placeholder={"\u0627\u0633\u0645 - \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 - \u0635\u0644\u0629 \u0627\u0644\u0642\u0631\u0627\u0628\u0629"} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.busRequired} onCheckedChange={(v) => setForm({ ...form, busRequired: v })} />
            <Label>{"\u064A\u062D\u062A\u0627\u062C \u0646\u0642\u0644 \u0628\u0627\u0644\u0628\u0627\u0635"}</Label>
          </div>
          <div>
            <Label>{"\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0639\u0627\u0645\u0629"}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{"\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644"}</h1>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setForm(initialFormState); }}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> {"\u0625\u0636\u0627\u0641\u0629 \u0637\u0641\u0644"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{"\u0625\u0636\u0627\u0641\u0629 \u0637\u0641\u0644 \u062C\u062F\u064A\u062F"}</DialogTitle>
            </DialogHeader>
            {renderForm()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{"\u0625\u0644\u063A\u0627\u0621"}</Button>
              <Button onClick={handleCreate} disabled={createChild.isPending}>
                {createChild.isPending ? "\u062C\u0627\u0631\u064D \u0627\u0644\u062D\u0641\u0638..." : "\u062D\u0641\u0638"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={"\u0628\u062D\u062B \u0628\u0627\u0644\u0627\u0633\u0645..."} className="pr-10" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={"\u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0635\u0648\u0644"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"\u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0635\u0648\u0644"}</SelectItem>
            {(classes as any[]).map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nameAr || c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={"\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0627\u0644\u0627\u062A"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0627\u0644\u0627\u062A"}</SelectItem>
            <SelectItem value="active">{"\u0646\u0634\u0637"}</SelectItem>
            <SelectItem value="inactive">{"\u063A\u064A\u0631 \u0646\u0634\u0637"}</SelectItem>
            <SelectItem value="graduated">{"\u0645\u062A\u062E\u0631\u062C"}</SelectItem>
            <SelectItem value="waitlist">{"\u0642\u0627\u0626\u0645\u0629 \u0627\u0646\u062A\u0638\u0627\u0631"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{"\u0625\u062C\u0645\u0627\u0644\u064A:"} {filtered.length} {"\u0637\u0641\u0644"}</p>

      {/* Children Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-right">{"\u0627\u0644\u0627\u0633\u0645"}</th>
                  <th className="p-3 text-right">{"\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A"}</th>
                  <th className="p-3 text-right">{"\u0627\u0644\u0641\u0635\u0644"}</th>
                  <th className="p-3 text-right">{"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u064A\u0644\u0627\u062F"}</th>
                  <th className="p-3 text-right">{"\u0627\u0644\u062C\u0646\u0633"}</th>
                  <th className="p-3 text-right">{"\u0627\u0644\u062D\u0627\u0644\u0629"}</th>
                  <th className="p-3 text-right">{"\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A"}</th>
                </tr>
              </thead>
              <tbody>
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
                    <td className="p-3">{child.gender === "male" ? "\u0630\u0643\u0631" : "\u0623\u0646\u062B\u0649"}</td>
                    <td className="p-3">
                      <Badge variant={child.status === "active" ? "default" : "secondary"}>
                        {child.status === "active" ? "\u0646\u0634\u0637" : child.status === "inactive" ? "\u063A\u064A\u0631 \u0646\u0634\u0637" : child.status === "graduated" ? "\u0645\u062A\u062E\u0631\u062C" : "\u0642\u0627\u0626\u0645\u0629 \u0627\u0646\u062A\u0638\u0627\u0631"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/staff/child/${child.id}`)} title={"\u0639\u0631\u0636 \u0627\u0644\u0645\u0644\u0641"}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(child)} title={"\u062A\u0639\u062F\u064A\u0644"}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {child.status === "active" ? (
                          <Button size="sm" variant="ghost" onClick={() => archiveChild.mutate({ id: child.id })} title={"\u0623\u0631\u0634\u0641\u0629"}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => activateChild.mutate({ id: child.id })} title={"\u062A\u0641\u0639\u064A\u0644"}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive" title={"\u062D\u0630\u0641"}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{"\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0630\u0641"}</AlertDialogTitle>
                              <AlertDialogDescription>{"\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641"} {child.firstName} {child.lastName}{"? \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621."}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{"\u0625\u0644\u063A\u0627\u0621"}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteChild.mutate({ id: child.id })}>{"\u062D\u0630\u0641"}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">{"\u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u0637\u0641\u0627\u0644 \u0645\u0633\u062C\u0644\u064A\u0646"}</td>
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
            <DialogTitle>{"\u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0641\u0644"}</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{"\u0625\u0644\u063A\u0627\u0621"}</Button>
            <Button onClick={handleUpdate} disabled={updateChild.isPending}>
              {updateChild.isPending ? "\u062C\u0627\u0631\u064D \u0627\u0644\u062D\u0641\u0638..." : "\u062D\u0641\u0638 \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
