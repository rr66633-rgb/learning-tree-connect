import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Baby, Heart, Phone, AlertTriangle, Camera, Edit, FileText, Upload, CheckCircle2, Clock, XCircle, Download, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import { useTranslation } from "react-i18next";

function ChildEmergencyContacts({ childId }: { childId: number }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: contacts, isLoading } = trpc.emergencyContacts.list.useQuery({ childId });
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!contacts || contacts.length === 0) return <p className="text-sm text-muted-foreground">{isAr ? "لا توجد جهات اتصال طارئة مسجلة" : "No emergency contacts registered"}</p>;
  return (
    <div className="space-y-2">
      {contacts.map((ec: any) => (
        <div key={ec.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{ec.name} ({ec.relationship})</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{ec.phone}</p>
          </div>
          {ec.isAuthorizedPickup && <Badge variant="secondary" className="text-xs mr-auto">{isAr ? "مصرح بالاستلام" : "Authorized for Pickup"}</Badge>}
        </div>
      ))}
    </div>
  );
}

function ChildDocumentsSection({ childId }: { childId: number }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: documents, isLoading } = trpc.childDocuments.listByChild.useQuery({ childId });
  const utils = trpc.useUtils();
  const createDoc = trpc.childDocuments.create.useMutation({
    onSuccess: () => { utils.childDocuments.listByChild.invalidate({ childId }); toast.success(isAr ? "تم رفع المستند بنجاح" : "Document uploaded successfully"); },
    onError: (e) => toast.error(e.message),
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>("other");
  const [docName, setDocName] = useState("");

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error(isAr ? "يرجى اختيار ملف" : "Please select a file"); return; }
    if (!docName.trim()) { toast.error(isAr ? "يرجى إدخال اسم المستند" : "Please enter document name"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-document'), { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || (isAr ? "فشل الرفع" : "Upload failed")); }
      const { url, mimeType } = await res.json();
      await createDoc.mutateAsync({ childId, type: docType as any, name: docName.trim(), fileUrl: url, mimeType });
      setDocName("");
      setDocType("other");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e.message || (isAr ? "فشل رفع المستند" : "Document upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />{isAr ? "معتمد" : "Approved"}</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{isAr ? "مرفوض" : "Rejected"}</Badge>;
      default: return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{isAr ? "قيد المراجعة" : "Under Review"}</Badge>;
    }
  };

  const typeLabels: Record<string, string> = { birth_certificate: t("documentTypes.birth_certificate"), family_id: t("documentTypes.family_id"), immunization: t("documentTypes.immunization"), passport: t("documentTypes.passport"), national_id: t("documentTypes.national_id"), medical_report: t("documentTypes.medical_report"), allergy_report: t("documentTypes.allergy_report"), photo: t("documentTypes.photo"), other: t("documentTypes.other") };

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
        <h4 className="font-medium text-sm">{isAr ? "رفع مستند جديد" : "Upload New Document"}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{isAr ? "اسم المستند" : "Document Name"}</Label>
            <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder={isAr ? "مثال: شهادة ميلاد أحمد" : "Example: Ahmed\'s birth certificate"} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{isAr ? "نوع المستند" : "Document Type"}</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="flex-1" />
          <Button onClick={handleUpload} disabled={uploading} size="sm" className="gap-1">
            <Upload className="h-4 w-4" />
            {uploading ? (isAr ? "جاري الرفع..." : "Uploading...") : t("common.upload")}
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{typeLabels[doc.type] || doc.type} • {new Date(doc.createdAt).toLocaleDateString('ar-SA')}</p>
                  {doc.reviewNote && <p className="text-xs text-amber-600 mt-1">{isAr ? "ملاحظة:" : "Note"} {doc.reviewNote}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(doc.status)}
                {doc.fileUrl && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4 text-sm">{isAr ? "لا توجد مستندات مرفوعة" : "No documents uploaded"}</p>
      )}
    </div>
  );
}

export default function ParentChildren() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const updateChild = trpc.children.parentUpdate.useMutation({
    onSuccess: () => { utils.children.list.invalidate(); toast.success(isAr ? "تم تحديث البيانات بنجاح" : "Data updated successfully"); setEditChild(null); },
    onError: (e) => toast.error(e.message),
  });
  const registerChild = trpc.children.parentRegisterChild.useMutation({
    onSuccess: () => { utils.children.list.invalidate(); toast.success(isAr ? "تم تسجيل الطفل بنجاح" : "Child enrolled successfully"); setShowRegister(false); resetRegisterForm(); },
    onError: (e) => toast.error(e.message),
  });

  const [editChild, setEditChild] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Register form state
  const [regForm, setRegForm] = useState({
    firstName: "", lastName: "", arabicName: "", dateOfBirth: "", gender: "" as "male" | "female" | "",
    nationality: "", childNationalId: "", fatherName: "", motherName: "",
    parentEmail: "", parentMobile: "", altPhone: "", homeAddress: "",
    allergies: "", medicalConditions: "", medications: "", specialNeeds: "",
    doctorName: "", bloodType: "", medicalNotes: "",
  });

  const resetRegisterForm = () => {
    setRegForm({
      firstName: "", lastName: "", arabicName: "", dateOfBirth: "", gender: "",
      nationality: "", childNationalId: "", fatherName: "", motherName: "",
      parentEmail: "", parentMobile: "", altPhone: "", homeAddress: "",
      allergies: "", medicalConditions: "", medications: "", specialNeeds: "",
      doctorName: "", bloodType: "", medicalNotes: "",
    });
  };

  const handleRegisterChild = () => {
    if (!regForm.firstName.trim()) { toast.error(isAr ? "يرجى إدخال اسم الطفل" : "Please enter child's first name"); return; }
    if (!regForm.lastName.trim()) { toast.error(isAr ? "يرجى إدخال اسم العائلة" : "Please enter last name"); return; }
    if (!regForm.dateOfBirth) { toast.error(isAr ? "يرجى إدخال تاريخ الميلاد" : "Please enter date of birth"); return; }
    if (!regForm.gender) { toast.error(isAr ? "يرجى اختيار الجنس" : "Please select gender"); return; }

    const data: any = {};
    Object.entries(regForm).forEach(([key, value]) => {
      if (value && value.trim()) data[key] = value.trim();
    });
    registerChild.mutate(data);
  };

  const startEdit = (child: any) => {
    setEditChild(child);
    setEditForm({
      firstName: child.firstName || "",
      lastName: child.lastName || "",
      arabicName: child.arabicName || "",
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
    });
  };

  const handleSaveEdit = () => {
    if (!editChild) return;
    const changes: any = {};
    Object.entries(editForm).forEach(([key, value]) => {
      if (value !== (editChild[key] || "")) changes[key] = value;
    });
    if (Object.keys(changes).length === 0) { toast.info(isAr ? "لا توجد تغييرات" : "No changes"); return; }
    updateChild.mutate({ id: editChild.id, ...changes });
  };

  const handlePhotoUpload = async (childId: number) => {
    const file = photoRef.current?.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-photo'), { method: "POST", body: formData });
      if (!res.ok) throw new Error((isAr ? "فشل رفع الصورة" : "Image upload failed"));
      const { url } = await res.json();
      await updateChild.mutateAsync({ id: childId, photo: url });
      toast.success(isAr ? "تم تحديث الصورة" : "Photo updated");
    } catch (e: any) {
      toast.error(e.message || (isAr ? "فشل رفع الصورة" : "Image upload failed"));
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:2}).map((_,i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "أطفالي" : "My Children"}</h1>
        <Button onClick={() => setShowRegister(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isAr ? "تسجيل طفل جديد" : "Register New Child"}
        </Button>
      </div>

      {/* Empty state when no children */}
      {(!children || children.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Baby className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{isAr ? "لم يتم تسجيل أي طفل بعد" : "No children registered yet"}</h3>
            <p className="text-muted-foreground text-sm mb-4">{isAr ? "يمكنك تسجيل أطفالك للبدء في استخدام خدمات الحضانة" : "Register your children to start using nursery services"}</p>
            <Button onClick={() => setShowRegister(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {isAr ? "تسجيل طفل جديد" : "Register New Child"}
            </Button>
          </CardContent>
        </Card>
      )}

      {children?.map((child: any) => (
        <Card key={child.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {child.photo ? (
                    <img src={child.photo} alt={child.firstName} className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Baby className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <button
                    onClick={() => photoRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={() => handlePhotoUpload(child.id)} />
                </div>
                <div>
                  <CardTitle>{child.firstName} {child.lastName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('ar-SA') : ""}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => startEdit(child)}>
                <Edit className="h-4 w-4" />
                {isAr ? "تعديل" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="info">{isAr ? "المعلومات" : "Information"}</TabsTrigger>
                <TabsTrigger value="medical">{isAr ? "الطبية" : "Medical"}</TabsTrigger>
                <TabsTrigger value="emergency">{isAr ? "الطوارئ" : "Emergency"}</TabsTrigger>
                <TabsTrigger value="documents">{isAr ? "المستندات" : "Documents"}</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">الجنس:</span> <span>{child.gender === "male" ? (isAr ? "ذكر" : "Male") : (isAr ? "أنثى" : "Female")}</span></div>
                  <div><span className="text-muted-foreground">{isAr ? "فصيلة الدم:" : "Blood Type:"}</span> <span>{child.bloodType || "-"}</span></div>
                  <div><span className="text-muted-foreground">{isAr ? "اسم الأب:" : "Father's Name:"}</span> <span>{child.fatherName || "-"}</span></div>
                  <div><span className="text-muted-foreground">{isAr ? "اسم الأم:" : "Mother's Name:"}</span> <span>{child.motherName || "-"}</span></div>
                  <div><span className="text-muted-foreground">{isAr ? "الجوال:" : "Phone:"}</span> <span dir="ltr">{child.parentMobile || "-"}</span></div>
                  <div><span className="text-muted-foreground">{isAr ? "البريد:" : "Email:"}</span> <span>{child.parentEmail || "-"}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">{isAr ? "العنوان:" : "Address:"}</span> <span>{child.homeAddress || "-"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="medical" className="mt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" /><span>الحالات الصحية: {child.medicalConditions || child.medicalNotes || (isAr ? "لا يوجد" : "None")}</span></div>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span>الحساسية: {child.allergies || (isAr ? "لا يوجد" : "None")}</span></div>
                  {child.medications && <div className="text-sm"><span className="text-muted-foreground">{isAr ? "الأدوية:" : "Medications:"}</span> {child.medications}</div>}
                  {child.doctorName && <div className="text-sm"><span className="text-muted-foreground">{isAr ? "الطبيب:" : "Doctor:"}</span> {child.doctorName}</div>}
                </div>
              </TabsContent>
              <TabsContent value="emergency" className="mt-4">
                <ChildEmergencyContacts childId={child.id} />
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <ChildDocumentsSection childId={child.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      {/* Register New Child Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {isAr ? "تسجيل طفل جديد" : "Register New Child"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <h4 className="font-medium text-sm text-primary">{isAr ? "البيانات الأساسية *" : "Basic Information *"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الاسم الأول *" : "First Name *"}</Label>
                <Input value={regForm.firstName} onChange={(e) => setRegForm({...regForm, firstName: e.target.value})} placeholder={isAr ? "اسم الطفل" : "Child's Name"} />
              </div>
              <div>
                <Label>{isAr ? "اسم العائلة *" : "Last Name *"}</Label>
                <Input value={regForm.lastName} onChange={(e) => setRegForm({...regForm, lastName: e.target.value})} placeholder={isAr ? "اسم العائلة" : "Last Name"} />
              </div>
            </div>
            <div>
              <Label>{isAr ? "الاسم بالعربي" : "Arabic Name"}</Label>
              <Input value={regForm.arabicName} onChange={(e) => setRegForm({...regForm, arabicName: e.target.value})} placeholder={isAr ? "الاسم الكامل بالعربي" : "Full Arabic Name"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "تاريخ الميلاد *" : "Date of Birth *"}</Label>
                <Input type="date" value={regForm.dateOfBirth} onChange={(e) => setRegForm({...regForm, dateOfBirth: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "الجنس *" : "Gender *"}</Label>
                <Select value={regForm.gender} onValueChange={(v) => setRegForm({...regForm, gender: v as "male" | "female"})}>
                  <SelectTrigger><SelectValue placeholder={isAr ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{isAr ? "ذكر" : "Male"}</SelectItem>
                    <SelectItem value="female">{isAr ? "أنثى" : "Female"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الجنسية" : "Nationality"}</Label>
                <Input value={regForm.nationality} onChange={(e) => setRegForm({...regForm, nationality: e.target.value})} placeholder={isAr ? "سعودي" : "Saudi"} />
              </div>
              <div>
                <Label>{isAr ? "رقم الهوية" : "National ID"}</Label>
                <Input value={regForm.childNationalId} onChange={(e) => setRegForm({...regForm, childNationalId: e.target.value})} dir="ltr" />
              </div>
            </div>

            <hr />
            <h4 className="font-medium text-sm text-primary">{isAr ? "بيانات ولي الأمر" : "Parent Information"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "اسم الأب" : "Father's Name"}</Label>
                <Input value={regForm.fatherName} onChange={(e) => setRegForm({...regForm, fatherName: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "اسم الأم" : "Mother's Name"}</Label>
                <Input value={regForm.motherName} onChange={(e) => setRegForm({...regForm, motherName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <Input type="email" value={regForm.parentEmail} onChange={(e) => setRegForm({...regForm, parentEmail: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "رقم الجوال" : "Phone Number"}</Label>
                <Input value={regForm.parentMobile} onChange={(e) => setRegForm({...regForm, parentMobile: e.target.value})} dir="ltr" placeholder="05xxxxxxxx" />
              </div>
            </div>
            <div>
              <Label>{isAr ? "رقم بديل" : "Alternative Number"}</Label>
              <Input value={regForm.altPhone} onChange={(e) => setRegForm({...regForm, altPhone: e.target.value})} dir="ltr" />
            </div>
            <div>
              <Label>{isAr ? "العنوان" : "Address"}</Label>
              <Textarea value={regForm.homeAddress} onChange={(e) => setRegForm({...regForm, homeAddress: e.target.value})} placeholder={isAr ? "المدينة - الحي - الشارع" : "City - District - Street"} />
            </div>

            <hr />
            <h4 className="font-medium text-sm text-primary">{isAr ? "المعلومات الطبية" : "Medical Information"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الحساسية" : "Allergies"}</Label>
                <Input value={regForm.allergies} onChange={(e) => setRegForm({...regForm, allergies: e.target.value})} placeholder={isAr ? "مثال: حساسية الفول السوداني" : "Example: Peanut allergy"} />
              </div>
              <div>
                <Label>{isAr ? "فصيلة الدم" : "Blood Type"}</Label>
                <Select value={regForm.bloodType} onValueChange={(v) => setRegForm({...regForm, bloodType: v})}>
                  <SelectTrigger><SelectValue placeholder={isAr ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{isAr ? "الحالات الصحية" : "Medical Conditions"}</Label>
              <Textarea value={regForm.medicalConditions} onChange={(e) => setRegForm({...regForm, medicalConditions: e.target.value})} placeholder={isAr ? "أي حالات صحية يجب معرفتها" : "Any medical conditions to know about"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الأدوية" : "Medications"}</Label>
                <Input value={regForm.medications} onChange={(e) => setRegForm({...regForm, medications: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "اسم الطبيب" : "Doctor's Name"}</Label>
                <Input value={regForm.doctorName} onChange={(e) => setRegForm({...regForm, doctorName: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{isAr ? "احتياجات خاصة" : "Special Needs"}</Label>
              <Input value={regForm.specialNeeds} onChange={(e) => setRegForm({...regForm, specialNeeds: e.target.value})} placeholder={isAr ? "أي احتياجات خاصة" : "Any special needs"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRegister(false); resetRegisterForm(); }}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleRegisterChild} disabled={registerChild.isPending} className="gap-2">
              {registerChild.isPending ? (isAr ? "جاري التسجيل..." : "Registering...") : (
                <><Plus className="h-4 w-4" />{isAr ? "تسجيل الطفل" : "Register Child"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Child Dialog */}
      <Dialog open={!!editChild} onOpenChange={(open) => !open && setEditChild(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل بيانات" : "Edit Data"} {editChild?.firstName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الاسم الأول" : "First Name"}</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "اسم العائلة" : "Last Name"}</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{isAr ? "الاسم بالعربي" : "Arabic Name"}</Label>
              <Input value={editForm.arabicName} onChange={(e) => setEditForm({...editForm, arabicName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "اسم الأب" : "Father's Name"}</Label>
                <Input value={editForm.fatherName} onChange={(e) => setEditForm({...editForm, fatherName: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "اسم الأم" : "Mother's Name"}</Label>
                <Input value={editForm.motherName} onChange={(e) => setEditForm({...editForm, motherName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <Input value={editForm.parentEmail} onChange={(e) => setEditForm({...editForm, parentEmail: e.target.value})} type="email" />
              </div>
              <div>
                <Label>{isAr ? "رقم الجوال" : "Phone Number"}</Label>
                <Input value={editForm.parentMobile} onChange={(e) => setEditForm({...editForm, parentMobile: e.target.value})} dir="ltr" />
              </div>
            </div>
            <div>
              <Label>{isAr ? "رقم بديل" : "Alternative Number"}</Label>
              <Input value={editForm.altPhone} onChange={(e) => setEditForm({...editForm, altPhone: e.target.value})} dir="ltr" />
            </div>
            <div>
              <Label>{isAr ? "العنوان" : "Address"}</Label>
              <Textarea value={editForm.homeAddress} onChange={(e) => setEditForm({...editForm, homeAddress: e.target.value})} />
            </div>
            <hr />
            <h4 className="font-medium text-sm">{isAr ? "المعلومات الطبية" : "Medical Information"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "الحساسية" : "Allergies"}</Label>
                <Input value={editForm.allergies} onChange={(e) => setEditForm({...editForm, allergies: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "فصيلة الدم" : "Blood Type"}</Label>
                <Input value={editForm.bloodType} onChange={(e) => setEditForm({...editForm, bloodType: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{isAr ? "الحالات الصحية" : "Medical Conditions"}</Label>
              <Textarea value={editForm.medicalConditions} onChange={(e) => setEditForm({...editForm, medicalConditions: e.target.value})} />
            </div>
            <div>
              <Label>{isAr ? "الأدوية" : "Medications"}</Label>
              <Input value={editForm.medications} onChange={(e) => setEditForm({...editForm, medications: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? "اسم الطبيب" : "Doctor's Name"}</Label>
                <Input value={editForm.doctorName} onChange={(e) => setEditForm({...editForm, doctorName: e.target.value})} />
              </div>
              <div>
                <Label>{isAr ? "احتياجات خاصة" : "Special Needs"}</Label>
                <Input value={editForm.specialNeeds} onChange={(e) => setEditForm({...editForm, specialNeeds: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditChild(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveEdit} disabled={updateChild.isPending}>
              {updateChild.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadingPhoto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <p className="text-sm">{isAr ? "جاري رفع الصورة..." : "Uploading image..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
