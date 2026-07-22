import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import {
  ArrowRight, Edit, Trash2, User, Briefcase, Calendar, FileText, MessageSquare,
  FolderOpen, Plus, Phone, Mail, MapPin, Clock, CheckCircle, XCircle, AlertCircle,
  Download, Upload
} from "lucide-react";
import { useTranslation } from "react-i18next";

const JOB_TITLES: Record<string, string> = {
  teacher: "معلم/ة", supervisor: "مشرف/ة", principal: "مدير/ة",
  assistant: "مساعد/ة", admin_staff: "إداري/ة", specialist: "أخصائي/ة",
  accountant: "محاسب/ة", receptionist: "موظف/ة استقبال", driver: "سائق", other: "أخرى",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-800" },
  inactive: { label: "غير نشط", color: "bg-gray-100 text-gray-800" },
  on_leave: { label: "في إجازة", color: "bg-amber-100 text-amber-800" },
  terminated: { label: "منتهي", color: "bg-red-100 text-red-800" },
  resigned: { label: "مستقيل", color: "bg-orange-100 text-orange-800" },
};

const LEAVE_TYPES: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "اضطرارية",
  unpaid: "بدون راتب", maternity: "أمومة", other: "أخرى",
};

const LEAVE_STATUS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-600" },
  approved: { label: "مقبولة", icon: CheckCircle, color: "text-emerald-600" },
  rejected: { label: "مرفوضة", icon: XCircle, color: "text-red-600" },
  cancelled: { label: "ملغاة", icon: AlertCircle, color: "text-gray-500" },
};

const NOTE_TYPES: Record<string, { label: string; color: string }> = {
  general: { label: "عام", color: "bg-blue-100 text-blue-800" },
  performance: { label: "أداء", color: "bg-purple-100 text-purple-800" },
  warning: { label: "تنبيه", color: "bg-red-100 text-red-800" },
  appreciation: { label: "تقدير", color: "bg-emerald-100 text-emerald-800" },
  meeting: { label: "اجتماع", color: "bg-amber-100 text-amber-800" },
  other: { label: "أخرى", color: "bg-gray-100 text-gray-800" },
};

const DOC_TYPES: Record<string, string> = {
  contract: "عقد عمل", id_copy: "صورة هوية", certificate: "شهادة",
  license: "رخصة", medical: "تقرير طبي", other: "أخرى",
};

export default function StaffProfile() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const params = useParams<{ id: string }>();
  const staffId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: staff, isLoading } = trpc.staffManagement.getById.useQuery({ id: staffId });
  const { data: leaveBalance } = trpc.staffManagement.leaves.getBalance.useQuery({ staffProfileId: staffId });
  const { data: leavesData } = trpc.staffManagement.leaves.list.useQuery({ staffProfileId: staffId });
  const { data: notes } = trpc.staffManagement.notes.list.useQuery({ staffProfileId: staffId });
  const { data: documents } = trpc.staffManagement.documents.list.useQuery({ staffProfileId: staffId });

  // Note form state
  const [noteForm, setNoteForm] = useState({ title: "", content: "", type: "general" as any, isPrivate: false });
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  // Document upload
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", type: "other" as any, expiryDate: "", notes: "" });
  const [showDocDialog, setShowDocDialog] = useState(false);

  const createNote = trpc.staffManagement.notes.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الملاحظة");
      utils.staffManagement.notes.list.invalidate({ staffProfileId: staffId });
      setShowNoteDialog(false);
      setNoteForm({ title: "", content: "", type: "general", isPrivate: false });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteNote = trpc.staffManagement.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الملاحظة");
      utils.staffManagement.notes.list.invalidate({ staffProfileId: staffId });
    },
  });

  const createDocument = trpc.staffManagement.documents.create.useMutation({
    onSuccess: () => {
      toast.success("تم رفع المستند");
      utils.staffManagement.documents.list.invalidate({ staffProfileId: staffId });
      setShowDocDialog(false);
      setDocForm({ name: "", type: "other", expiryDate: "", notes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDocument = trpc.staffManagement.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستند");
      utils.staffManagement.documents.list.invalidate({ staffProfileId: staffId });
    },
  });

  const approveLeave = trpc.staffManagement.leaves.approve.useMutation({
    onSuccess: () => {
      toast.success("تم قبول الإجازة");
      utils.staffManagement.leaves.list.invalidate({ staffProfileId: staffId });
      utils.staffManagement.leaves.getBalance.invalidate({ staffProfileId: staffId });
    },
  });

  const rejectLeave = trpc.staffManagement.leaves.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض الإجازة");
      utils.staffManagement.leaves.list.invalidate({ staffProfileId: staffId });
    },
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن لا يتجاوز 10 ميجابايت");
      return;
    }
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-document'), { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      createDocument.mutate({
        staffProfileId: staffId,
        name: docForm.name || file.name,
        type: docForm.type,
        url: data.url,
        fileKey: data.key,
        mimeType: file.type,
        fileSize: file.size,
        expiryDate: docForm.expiryDate || undefined,
        notes: docForm.notes || undefined,
      });
    } catch {
      toast.error("فشل رفع المستند");
    } finally {
      setDocUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الموظف غير موجود</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/staff/staff-management")}>العودة للدليل</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/staff/staff-management")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">الملف الوظيفي</h1>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-l from-[#7C3AED] to-[#00C9B7]" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              {staff.photo ? (
                <img src={staff.photo} alt={staff.fullNameAr || ""} className="h-full w-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-[#7C3AED]/10 text-[#7C3AED] text-2xl font-bold">
                  {staff.fullNameAr?.charAt(0) || "م"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h2 className="text-xl font-bold">{staff.fullNameAr}</h2>
                <Badge className={STATUS_MAP[staff.status]?.color}>{STATUS_MAP[staff.status]?.label}</Badge>
              </div>
              <p className="text-muted-foreground">{JOB_TITLES[staff.jobTitle] || staff.customJobTitle || staff.jobTitle}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {staff.department && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{staff.department}</span>}
                {staff.branch && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{staff.branch}</span>}
                {staff.mobile && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /><span dir="ltr">{staff.mobile}</span></span>}
                {staff.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{staff.email}</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/staff/staff-management/${staffId}/edit`)}>
              <Edit className="h-3.5 w-3.5" />
              تعديل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="info" className="gap-1.5 text-xs md:text-sm"><User className="h-3.5 w-3.5" />المعلومات</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs md:text-sm"><Calendar className="h-3.5 w-3.5" />الإجازات</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 text-xs md:text-sm"><Clock className="h-3.5 w-3.5" />الحضور</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs md:text-sm"><MessageSquare className="h-3.5 w-3.5" />الملاحظات</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs md:text-sm"><FolderOpen className="h-3.5 w-3.5" />{isAr ? "المستندات" : "Documents"}</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">البيانات الشخصية</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="الاسم بالإنجليزي" value={staff.fullNameEn} />
                <InfoRow label="رقم الهوية" value={staff.nationalId} />
                <InfoRow label="رقم الإقامة" value={staff.iqamaNumber} />
                <InfoRow label="تاريخ الميلاد" value={staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString("ar-SA") : null} />
                <InfoRow label="الجنس" value={staff.gender === "male" ? "ذكر" : staff.gender === "female" ? "أنثى" : null} />
                <InfoRow label="الجنسية" value={staff.nationality} />
                <InfoRow label="الحالة الاجتماعية" value={staff.maritalStatus ? { single: "أعزب/عزباء", married: "متزوج/ة", divorced: "مطلق/ة", widowed: "أرمل/ة" }[staff.maritalStatus] : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">البيانات الوظيفية</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="تاريخ التعيين" value={staff.hireDate ? new Date(staff.hireDate).toLocaleDateString("ar-SA") : null} />
                <InfoRow label="نوع العقد" value={({ full_time: "دوام كامل", part_time: "دوام جزئي", contract: "عقد مؤقت", temporary: "مؤقت" } as Record<string, string>)[staff.contractType || ""] || null} />
                <InfoRow label="انتهاء العقد" value={staff.contractEndDate ? new Date(staff.contractEndDate).toLocaleDateString("ar-SA") : null} />
                <InfoRow label="المؤهل" value={staff.qualification} />
                <InfoRow label="التخصص" value={staff.specialization} />
                <InfoRow label="سنوات الخبرة" value={staff.yearsOfExperience?.toString()} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">البيانات المالية</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="البنك" value={staff.bankName} />
                <InfoRow label="الآيبان" value={staff.iban} dir="ltr" />
                <InfoRow label="الراتب" value={staff.salary ? `${staff.salary} ريال` : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">جهة الطوارئ</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="الاسم" value={staff.emergencyContactName} />
                <InfoRow label="الهاتف" value={staff.emergencyContactPhone} dir="ltr" />
                <InfoRow label="صلة القرابة" value={staff.emergencyContactRelation} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <div className="space-y-4">
            {/* Leave Balance */}
            {leaveBalance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-r-4 border-r-blue-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{(leaveBalance as any).annualTotal - (leaveBalance as any).annualUsed}</p>
                    <p className="text-xs text-muted-foreground">سنوية متبقية</p>
                    <p className="text-xs text-blue-600">{(leaveBalance as any).annualUsed}/{(leaveBalance as any).annualTotal}</p>
                  </CardContent>
                </Card>
                <Card className="border-r-4 border-r-orange-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{(leaveBalance as any).sickTotal - (leaveBalance as any).sickUsed}</p>
                    <p className="text-xs text-muted-foreground">مرضية متبقية</p>
                    <p className="text-xs text-orange-600">{(leaveBalance as any).sickUsed}/{(leaveBalance as any).sickTotal}</p>
                  </CardContent>
                </Card>
                <Card className="border-r-4 border-r-red-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{(leaveBalance as any).emergencyTotal - (leaveBalance as any).emergencyUsed}</p>
                    <p className="text-xs text-muted-foreground">اضطرارية متبقية</p>
                    <p className="text-xs text-red-600">{(leaveBalance as any).emergencyUsed}/{(leaveBalance as any).emergencyTotal}</p>
                  </CardContent>
                </Card>
                <Card className="border-r-4 border-r-gray-500">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{(leaveBalance as any).unpaidUsed}</p>
                    <p className="text-xs text-muted-foreground">بدون راتب مستخدمة</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leaves List */}
            <Card>
              <CardHeader><CardTitle className="text-base">سجل الإجازات</CardTitle></CardHeader>
              <CardContent>
                {!leavesData?.items?.length ? (
                  <p className="text-center text-muted-foreground py-6">لا توجد إجازات مسجلة</p>
                ) : (
                  <div className="space-y-3">
                    {leavesData.items.map((item: any) => {
                      const leave = item.leave;
                      const statusInfo = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
                      const StatusIcon = statusInfo.icon;
                      return (
                        <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            <div>
                              <p className="font-medium text-sm">{LEAVE_TYPES[leave.type] || leave.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(leave.startDate).toLocaleDateString("ar-SA")} — {new Date(leave.endDate).toLocaleDateString("ar-SA")} ({leave.totalDays} يوم)
                              </p>
                              {leave.reason && <p className="text-xs text-muted-foreground mt-0.5">{leave.reason}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${statusInfo.color} bg-transparent border`}>{statusInfo.label}</Badge>
                            {leave.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 text-emerald-600" onClick={() => approveLeave.mutate({ id: leave.id })}>قبول</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => rejectLeave.mutate({ id: leave.id })}>{isAr ? "رفض" : "Reject"}</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">سجل الحضور</h3>
              <p className="text-muted-foreground">يمكنك تتبع حضور وانصراف الموظف من صفحة الحضور الرئيسية</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/staff/attendance")}>
                الذهاب لصفحة الحضور
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">الملاحظات</CardTitle>
              <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />إضافة ملاحظة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>إضافة ملاحظة جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>العنوان</Label>
                      <Input value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>النوع</Label>
                      <Select value={noteForm.type} onValueChange={v => setNoteForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(NOTE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>المحتوى</Label>
                      <Textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} rows={4} />
                    </div>
                    <Button onClick={() => createNote.mutate({ staffProfileId: staffId, ...noteForm })} disabled={!noteForm.title || !noteForm.content || createNote.isPending} className="w-full">
                      {createNote.isPending ? "جاري الحفظ..." : "حفظ الملاحظة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!notes?.length ? (
                <p className="text-center text-muted-foreground py-6">لا توجد ملاحظات</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((item: any) => (
                    <div key={item.note.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{item.note.title}</h4>
                            <Badge className={`text-xs ${NOTE_TYPES[item.note.type]?.color || ""}`}>{NOTE_TYPES[item.note.type]?.label || item.note.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{item.note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">بواسطة: {item.authorName} • {new Date(item.note.createdAt).toLocaleDateString("ar-SA")}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteNote.mutate({ id: item.note.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{isAr ? "المستندات" : "Documents"}</CardTitle>
              <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Upload className="h-3.5 w-3.5" />رفع مستند</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>رفع مستند جديد</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المستند</Label>
                      <Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: عقد العمل" />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع المستند</Label>
                      <Select value={docForm.type} onValueChange={v => setDocForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الانتهاء (اختياري)</Label>
                      <Input type="date" value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? "ملاحظات" : "Notes"}</Label>
                      <Input value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <Button onClick={() => docInputRef.current?.click()} disabled={docUploading} className="w-full gap-2">
                      <Upload className="h-4 w-4" />
                      {docUploading ? "جاري الرفع..." : "اختيار ملف ورفعه"}
                    </Button>
                    <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} />
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!documents?.length ? (
                <p className="text-center text-muted-foreground py-6">لا توجد مستندات</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#7C3AED]/10">
                          <FileText className="h-4 w-4 text-[#7C3AED]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPES[doc.type] || doc.type}
                            {doc.expiryDate && ` • ينتهي: ${new Date(doc.expiryDate).toLocaleDateString("ar-SA")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.url, "_blank")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteDocument.mutate({ id: doc.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" dir={dir}>{value}</span>
    </div>
  );
}
