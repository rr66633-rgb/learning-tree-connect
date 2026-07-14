import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Upload, User, Briefcase, GraduationCap, CreditCard, Phone as PhoneIcon, Save } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

export default function EditStaff() {
  const params = useParams<{ id: string }>();
  const staffId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: staff, isLoading } = trpc.staffManagement.getById.useQuery({ id: staffId });

  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (staff && !initialized) {
      setForm({
        fullNameAr: staff.fullNameAr || "",
        fullNameEn: staff.fullNameEn || "",
        nationalId: staff.nationalId || "",
        iqamaNumber: staff.iqamaNumber || "",
        dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split("T")[0] : "",
        gender: staff.gender || "",
        nationality: staff.nationality || "",
        maritalStatus: staff.maritalStatus || "",
        mobile: staff.mobile || "",
        altPhone: staff.altPhone || "",
        email: staff.email || "",
        address: staff.address || "",
        city: staff.city || "",
        jobTitle: staff.jobTitle || "",
        customJobTitle: staff.customJobTitle || "",
        department: staff.department || "",
        branch: staff.branch || "",
        hireDate: staff.hireDate ? new Date(staff.hireDate).toISOString().split("T")[0] : "",
        contractType: staff.contractType || "full_time",
        contractEndDate: staff.contractEndDate ? new Date(staff.contractEndDate).toISOString().split("T")[0] : "",
        qualification: staff.qualification || "",
        specialization: staff.specialization || "",
        yearsOfExperience: staff.yearsOfExperience?.toString() || "",
        bankName: staff.bankName || "",
        iban: staff.iban || "",
        salary: staff.salary || "",
        emergencyContactName: staff.emergencyContactName || "",
        emergencyContactPhone: staff.emergencyContactPhone || "",
        emergencyContactRelation: staff.emergencyContactRelation || "",
        photo: staff.photo || "",
        status: staff.status || "active",
        notes: staff.notes || "",
      });
      setPhotoPreview(staff.photo || null);
      setInitialized(true);
    }
  }, [staff, initialized]);

  const updateStaff = trpc.staffManagement.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الموظف بنجاح");
      navigate(`/staff/staff-management/${staffId}`);
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء التحديث"),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة يجب أن لا يتجاوز 5 ميجابايت"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-photo'), { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(f => ({ ...f, photo: data.url }));
      setPhotoPreview(data.url);
      toast.success("تم رفع الصورة");
    } catch { toast.error("فشل رفع الصورة"); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullNameAr) { toast.error("الاسم بالعربي مطلوب"); return; }
    if (!form.mobile) { toast.error("رقم الجوال مطلوب"); return; }
    if (!form.email) { toast.error("البريد الإلكتروني مطلوب"); return; }

    updateStaff.mutate({
      id: staffId,
      ...form,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
      dateOfBirth: form.dateOfBirth || null,
      hireDate: form.hireDate || null,
      contractEndDate: form.contractEndDate || null,
    } as any);
  };

  const updateField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/staff/staff-management/${staffId}`)}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">تعديل بيانات الموظف</h1>
          <p className="text-sm text-muted-foreground">{staff?.fullNameAr}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="personal" className="gap-1.5 text-xs md:text-sm"><User className="h-3.5 w-3.5" />شخصية</TabsTrigger>
            <TabsTrigger value="employment" className="gap-1.5 text-xs md:text-sm"><Briefcase className="h-3.5 w-3.5" />وظيفية</TabsTrigger>
            <TabsTrigger value="qualifications" className="gap-1.5 text-xs md:text-sm"><GraduationCap className="h-3.5 w-3.5" />مؤهلات</TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5 text-xs md:text-sm"><CreditCard className="h-3.5 w-3.5" />مالية</TabsTrigger>
            <TabsTrigger value="emergency" className="gap-1.5 text-xs md:text-sm"><PhoneIcon className="h-3.5 w-3.5" />طوارئ</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader><CardTitle className="text-lg">البيانات الشخصية</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-dashed border-[#7C3AED]/30 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <AvatarFallback className="bg-[#7C3AED]/5"><Upload className="h-6 w-6 text-[#7C3AED]/50" /></AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? "جاري الرفع..." : "تغيير الصورة"}
                    </Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الاسم بالعربي <span className="text-red-500">*</span></Label><Input value={form.fullNameAr || ""} onChange={e => updateField("fullNameAr", e.target.value)} /></div>
                  <div className="space-y-2"><Label>الاسم بالإنجليزي</Label><Input value={form.fullNameEn || ""} onChange={e => updateField("fullNameEn", e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>رقم الهوية</Label><Input value={form.nationalId || ""} onChange={e => updateField("nationalId", e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>رقم الإقامة</Label><Input value={form.iqamaNumber || ""} onChange={e => updateField("iqamaNumber", e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>تاريخ الميلاد</Label><Input type="date" value={form.dateOfBirth || ""} onChange={e => updateField("dateOfBirth", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>الجنس</Label>
                    <Select value={form.gender || ""} onValueChange={v => updateField("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>الجنسية</Label><Input value={form.nationality || ""} onChange={e => updateField("nationality", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>الحالة الاجتماعية</Label>
                    <Select value={form.maritalStatus || ""} onValueChange={v => updateField("maritalStatus", v)}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">أعزب/عزباء</SelectItem><SelectItem value="married">متزوج/ة</SelectItem>
                        <SelectItem value="divorced">مطلق/ة</SelectItem><SelectItem value="widowed">أرمل/ة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">معلومات الاتصال</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>رقم الجوال <span className="text-red-500">*</span></Label><Input value={form.mobile || ""} onChange={e => updateField("mobile", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-2"><Label>هاتف بديل</Label><Input value={form.altPhone || ""} onChange={e => updateField("altPhone", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-2"><Label>البريد الإلكتروني <span className="text-red-500">*</span></Label><Input type="email" value={form.email || ""} onChange={e => updateField("email", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-2"><Label>المدينة</Label><Input value={form.city || ""} onChange={e => updateField("city", e.target.value)} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>العنوان</Label><Input value={form.address || ""} onChange={e => updateField("address", e.target.value)} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card>
              <CardHeader><CardTitle className="text-lg">البيانات الوظيفية</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المسمى الوظيفي</Label>
                    <Select value={form.jobTitle || ""} onValueChange={v => updateField("jobTitle", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">معلم/ة</SelectItem><SelectItem value="supervisor">مشرف/ة</SelectItem>
                        <SelectItem value="principal">مدير/ة</SelectItem><SelectItem value="assistant">مساعد/ة</SelectItem>
                        <SelectItem value="admin_staff">إداري/ة</SelectItem><SelectItem value="specialist">أخصائي/ة</SelectItem>
                        <SelectItem value="accountant">محاسب/ة</SelectItem><SelectItem value="receptionist">موظف/ة استقبال</SelectItem>
                        <SelectItem value="driver">سائق</SelectItem><SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>القسم</Label><Input value={form.department || ""} onChange={e => updateField("department", e.target.value)} /></div>
                  <div className="space-y-2"><Label>الفرع</Label><Input value={form.branch || ""} onChange={e => updateField("branch", e.target.value)} /></div>
                  <div className="space-y-2"><Label>تاريخ التعيين</Label><Input type="date" value={form.hireDate || ""} onChange={e => updateField("hireDate", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>نوع العقد</Label>
                    <Select value={form.contractType || "full_time"} onValueChange={v => updateField("contractType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">دوام كامل</SelectItem><SelectItem value="part_time">دوام جزئي</SelectItem>
                        <SelectItem value="contract">عقد مؤقت</SelectItem><SelectItem value="temporary">مؤقت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>انتهاء العقد</Label><Input type="date" value={form.contractEndDate || ""} onChange={e => updateField("contractEndDate", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={form.status || "active"} onValueChange={v => updateField("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem><SelectItem value="inactive">غير نشط</SelectItem>
                        <SelectItem value="on_leave">في إجازة</SelectItem><SelectItem value="terminated">منتهي</SelectItem>
                        <SelectItem value="resigned">مستقيل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications">
            <Card>
              <CardHeader><CardTitle className="text-lg">المؤهلات والخبرات</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>المؤهل العلمي</Label><Input value={form.qualification || ""} onChange={e => updateField("qualification", e.target.value)} /></div>
                  <div className="space-y-2"><Label>التخصص</Label><Input value={form.specialization || ""} onChange={e => updateField("specialization", e.target.value)} /></div>
                  <div className="space-y-2"><Label>سنوات الخبرة</Label><Input type="number" value={form.yearsOfExperience || ""} onChange={e => updateField("yearsOfExperience", e.target.value)} /></div>
                </div>
                <div className="mt-4 space-y-2"><Label>ملاحظات</Label><Textarea value={form.notes || ""} onChange={e => updateField("notes", e.target.value)} rows={3} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card>
              <CardHeader><CardTitle className="text-lg">البيانات المالية</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم البنك</Label><Input value={form.bankName || ""} onChange={e => updateField("bankName", e.target.value)} /></div>
                  <div className="space-y-2"><Label>رقم الآيبان</Label><Input value={form.iban || ""} onChange={e => updateField("iban", e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>الراتب الشهري (ريال)</Label><Input value={form.salary || ""} onChange={e => updateField("salary", e.target.value)} dir="ltr" /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency">
            <Card>
              <CardHeader><CardTitle className="text-lg">جهة الطوارئ</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم جهة الاتصال</Label><Input value={form.emergencyContactName || ""} onChange={e => updateField("emergencyContactName", e.target.value)} /></div>
                  <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={form.emergencyContactPhone || ""} onChange={e => updateField("emergencyContactPhone", e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>صلة القرابة</Label><Input value={form.emergencyContactRelation || ""} onChange={e => updateField("emergencyContactRelation", e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 sticky bottom-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/staff/staff-management/${staffId}`)}>إلغاء</Button>
          <Button type="submit" disabled={updateStaff.isPending} className="gap-2 bg-[#7C3AED] hover:bg-[#6D28D9]">
            <Save className="h-4 w-4" />
            {updateStaff.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </div>
      </form>
    </div>
  );
}
