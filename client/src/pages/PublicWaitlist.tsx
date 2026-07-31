import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Loader2, TreePine, Baby, User, Phone, Mail, Calendar, BookOpen, StickyNote, Building2 } from "lucide-react";

export default function PublicWaitlist() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    childName: "",
    parentName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    preferredClass: "",
    notes: "",
    organizationId: "",
  });

  // Fetch organizations for the dropdown
  const { data: organizations, isLoading: orgsLoading } = trpc.waitingList.publicOrganizations.useQuery();

  const registerMutation = trpc.waitingList.publicRegister.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("تم التسجيل بنجاح!");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء التسجيل");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childName.trim() || !form.parentName.trim() || !form.phone.trim()) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    registerMutation.mutate({
      childName: form.childName.trim(),
      parentName: form.parentName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      preferredClass: form.preferredClass || undefined,
      notes: form.notes.trim() || undefined,
      organizationId: form.organizationId ? Number(form.organizationId) : undefined,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">تم التسجيل بنجاح!</h2>
              <p className="text-gray-600 leading-relaxed">
                شكراً لتسجيلكم في قائمة الانتظار. سيتم التواصل معكم قريباً لتأكيد التسجيل.
              </p>
            </div>
            <Button onClick={() => { setSubmitted(false); setForm({ childName: "", parentName: "", phone: "", email: "", dateOfBirth: "", preferredClass: "", notes: "", organizationId: "" }); }} variant="outline" className="w-full">
              تسجيل طفل آخر
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">التسجيل في قائمة الانتظار</h1>
          <p className="text-gray-600 text-sm">سجّل طفلك الآن وسنتواصل معك في أقرب وقت</p>
        </div>

        {/* Form */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Organization/Nursery Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  الحضانة <span className="text-red-500">*</span>
                </Label>
                <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={orgsLoading ? "جاري تحميل الحضانات..." : "اختر الحضانة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.nameAr || org.name}{org.city ? ` - ${org.city}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Child Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Baby className="h-4 w-4 text-emerald-600" />
                  اسم الطفل <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.childName}
                  onChange={(e) => setForm({ ...form, childName: e.target.value })}
                  placeholder="أدخل اسم الطفل الكامل"
                  required
                  className="h-11"
                />
              </div>

              {/* Parent Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-emerald-600" />
                  اسم ولي الأمر <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  placeholder="أدخل اسم ولي الأمر"
                  required
                  className="h-11"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  رقم الجوال <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  type="tel"
                  dir="ltr"
                  required
                  className="h-11 text-left"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  البريد الإلكتروني
                </Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  type="email"
                  dir="ltr"
                  className="h-11 text-left"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  تاريخ ميلاد الطفل
                </Label>
                <Input
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  type="date"
                  dir="ltr"
                  lang="en"
                  className="h-11"
                />
              </div>

              {/* Preferred Class */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  الفئة العمرية المفضلة
                </Label>
                <Select value={form.preferredClass} onValueChange={(v) => setForm({ ...form, preferredClass: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر الفئة العمرية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infant">رضّع (٣ أشهر - سنة)</SelectItem>
                    <SelectItem value="toddler">دارجين (سنة - سنتين)</SelectItem>
                    <SelectItem value="pre-kg">تمهيدي (سنتين - ٣ سنوات)</SelectItem>
                    <SelectItem value="kg1">روضة أولى (٣ - ٤ سنوات)</SelectItem>
                    <SelectItem value="kg2">روضة ثانية (٤ - ٥ سنوات)</SelectItem>
                    <SelectItem value="kg3">روضة ثالثة (٥ - ٦ سنوات)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <StickyNote className="h-4 w-4 text-emerald-600" />
                  ملاحظات إضافية
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي معلومات إضافية تود مشاركتها (حساسية، احتياجات خاصة، إلخ)"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-medium"
              >
                {registerMutation.isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري التسجيل...</>
                ) : (
                  "تسجيل في قائمة الانتظار"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          بتسجيلك فإنك توافق على سياسة الخصوصية وشروط الاستخدام
        </p>
      </div>
    </div>
  );
}
