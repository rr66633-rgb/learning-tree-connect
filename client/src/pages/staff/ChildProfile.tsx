import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, UserPlus, Unlink, Calendar, Phone, Heart, AlertTriangle, Bus, Shield, User, FileText, Upload, CheckCircle, XCircle, Download, Trash2, Camera, Plus, IdCard } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ChildProfile() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const params = useParams<{ id: string }>();
  const childId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationship, setRelationship] = useState("parent");

  const { data: child, isLoading, refetch } = trpc.children.getById.useQuery({ id: childId });
  const { data: parents, refetch: refetchParents } = trpc.children.getParents.useQuery({ childId });
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();
  const { data: childDocs = [], refetch: refetchDocs } = trpc.childDocuments.listByChild.useQuery({ childId });

  const createDoc = trpc.childDocuments.create.useMutation({ onSuccess: () => { refetchDocs(); toast.success(isAr ? "تم رفع المستند" : "Document uploaded"); } });
  const approveDoc = trpc.childDocuments.approve.useMutation({ onSuccess: () => { refetchDocs(); toast.success(isAr ? "تم اعتماد المستند" : "Document approved"); } });
  const rejectDoc = trpc.childDocuments.reject.useMutation({ onSuccess: () => { refetchDocs(); toast.success(isAr ? "تم رفض المستند" : "Document rejected"); } });
  const deleteDoc = trpc.childDocuments.delete.useMutation({ onSuccess: () => { refetchDocs(); toast.success(isAr ? "تم حذف المستند" : "Document deleted"); } });

  const [docUploading, setDocUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>("other");

  // Authorized Pickup Persons
  const { data: authorizedPersons = [], refetch: refetchAuthorized } = trpc.pickup.authorizedPersons.useQuery({ childId });
  const addAuthorizedPerson = trpc.pickup.addAuthorizedPerson.useMutation({
    onSuccess: () => { refetchAuthorized(); toast.success(isAr ? "تم إضافة الشخص المخول" : "Authorized person added"); setAddPersonDialog(false); resetPersonForm(); },
    onError: (err) => toast.error(err.message),
  });
  const removeAuthorizedPerson = trpc.pickup.removeAuthorizedPerson.useMutation({
    onSuccess: () => { refetchAuthorized(); toast.success(isAr ? "تم إزالة الشخص المخول" : "Authorized person removed"); },
    onError: (err) => toast.error(err.message),
  });
  const [addPersonDialog, setAddPersonDialog] = useState(false);
  const [personForm, setPersonForm] = useState({ name: "", relationship: "father" as string, phone: "", nationalId: "" });
  const resetPersonForm = () => setPersonForm({ name: "", relationship: "father", phone: "", nationalId: "" });

  const updateChild = trpc.children.update.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث بيانات الطفل بنجاح" : "Child data updated successfully");
      setEditing(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const linkParent = trpc.users.linkChild.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم ربط ولي الأمر بنجاح" : "Parent linked successfully");
      setLinkDialogOpen(false);
      setSelectedParentId("");
      refetchParents();
    },
    onError: (err) => toast.error(err.message),
  });

  const unlinkParent = trpc.users.unlinkChild.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إلغاء ربط ولي الأمر" : "Parent unlinked");
      refetchParents();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<any>({});

  const uploadFile = async (file: File, endpoint: string): Promise<{ url: string; key?: string; mimeType?: string }> => {
    if (endpoint === '/api/upload-document' || endpoint === '/api/upload-photo') {
      // Use FormData for multer-based endpoints
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(endpoint, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    }
    // Use base64 JSON for the standard /api/upload endpoint
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: base64, fileName: `${Date.now()}-${file.name}`, contentType: file.type }),
          });
          if (!response.ok) throw new Error('Upload failed');
          resolve(await response.json());
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error(isAr ? "حجم الملف كبير جداً (الحد الأقصى 16 ميجابايت)" : "File too large (maximum 16MB)"); return; }
    setDocUploading(true);
    try {
      const { url, key, mimeType } = await uploadFile(file, '/api/upload-document');
      await createDoc.mutateAsync({ childId, type: docType as any, name: file.name, fileUrl: url, fileKey: key, mimeType });
    } catch { toast.error(isAr ? "فشل رفع المستند" : "Failed to upload document"); }
    setDocUploading(false);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(isAr ? "حجم الصورة كبير جداً" : "Image size too large"); return; }
    setPhotoUploading(true);
    try {
      const { url } = await uploadFile(file, '/api/upload');
      await updateChild.mutateAsync({ id: childId, photo: url });
      toast.success(isAr ? "تم تحديث الصورة" : "Photo updated");
    } catch { toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image"); }
    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const startEditing = () => {
    if (child) {
      const c = child as any;
      setForm({
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        arabicName: c.arabicName || "",
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split("T")[0] : "",
        gender: c.gender || "male",
        nationality: c.nationality || "",
        childNationalId: c.childNationalId || "",
        classId: c.classId ? String(c.classId) : "",
        fatherName: c.fatherName || "",
        motherName: c.motherName || "",
        parentEmail: c.parentEmail || "",
        parentMobile: c.parentMobile || "",
        altPhone: c.altPhone || "",
        homeAddress: c.homeAddress || "",
        allergies: c.allergies || "",
        medicalConditions: c.medicalConditions || "",
        medications: c.medications || "",
        specialNeeds: c.specialNeeds || "",
        doctorName: c.doctorName || "",
        bloodType: c.bloodType || "",
        medicalNotes: c.medicalNotes || "",
        pickupAuthorization: c.pickupAuthorization || "",
        busRequired: c.busRequired || false,
        notes: c.notes || "",
      });
      setEditing(true);
    }
  };

  const handleSave = () => {
    const updateData: any = {
      id: childId,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      arabicName: form.arabicName || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      nationality: form.nationality || undefined,
      childNationalId: form.childNationalId || undefined,
      classId: form.classId ? parseInt(form.classId) : null,
      fatherName: form.fatherName || undefined,
      motherName: form.motherName || undefined,
      parentEmail: form.parentEmail || undefined,
      parentMobile: form.parentMobile || undefined,
      altPhone: form.altPhone || undefined,
      homeAddress: form.homeAddress || undefined,
      allergies: form.allergies || undefined,
      medicalConditions: form.medicalConditions || undefined,
      medications: form.medications || undefined,
      specialNeeds: form.specialNeeds || undefined,
      doctorName: form.doctorName || undefined,
      bloodType: form.bloodType || undefined,
      medicalNotes: form.medicalNotes || undefined,
      pickupAuthorization: form.pickupAuthorization || undefined,
      busRequired: form.busRequired,
      notes: form.notes || undefined,
    };
    updateChild.mutate(updateData);
  };

  const parentUsers = allUsers?.filter((u: any) => u.role === "parent") || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <h2 className="text-xl font-bold text-destructive">الطفل غير موجود</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/staff/children")}>
          <ArrowRight className="ml-2 h-4 w-4" /> العودة للقائمة
        </Button>
      </div>
    );
  }

  const c = child as any;
  const childName = `${c.firstName} ${c.lastName}`;
  const classNameStr = (classes as any[])?.find((cl: any) => cl.id === c.classId)?.nameAr || (classes as any[])?.find((cl: any) => cl.id === c.classId)?.name || "—";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/children")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          {/* Photo */}
          <div className="relative group">
            {c.photo ? (
              <img src={c.photo} alt={childName} className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary/60" />
              </div>
            )}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              disabled={photoUploading}
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input ref={photoInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{childName}</h1>
            {c.arabicName && <p className="text-muted-foreground">{c.arabicName}</p>}
          </div>
          <Badge variant={c.status === "active" ? "default" : "secondary"}>
            {c.status === "active" ? "نشط" : c.status === "inactive" ? "غير نشط" : c.status === "graduated" ? "متخرج" : "قائمة انتظار"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" onClick={startEditing}>
              <Edit className="ml-2 h-4 w-4" /> تعديل
            </Button>
          )}
          <Button onClick={() => setLinkDialogOpen(true)}>
            <UserPlus className="ml-2 h-4 w-4" /> ربط ولي أمر
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
          <TabsTrigger value="parent">{isAr ? "ولي الأمر" : "Parent"}</TabsTrigger>
          <TabsTrigger value="medical">الطبية</TabsTrigger>
          <TabsTrigger value="nursery">الحضانة</TabsTrigger>
          <TabsTrigger value="documents">{isAr ? "المستندات" : "Documents"}</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>الاسم الأول</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div><Label>اسم العائلة</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                  <div><Label>الاسم بالعربي</Label><Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} /></div>
                  <div><Label>تاريخ الميلاد</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                  <div>
                    <Label>الجنس</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>الجنسية</Label><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
                  <div><Label>رقم الهوية / الإقامة</Label><Input value={form.childNationalId} onChange={(e) => setForm({ ...form, childNationalId: e.target.value })} /></div>
                  <div>
                    <Label>{isAr ? "الفصل" : "Class"}</Label>
                    <Select value={form.classId || "none"} onValueChange={(v) => setForm({ ...form, classId: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون فصل</SelectItem>
                        {(classes as any[])?.map((cl: any) => (
                          <SelectItem key={cl.id} value={String(cl.id)}>{cl.nameAr || cl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="الاسم الأول" value={c.firstName} />
                  <InfoRow label="اسم العائلة" value={c.lastName} />
                  <InfoRow label="الاسم بالعربي" value={c.arabicName || "—"} />
                  <InfoRow label="تاريخ الميلاد" value={c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString("ar-SA") : "—"} />
                  <InfoRow label="الجنس" value={c.gender === "male" ? "ذكر" : c.gender === "female" ? "أنثى" : "—"} />
                  <InfoRow label="الجنسية" value={c.nationality || "—"} />
                  <InfoRow label="رقم الهوية / الإقامة" value={c.childNationalId || "—"} />
                  <InfoRow label="الفصل" value={classNameStr} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parent Info Tab */}
        <TabsContent value="parent" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> بيانات ولي الأمر</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>اسم الأب</Label><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></div>
                  <div><Label>اسم الأم</Label><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></div>
                  <div><Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} dir="ltr" /></div>
                  <div><Label>{isAr ? "رقم الجوال" : "Phone"}</Label><Input value={form.parentMobile} onChange={(e) => setForm({ ...form, parentMobile: e.target.value })} dir="ltr" /></div>
                  <div><Label>رقم بديل</Label><Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} dir="ltr" /></div>
                  <div className="col-span-full"><Label>العنوان</Label><Textarea value={form.homeAddress} onChange={(e) => setForm({ ...form, homeAddress: e.target.value })} /></div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="اسم الأب" value={c.fatherName || "—"} />
                  <InfoRow label="اسم الأم" value={c.motherName || "—"} />
                  <InfoRow label="البريد الإلكتروني" value={c.parentEmail || "—"} />
                  <InfoRow label="رقم الجوال" value={c.parentMobile || "—"} />
                  <InfoRow label="رقم بديل" value={c.altPhone || "—"} />
                  <InfoRow label="العنوان" value={c.homeAddress || "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Parents */}
          {(parents as any[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">أولياء الأمور المرتبطون</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(parents as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{p.parentName || p.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.relationship === "father" ? "أب" : p.relationship === "mother" ? "أم" : "ولي أمر"}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => unlinkParent.mutate({ parentId: p.parentId || p.id, childId })}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> المعلومات الطبية</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>الحساسية</Label><Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
                  <div><Label>الحالات الطبية</Label><Textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} /></div>
                  <div><Label>الأدوية</Label><Input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} /></div>
                  <div><Label>الاحتياجات الخاصة</Label><Input value={form.specialNeeds} onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })} /></div>
                  <div><Label>اسم الطبيب</Label><Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} /></div>
                  <div>
                    <Label>فصيلة الدم</Label>
                    <Select value={form.bloodType || "unknown"} onValueChange={(v) => setForm({ ...form, bloodType: v === "unknown" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">غير محدد</SelectItem>
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
                  <div className="col-span-full"><Label>ملاحظات طبية</Label><Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} /></div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="الحساسية" value={c.allergies || "لا يوجد"} />
                  <InfoRow label="الحالات الطبية" value={c.medicalConditions || "لا يوجد"} />
                  <InfoRow label="الأدوية" value={c.medications || "لا يوجد"} />
                  <InfoRow label="الاحتياجات الخاصة" value={c.specialNeeds || "لا يوجد"} />
                  <InfoRow label="اسم الطبيب" value={c.doctorName || "—"} />
                  <InfoRow label="فصيلة الدم" value={c.bloodType || "—"} />
                  <div className="col-span-full"><InfoRow label="ملاحظات طبية" value={c.medicalNotes || "—"} /></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nursery Tab */}
        <TabsContent value="nursery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> بيانات الحضانة</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.busRequired} onCheckedChange={(v) => setForm({ ...form, busRequired: v })} />
                    <Label>يحتاج نقل بالباص</Label>
                  </div>
                  <div><Label>ملاحظات عامة</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">نقل بالباص:</span>
                    <Badge variant={c.busRequired ? "default" : "secondary"}>{c.busRequired ? "نعم" : "لا"}</Badge>
                  </div>
                  <InfoRow label="ملاحظات" value={c.notes || "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorized Pickup Persons Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> الأشخاص المصرح لهم بالاستلام</span>
                <Button size="sm" onClick={() => setAddPersonDialog(true)}>
                  <Plus className="h-4 w-4 ml-1" /> إضافة شخص
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authorizedPersons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا يوجد أشخاص مصرح لهم بالاستلام</p>
                  <p className="text-xs mt-1">أضف الأشخاص المخولين باستلام الطفل</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {authorizedPersons.map((person: any) => {
                    const isAutoParent = person.id < 0;
                    const relLabels: Record<string, string> = { father: "الأب", mother: "الأم", grandfather: "الجد", grandmother: "الجدة", driver: "السائق", relative: "قريب", other: "آخر" };
                    return (
                      <div key={person.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isAutoParent ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{person.name}</p>
                            {isAutoParent && <Badge variant="secondary" className="text-xs">ولي أمر مرتبط</Badge>}
                            <Badge className="bg-green-100 text-green-800 text-xs">مصرح</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{relLabels[person.relationship] || person.relationship}</span>
                            {person.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{person.phone}</span>}
                            {person.nationalId && <span className="flex items-center gap-1"><IdCard className="h-3 w-3" />{person.nationalId}</span>}
                          </div>
                        </div>
                        {!isAutoParent && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeAuthorizedPerson.mutate({ id: person.id })}
                            disabled={removeAuthorizedPerson.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2"><FileText className="h-5 w-5" /> مستندات الطفل</span>
                <div className="flex items-center gap-2">
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="w-[140px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birth_certificate">شهادة ميلاد</SelectItem>
                      <SelectItem value="family_id">سجل الأسرة</SelectItem>
                      <SelectItem value="immunization">سجل التطعيمات</SelectItem>
                      <SelectItem value="passport">جواز سفر</SelectItem>
                      <SelectItem value="national_id">هوية وطنية</SelectItem>
                      <SelectItem value="medical_report">تقرير طبي</SelectItem>
                      <SelectItem value="allergy_report">تقرير حساسية</SelectItem>
                      <SelectItem value="photo">صورة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => docInputRef.current?.click()} disabled={docUploading}>
                    <Upload className="ml-1 h-4 w-4" /> {docUploading ? "جارٍ الرفع..." : "رفع مستند"}
                  </Button>
                  <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleDocUpload} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(childDocs as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مستندات</p>
              ) : (
                <div className="space-y-3">
                  {(childDocs as any[]).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {{ birth_certificate: "شهادة ميلاد", family_id: "سجل الأسرة", immunization: "تطعيمات", passport: "جواز سفر", national_id: "هوية وطنية", medical_report: "تقرير طبي", allergy_report: "تقرير حساسية", photo: "صورة", other: "أخرى" }[doc.type as string] || doc.type} • {new Date(doc.createdAt).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {doc.status === 'approved' ? 'معتمد' : doc.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}
                        </Badge>
                        {doc.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600 h-8 w-8 p-0" onClick={() => approveDoc.mutate({ id: doc.id })} title="اعتماد">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => rejectDoc.mutate({ id: doc.id })} title={isAr ? "رفض" : "Reject"}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title={isAr ? "تحميل" : "Download"}><Download className="h-4 w-4" /></Button>
                        </a>
                        <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deleteDoc.mutate({ id: doc.id })} title={isAr ? "حذف" : "Delete"}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Authorized Pickup Person Dialog */}
      <Dialog open={addPersonDialog} onOpenChange={(open) => { if (!open) { setAddPersonDialog(false); resetPersonForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> إضافة شخص مخول بالاستلام
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم الكامل *</Label>
              <Input value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} placeholder="اسم الشخص المخول" />
            </div>
            <div>
              <Label>صلة القرابة *</Label>
              <Select value={personForm.relationship} onValueChange={(v) => setPersonForm({ ...personForm, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">الأب</SelectItem>
                  <SelectItem value="mother">الأم</SelectItem>
                  <SelectItem value="grandfather">الجد</SelectItem>
                  <SelectItem value="grandmother">الجدة</SelectItem>
                  <SelectItem value="driver">السائق</SelectItem>
                  <SelectItem value="relative">قريب مخول</SelectItem>
                  <SelectItem value="other">شخص مخول آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? "رقم الجوال" : "Phone"}</Label>
              <Input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" />
            </div>
            <div>
              <Label>رقم الهوية (اختياري)</Label>
              <Input value={personForm.nationalId} onChange={(e) => setPersonForm({ ...personForm, nationalId: e.target.value })} placeholder="رقم الهوية الوطنية" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddPersonDialog(false); resetPersonForm(); }}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => {
                if (!personForm.name.trim()) { toast.error(isAr ? "يرجى إدخال اسم الشخص" : "Please enter person name"); return; }
                addAuthorizedPerson.mutate({
                  childId,
                  name: personForm.name.trim(),
                  relationship: personForm.relationship as any,
                  phone: personForm.phone.trim() || undefined,
                  nationalId: personForm.nationalId.trim() || undefined,
                });
              }}
              disabled={addAuthorizedPerson.isPending || !personForm.name.trim()}
            >
              {addAuthorizedPerson.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Parent Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ربط ولي أمر بالطفل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isAr ? "ولي الأمر" : "Parent"}</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger><SelectValue placeholder="اختر ولي الأمر" /></SelectTrigger>
                <SelectContent>
                  {parentUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name} - {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>صلة القرابة</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">أب</SelectItem>
                  <SelectItem value="mother">أم</SelectItem>
                  <SelectItem value="guardian">ولي أمر</SelectItem>
                  <SelectItem value="parent">ولي أمر (عام)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => { if (selectedParentId) linkParent.mutate({ parentId: parseInt(selectedParentId), childId, relationship }); }}
              disabled={!selectedParentId || linkParent.isPending}
            >
              {linkParent.isPending ? "جارٍ الربط..." : "ربط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium whitespace-pre-wrap">{value}</p>
    </div>
  );
}
