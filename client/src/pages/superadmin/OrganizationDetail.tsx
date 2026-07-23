import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Users,
  GraduationCap,
  School,
  Palette,
  CreditCard,
  Shield,
  Edit,
  Ban,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react";

export default function OrganizationDetail() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isAr = i18n.language === "ar";
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const orgId = parseInt(params.id || "0");
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const { data: org, isLoading, refetch } = trpc.superAdmin.getOrganization.useQuery({ id: orgId });
  const { data: plans } = trpc.superAdmin.listPlans.useQuery();
  const { data: members } = trpc.superAdmin.listMembers.useQuery({ organizationId: orgId });

  const toggleStatus = trpc.superAdmin.toggleOrganizationStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignPlan = trpc.superAdmin.assignPlan.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowPlanDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-lg font-medium text-foreground">{isAr ? "المنظمة غير موجودة" : "Organization not found"}</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/super-admin/organizations")}>
          {isAr ? "العودة للقائمة" : "Back to Menu"}
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    trial: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    suspended: "bg-red-100 text-red-700 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    active: t("superadmin.active"),
    trial: t("superadmin.trial"),
    pending: (isAr ? "قيد المراجعة" : "Under Review"),
    suspended: t("superadmin.suspended"),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/super-admin/organizations")}
          className="text-muted-foreground hover:text-foreground rounded-lg"
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          {isAr ? "العودة" : "Back"}
        </Button>
      </div>

      {/* Organization Header Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-l from-[#7B61FF] via-[#00C9B7] to-[#FF5CA8]" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-[#7B61FF]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{org.nameAr}</h1>
                <p className="text-muted-foreground">{org.name} {org.city ? `• ${org.city}` : ""}</p>
              </div>
              <Badge variant="outline" className={`${statusColors[org.status]} rounded-lg`}>
                {statusLabels[org.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {org.status === "active" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Ban className="w-4 h-4 ml-1" />
                      {isAr ? "تعليق" : "Comment"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{isAr ? "تأكيد تعليق المنظمة" : "Confirm Organization Suspension"}</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من تعليق هذه المنظمة؟ سيتم منع جميع المستخدمين من الوصول للنظام.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-lg">{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 rounded-lg"
                        onClick={() => toggleStatus.mutate({ id: orgId, status: "suspended" })}
                      >
                        {isAr ? "تعليق المنظمة" : "Organization Comment"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                  onClick={() => toggleStatus.mutate({ id: orgId, status: "active" })}
                >
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  {isAr ? "تفعيل" : "Activate"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-[#7B61FF]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "الأطفال" : "Children"}</p>
              <p className="text-2xl font-bold text-foreground">{org.stats.children}</p>
            </div>
            <p className="text-xs text-muted-foreground mr-auto bg-muted/50 px-2 py-1 rounded-lg">الحد: {org.maxChildren}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#00C9B7]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#00C9B7]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الموظفون</p>
              <p className="text-2xl font-bold text-foreground">{org.stats.staff}</p>
            </div>
            <p className="text-xs text-muted-foreground mr-auto bg-muted/50 px-2 py-1 rounded-lg">الحد: {org.maxStaff}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#FF5CA8]/10 flex items-center justify-center">
              <School className="w-6 h-6 text-[#FF5CA8]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isAr ? "الفصول" : "Semesters"}</p>
              <p className="text-2xl font-bold text-foreground">{org.stats.classes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#00C9B7]/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#00C9B7]" />
              </div>
              {isAr ? "معلومات المنظمة" : "Organization Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label={isAr ? "الاسم بالعربية" : "Name (Arabic)"} value={org.nameAr} />
            <InfoRow label={isAr ? "الاسم بالإنجليزية" : "Name (English)"} value={org.name} />
            <InfoRow label={isAr ? "المعرف" : "Identifier"} value={org.slug} />
            <InfoRow label={t("superadmin.edition")} value={org.edition === "learning_tree" ? (isAr ? "شجرة التعلم" : "Learning Tree") : (isAr ? "نشأة" : "Nasha'a")} />
            <InfoRow label={t("common.phone")} value={org.phone || (isAr ? "غير محدد" : "Undefined")} icon={<Phone className="w-3.5 h-3.5" />} />
            <InfoRow label="البريد" value={org.email || (isAr ? "غير محدد" : "Undefined")} icon={<Mail className="w-3.5 h-3.5" />} />
            <InfoRow label="المدينة" value={org.city || (isAr ? "غير محدد" : "Undefined")} icon={<MapPin className="w-3.5 h-3.5" />} />
            <InfoRow label="رقم الترخيص" value={org.licenseNumber || (isAr ? "غير محدد" : "Undefined")} icon={<FileText className="w-3.5 h-3.5" />} />
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#FFB020]/10 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#FFB020]" />
                </div>
                {isAr ? "الاشتراك" : "Subscription"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => setShowPlanDialog(true)}
              >
                <Edit className="w-3 h-3 ml-1" />
                {isAr ? "تغيير الخطة" : "Change Plan"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {org.subscription ? (
              <>
                <InfoRow label={isAr ? "الخطة" : "Plan"} value={plans?.find(p => p.id === org.subscription?.planId)?.nameAr || "غير محدد"} />
                <InfoRow label={t("common.status")} value={org.subscription.status === "active" ? "نشط" : org.subscription.status === "trialing" ? (isAr ? "تجريبي" : "Trial") : org.subscription.status} />
                <InfoRow label={isAr ? "دورة الفوترة" : "Billing Cycle"} value={org.subscription.billingCycle === "monthly" ? "شهرية" : "سنوية"} />
                <InfoRow label={t("superadmin.amount")} value={`${org.subscription.amount} ${org.subscription.currency}`} />
              </>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">{isAr ? "لا يوجد اشتراك نشط" : "No active subscription"}</p>
                <Button size="sm" className="mt-3 rounded-lg" onClick={() => setShowPlanDialog(true)}>
                  {isAr ? "تعيين خطة" : "Assign Plan"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#FF5CA8]/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#FF5CA8]" />
              </div>
              {isAr ? "الهوية البصرية" : "Visual Identity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {org.branding ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">الألوان:</span>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-lg border border-border/50 shadow-sm" style={{ backgroundColor: org.branding.primaryColor || "#00C9B7" }} title="أساسي" />
                    <div className="w-7 h-7 rounded-lg border border-border/50 shadow-sm" style={{ backgroundColor: org.branding.secondaryColor || "#7B61FF" }} title="ثانوي" />
                    <div className="w-7 h-7 rounded-lg border border-border/50 shadow-sm" style={{ backgroundColor: org.branding.accentColor || "#FF5CA8" }} title="مميز" />
                  </div>
                </div>
                <InfoRow label={isAr ? "الخط" : "Font"} value={org.branding.fontFamily || "Cairo"} />
                <InfoRow label={isAr ? "نمط الشريط الجانبي" : "Sidebar Style"} value={org.branding.sidebarStyle === "dark" ? "داكن" : org.branding.sidebarStyle === "light" ? "فاتح" : "متدرج"} />
              </div>
            ) : (
              <div className="text-center py-6">
                <Palette className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">{isAr ? "لم يتم تخصيص الهوية البصرية" : "Visual identity not customized"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#7B61FF]/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#7B61FF]" />
              </div>
              الأعضاء ({members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {members.slice(0, 10).map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.userName || (isAr ? "مستخدم" : "User")}</p>
                      <p className="text-xs text-muted-foreground">{member.userEmail || ""}</p>
                    </div>
                    <Badge variant="outline" className="text-xs rounded-lg">
                      {getRoleLabels(isAr)[member.role] || member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">{isAr ? "لا يوجد أعضاء" : "No members"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "تغيير خطة الاشتراك" : "Change Subscription Plan"}</DialogTitle>
            <DialogDescription>{isAr ? "اختر الخطة ودورة الفوترة المناسبة" : "Choose the plan and billing cycle"}</DialogDescription>
          </DialogHeader>
          <AssignPlanForm
            plans={plans || []}
            orgId={orgId}
            onSubmit={(planId, billingCycle) => {
              assignPlan.mutate({ organizationId: orgId, planId, billingCycle });
            }}
            isLoading={assignPlan.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const getRoleLabels = (isAr: boolean): Record<string, string>  => ({
  owner: (isAr ? "مالك" : "Owner"),
  admin: (isAr ? "مدير" : "Manager"),
  principal: (isAr ? "مديرة" : "Director (female)"),
  teacher: (isAr ? "معلمة" : "Teacher (female)"),
  assistant: (isAr ? "مساعدة" : "Help"),
  accountant: (isAr ? "محاسب" : "Accountant"),
  receptionist: (isAr ? "استقبال" : "Reception"),
  parent: (isAr ? "ولي أمر" : "Parent/Guardian"),
});

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function AssignPlanForm({
  plans,
  orgId,
  onSubmit,
  isLoading,
}: {
  plans: any[];
  orgId: number;
  onSubmit: (planId: number, billingCycle: "monthly" | "yearly") => void;
  isLoading: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  return (
    <div className="space-y-4">
      <div>
        <Label>{isAr ? "الخطة" : "Plan"}</Label>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="rounded-lg mt-1.5">
            <SelectValue placeholder={isAr ? "اختر الخطة" : "Choose Plan"} />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id.toString()}>
                {plan.nameAr} - {plan.priceYearly} ر.س/سنة
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{isAr ? "دورة الفوترة" : "Billing Cycle"}</Label>
        <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
          <SelectTrigger className="rounded-lg mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yearly">سنوية</SelectItem>
            <SelectItem value="monthly">{isAr ? "شهرية" : "Monthly"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full rounded-xl"
        disabled={!planId || isLoading}
        onClick={() => onSubmit(parseInt(planId), billingCycle)}
      >
        {isLoading ? "جاري التعيين..." : (isAr ? "تعيين الخطة" : "Assign Plan")}
      </Button>
    </div>
  );
}
