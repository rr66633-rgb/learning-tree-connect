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
        attendanceDays: c.attendanceDays || [0,1,2,3,4],
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
      attendanceDays: form.attendanceDays,
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
        <h2 className="text-xl font-bold text-destructive">{isAr ? "الطفل غير موجود" : "Child Not Found"}</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/staff/children")}>
          <ArrowRight className="ml-2 h-4 w-4" /> {isAr ? "العودة للقائمة" : "Back to Menu"}
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
            {c.status === "active" ? (isAr ? "نشط" : "Active") : c.status === "inactive" ? (isAr ? "غير نشط" : "Inactive") : c.status === "graduated" ? (isAr ? "متخرج" : "Graduated") : "قائمة انتظار"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" onClick={startEditing}>
              <Edit className="ml-2 h-4 w-4" /> {isAr ? "تعديل" : "Edit"}
            </Button>
          )}
          <Button onClick={() => setLinkDialogOpen(true)}>
            <UserPlus className="ml-2 h-4 w-4" /> {isAr ? "ربط ولي أمر" : "Link Parent"}
          </Button>
        </div>
      </div>

      {/* Allergy/Medical Alert Banner */}
      {(c.allergies || c.medicalConditions) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-800">{isAr ? "تنبيه طبي" : "Medical Alert"}</h4>
            {c.allergies && (
              <p className="text-sm text-red-700 mt-0.5">
                <span className="font-medium">{isAr ? "حساسية:" : "Allergies:"}</span> {c.allergies}
              </p>
            )}
            {c.medicalConditions && (
              <p className="text-sm text-red-700 mt-0.5">
                <span className="font-medium">{isAr ? "حالات طبية:" : "Medical Conditions:"}</span> {c.medicalConditions}
              </p>
            )}
            {c.medications && (
              <p className="text-sm text-red-700 mt-0.5">
                <span className="font-medium">{isAr ? "أدوية:" : "Medications:"}</span> {c.medications}
              </p>
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">{isAr ? "البيانات الشخصية" : "Personal Data"}</TabsTrigger>
          <TabsTrigger value="parent">{isAr ? "ولي الأمر" : "Parent"}</TabsTrigger>
          <TabsTrigger value="medical">{isAr ? "الطبية" : "Medical"}</TabsTrigger>
          <TabsTrigger value="nursery">{isAr ? "الحضانة" : "Nursery"}</TabsTrigger>
          <TabsTrigger value="documents">{isAr ? "المستندات" : "Documents"}</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> {isAr ? "البيانات الشخصية" : "Personal Data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? "الاسم الأول" : "First Name"}</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div><Label>{isAr ? "اسم العائلة" : "Last Name"}</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                  <div><Label>{isAr ? "الاسم بالعربي" : "Arabic Name"}</Label><Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} /></div>
                  <div><Label>{isAr ? "تاريخ الميلاد" : "Date of Birth"}</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                  <div>
                    <Label>{isAr ? "الجنس" : "Gender"}</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{isAr ? "ذكر" : "Male"}</SelectItem>
                        <SelectItem value="female">{isAr ? "أنثى" : "Female"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isAr ? "الجنسية" : "Nationality"}</Label><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
                  <div><Label>{isAr ? "رقم الهوية / الإقامة" : "ID / Iqama Number"}</Label><Input value={form.childNationalId} onChange={(e) => setForm({ ...form, childNationalId: e.target.value })} /></div>
                  <div>
                    <Label>{isAr ? "الفصل" : "Class"}</Label>
                    <Select value={form.classId || "none"} onValueChange={(v) => setForm({ ...form, classId: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isAr ? "بدون فصل" : "No Class"}</SelectItem>
                        {(classes as any[])?.map((cl: any) => (
                          <SelectItem key={cl.id} value={String(cl.id)}>{cl.nameAr || cl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={isAr ? "الاسم الأول" : "First Name"} value={c.firstName} />
                  <InfoRow label={isAr ? "اسم العائلة" : "Last Name"} value={c.lastName} />
                  <InfoRow label={isAr ? "الاسم بالعربي" : "Arabic Name"} value={c.arabicName || "—"} />
                  <InfoRow label={isAr ? "تاريخ الميلاد" : "Date of Birth"} value={c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString("ar-SA") : "—"} />
                  <InfoRow label={isAr ? "الجنس" : "Gender"} value={c.gender === "male" ? "ذكر" : c.gender === "female" ? "أنثى" : "—"} />
                  <InfoRow label={isAr ? "الجنسية" : "Nationality"} value={c.nationality || "—"} />
                  <InfoRow label={isAr ? "رقم الهوية / الإقامة" : "ID / Iqama Number"} value={c.childNationalId || "—"} />
                  <InfoRow label={isAr ? "الفصل" : "Class"} value={classNameStr} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parent Info Tab */}
        <TabsContent value="parent" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{isAr ? " بيانات ولي الأمر" : "Parent Information"}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? "اسم الأب" : "Father's Name"}</Label><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></div>
                  <div><Label>{isAr ? "اسم الأم" : "Mother's Name"}</Label><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></div>
                  <div><Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} dir="ltr" /></div>
                  <div><Label>{isAr ? "رقم الجوال" : "Phone"}</Label><Input value={form.parentMobile} onChange={(e) => setForm({ ...form, parentMobile: e.target.value })} dir="ltr" /></div>
                  <div><Label>{isAr ? "رقم بديل" : "Alternative Number"}</Label><Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} dir="ltr" /></div>
                  <div className="col-span-full"><Label>{isAr ? "العنوان" : "Address"}</Label><Textarea value={form.homeAddress} onChange={(e) => setForm({ ...form, homeAddress: e.target.value })} /></div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={isAr ? "اسم الأب" : "Father's Name"} value={c.fatherName || "—"} />
                  <InfoRow label={isAr ? "اسم الأم" : "Mother's Name"} value={c.motherName || "—"} />
                  <InfoRow label={isAr ? "البريد الإلكتروني" : "Email"} value={c.parentEmail || "—"} />
                  <InfoRow label={isAr ? "رقم الجوال" : "Phone Number"} value={c.parentMobile || "—"} />
                  <InfoRow label={isAr ? "رقم بديل" : "Alternative Number"} value={c.altPhone || "—"} />
                  <InfoRow label={isAr ? "العنوان" : "Address"} value={c.homeAddress || "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Parents */}
          {(parents as any[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "أولياء الأمور المرتبطون" : "Linked Parents"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(parents as any[]).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{p.parentName || p.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.relationship === "father" ? "أب" : p.relationship === "mother" ? "أم" : (isAr ? "ولي أمر" : "Parent")}</p>
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
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />{isAr ? " المعلومات الطبية" : "Medical Information"}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>{isAr ? "الحساسية" : "Allergies"}</Label><Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
                  <div><Label>{isAr ? "الحالات الطبية" : "Medical Conditions"}</Label><Textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} /></div>
                  <div><Label>{isAr ? "الأدوية" : "Medications"}</Label><Input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} /></div>
                  <div><Label>{isAr ? "الاحتياجات الخاصة" : "Special Needs"}</Label><Input value={form.specialNeeds} onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })} /></div>
                  <div><Label>{isAr ? "اسم الطبيب" : "Doctor's Name"}</Label><Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} /></div>
                  <div>
                    <Label>{isAr ? "فصيلة الدم" : "Blood Type"}</Label>
                    <Select value={form.bloodType || "unknown"} onValueChange={(v) => setForm({ ...form, bloodType: v === "unknown" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">{isAr ? "غير محدد" : "Not Specified"}</SelectItem>
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
                  <div className="col-span-full"><Label>{isAr ? "ملاحظات طبية" : "Medical Notes"}</Label><Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} /></div>
                  <div className="col-span-full flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={isAr ? "الحساسية" : "Allergies"} value={c.allergies || "لا يوجد"} />
                  <InfoRow label="الحالات الطبية" value={c.medicalConditions || (isAr ? "لا يوجد" : "None")} />
                  <InfoRow label={isAr ? "الأدوية" : "Medications"} value={c.medications || "لا يوجد"} />
                  <InfoRow label="الاحتياجات الخاصة" value={c.specialNeeds || (isAr ? "لا يوجد" : "None")} />
                  <InfoRow label={isAr ? "اسم الطبيب" : "Doctor's Name"} value={c.doctorName || "—"} />
                  <InfoRow label={isAr ? "فصيلة الدم" : "Blood Type"} value={c.bloodType || "—"} />
                  <div className="col-span-full"><InfoRow label={isAr ? "ملاحظات طبية" : "Medical Notes"} value={c.medicalNotes || "—"} /></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nursery Tab */}
        <TabsContent value="nursery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{isAr ? " بيانات الحضانة" : "Nursery Data"}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.busRequired} onCheckedChange={(v) => setForm({ ...form, busRequired: v })} />
                    <Label>{isAr ? "يحتاج نقل بالباص" : "Needs Bus Transport"}</Label>
                  </div>
                  <div>
                    <Label className="mb-2 block">{isAr ? "أيام الحضور المحددة" : "Scheduled Attendance Days"}</Label>
                    <div className="flex flex-wrap gap-2">
                      {[{day: 0, ar: "الأحد", en: "Sun"}, {day: 1, ar: "الإثنين", en: "Mon"}, {day: 2, ar: "الثلاثاء", en: "Tue"}, {day: 3, ar: "الأربعاء", en: "Wed"}, {day: 4, ar: "الخميس", en: "Thu"}, {day: 5, ar: "الجمعة", en: "Fri"}, {day: 6, ar: "السبت", en: "Sat"}].map(d => (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            const current = form.attendanceDays || [0,1,2,3,4];
                            const updated = current.includes(d.day) ? current.filter((x: number) => x !== d.day) : [...current, d.day];
                            setForm({ ...form, attendanceDays: updated });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            (form.attendanceDays || [0,1,2,3,4]).includes(d.day)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isAr ? d.ar : d.en}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{isAr ? "اختر الأيام التي يحضر فيها الطفل (الافتراضي: أحد - خميس)" : "Select days the child attends (default: Sun-Thu)"}</p>
                  </div>
                  <div><Label>{isAr ? "ملاحظات عامة" : "General Notes"}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>{updateChild.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{isAr ? "نقل بالباص:" : "Bus Transport:"}</span>
                    <Badge variant={c.busRequired ? "default" : "secondary"}>{c.busRequired ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{isAr ? "أيام الحضور:" : "Attendance Days:"}</span>
                    {(c.attendanceDays || [0,1,2,3,4]).map((d: number) => {
                      const dayNames = isAr ? ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                      return <Badge key={d} variant="outline" className="text-xs">{dayNames[d]}</Badge>;
                    })}
                  </div>
                  <InfoRow label={isAr ? "ملاحظات" : "Notes"} value={c.notes || "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorized Pickup Persons Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{isAr ? " الأشخاص المصرح لهم بالاستلام" : "Authorized Pick-up Persons"}</span>
                <Button size="sm" onClick={() => setAddPersonDialog(true)}>
                  <Plus className="h-4 w-4 ml-1" /> {isAr ? "إضافة شخص" : "Add Person"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authorizedPersons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{isAr ? "لا يوجد أشخاص مصرح لهم بالاستلام" : "No authorized pick-up persons"}</p>
                  <p className="text-xs mt-1">{isAr ? "أضف الأشخاص المخولين باستلام الطفل" : "Add authorized persons to pick up the child"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {authorizedPersons.map((person: any) => {
                    const isAutoParent = person.id < 0;
                    const relLabels: Record<string, string> = { father: "الأب", mother: "الأم", grandfather: "الجد", grandmother: "الجدة", driver: "السائق", relative: "قريب", other: isAr ? "آخر" : "Other" };
                    return (
                      <div key={person.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isAutoParent ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{person.name}</p>
                            {isAutoParent && <Badge variant="secondary" className="text-xs">{isAr ? "ولي أمر مرتبط" : "Linked Parent/Guardian"}</Badge>}
                            <Badge className="bg-green-100 text-green-800 text-xs">{isAr ? "مصرح" : "Authorized"}</Badge>
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
                <span className="flex items-center gap-2"><FileText className="h-5 w-5" />{isAr ? " مستندات الطفل" : "Child Documents"}</span>
                <div className="flex items-center gap-2">
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="w-[140px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birth_certificate">{isAr ? "شهادة ميلاد" : "Birth Certificate"}</SelectItem>
                      <SelectItem value="family_id">{isAr ? "سجل الأسرة" : "Family Record"}</SelectItem>
                      <SelectItem value="immunization">{isAr ? "سجل التطعيمات" : "Vaccination Log"}</SelectItem>
                      <SelectItem value="passport">{isAr ? "جواز سفر" : "Passport"}</SelectItem>
                      <SelectItem value="national_id">{isAr ? "هوية وطنية" : "National ID"}</SelectItem>
                      <SelectItem value="medical_report">{isAr ? "تقرير طبي" : "Medical Report"}</SelectItem>
                      <SelectItem value="allergy_report">{isAr ? "تقرير حساسية" : "Allergy Report"}</SelectItem>
                      <SelectItem value="photo">{isAr ? "صورة" : "Photo"}</SelectItem>
                      <SelectItem value="other">{isAr ? "أخرى" : "Other"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => docInputRef.current?.click()} disabled={docUploading}>
                    <Upload className="ml-1 h-4 w-4" /> {docUploading ? isAr ? "جارٍ الرفع..." : "Uploading..." : isAr ? "رفع مستند" : "Upload Document"}
                  </Button>
                  <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleDocUpload} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(childDocs as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{isAr ? "لا توجد مستندات" : "No documents"}</p>
              ) : (
                <div className="space-y-3">
                  {(childDocs as any[]).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {{ birth_certificate: "شهادة ميلاد", family_id: "سجل الأسرة", immunization: "تطعيمات", passport: "جواز سفر", national_id: "هوية وطنية", medical_report: "تقرير طبي", allergy_report: isAr ? "تقرير حساسية" : "Allergy Report", photo: "صورة", other: "أخرى" }[doc.type as string] || doc.type} • {new Date(doc.createdAt).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {doc.status === 'approved' ? isAr ? 'معتمد' : 'Approved' : doc.status === 'rejected' ? isAr ? 'مرفوض' : 'Rejected' : isAr ? 'بانتظار المراجعة' : 'Awaiting Review'}
                        </Badge>
                        {doc.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600 h-8 w-8 p-0" onClick={() => approveDoc.mutate({ id: doc.id })} title={isAr ? "اعتماد" : "Approval"}>
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
              <UserPlus className="h-5 w-5" /> {isAr ? "إضافة شخص مخول بالاستلام" : "Add Authorized Pickup Person"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم الكامل *</Label>
              <Input value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} placeholder={isAr ? "اسم الشخص المخول" : "Authorized Person Name"} />
            </div>
            <div>
              <Label>صلة القرابة *</Label>
              <Select value={personForm.relationship} onValueChange={(v) => setPersonForm({ ...personForm, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{isAr ? "الأب" : "Father"}</SelectItem>
                  <SelectItem value="mother">{isAr ? "الأم" : "Mother"}</SelectItem>
                  <SelectItem value="grandfather">{isAr ? "الجد" : "Grandfather"}</SelectItem>
                  <SelectItem value="grandmother">{isAr ? "الجدة" : "Grandmother"}</SelectItem>
                  <SelectItem value="driver">{isAr ? "السائق" : "Driver"}</SelectItem>
                  <SelectItem value="relative">{isAr ? "قريب مخول" : "Authorized Relative"}</SelectItem>
                  <SelectItem value="other">{isAr ? "شخص مخول آخر" : "Another Authorized Person"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? "رقم الجوال" : "Phone"}</Label>
              <Input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" />
            </div>
            <div>
              <Label>{isAr ? "رقم الهوية (اختياري)" : "ID Number (Optional)"}</Label>
              <Input value={personForm.nationalId} onChange={(e) => setPersonForm({ ...personForm, nationalId: e.target.value })} placeholder={isAr ? "رقم الهوية الوطنية" : "National ID Number"} dir="ltr" />
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
              {addAuthorizedPerson.isPending ? (isAr ? "جارٍ الإضافة..." : "Adding...") : (isAr ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Parent Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "ربط ولي أمر بالطفل" : "Link Parent to Child"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{isAr ? "ولي الأمر" : "Parent"}</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر ولي الأمر" : "Select Parent"} /></SelectTrigger>
                <SelectContent>
                  {parentUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name} - {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? "صلة القرابة" : "Relationship"}</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{isAr ? "أب" : "Father"}</SelectItem>
                  <SelectItem value="mother">{isAr ? "أم" : "Mother"}</SelectItem>
                  <SelectItem value="guardian">{isAr ? "ولي أمر" : "Parent"}</SelectItem>
                  <SelectItem value="parent">{isAr ? "ولي أمر (عام)" : "Parent/Guardian (General)"}</SelectItem>
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
              {linkParent.isPending ? isAr ? "جارٍ الربط..." : "Linking..." : isAr ? "ربط" : "Link"}
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
