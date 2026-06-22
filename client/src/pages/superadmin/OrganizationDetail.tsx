import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "lucide-react";

export default function OrganizationDetail() {
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>المنظمة غير موجودة</p>
        <Button variant="outline" onClick={() => navigate("/super-admin")} className="mt-4">
          العودة للوحة التحكم
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    trial: "bg-blue-500/20 text-blue-400",
    pending: "bg-amber-500/20 text-amber-400",
    suspended: "bg-red-500/20 text-red-400",
  };

  const statusLabels: Record<string, string> = {
    active: "نشطة",
    trial: "تجريبية",
    pending: "قيد المراجعة",
    suspended: "معلّقة",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/super-admin")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{org.nameAr}</h1>
            <p className="text-slate-400">{org.name} • {org.city || "غير محدد"}</p>
          </div>
          <Badge className={`${statusColors[org.status]} border-0`}>
            {statusLabels[org.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {org.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => toggleStatus.mutate({ id: orgId, status: "suspended" })}
            >
              <Ban className="w-4 h-4 ml-1" />
              تعليق
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => toggleStatus.mutate({ id: orgId, status: "active" })}
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              تفعيل
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">الأطفال</p>
              <p className="text-xl font-bold text-white">{org.stats.children}</p>
            </div>
            <p className="text-xs text-slate-500 mr-auto">الحد: {org.maxChildren}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">الموظفون</p>
              <p className="text-xl font-bold text-white">{org.stats.staff}</p>
            </div>
            <p className="text-xs text-slate-500 mr-auto">الحد: {org.maxStaff}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <School className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">الفصول</p>
              <p className="text-xl font-bold text-white">{org.stats.classes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              معلومات المنظمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="الاسم بالعربية" value={org.nameAr} />
            <InfoRow label="الاسم بالإنجليزية" value={org.name} />
            <InfoRow label="المعرف" value={org.slug} />
            <InfoRow label="النسخة" value={org.edition === "learning_tree" ? "شجرة التعلم" : "نشأة"} />
            <InfoRow label="الهاتف" value={org.phone || "غير محدد"} />
            <InfoRow label="البريد" value={org.email || "غير محدد"} />
            <InfoRow label="المدينة" value={org.city || "غير محدد"} />
            <InfoRow label="رقم الترخيص" value={org.licenseNumber || "غير محدد"} />
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                الاشتراك
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowPlanDialog(true)}
              >
                <Edit className="w-3 h-3 ml-1" />
                تغيير الخطة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {org.subscription ? (
              <>
                <InfoRow label="الخطة" value={plans?.find(p => p.id === org.subscription?.planId)?.nameAr || "غير محدد"} />
                <InfoRow label="الحالة" value={org.subscription.status === "active" ? "نشط" : org.subscription.status === "trialing" ? "تجريبي" : org.subscription.status} />
                <InfoRow label="دورة الفوترة" value={org.subscription.billingCycle === "monthly" ? "شهرية" : "سنوية"} />
                <InfoRow label="المبلغ" value={`${org.subscription.amount} ${org.subscription.currency}`} />
              </>
            ) : (
              <p className="text-slate-400 text-sm">لا يوجد اشتراك نشط</p>
            )}
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              الهوية البصرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            {org.branding ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">الألوان:</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: org.branding.primaryColor || "#10b981" }} title="أساسي" />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: org.branding.secondaryColor || "#059669" }} title="ثانوي" />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: org.branding.accentColor || "#34d399" }} title="مميز" />
                  </div>
                </div>
                <InfoRow label="الخط" value={org.branding.fontFamily || "Noto Sans Arabic"} />
                <InfoRow label="نمط الشريط الجانبي" value={org.branding.sidebarStyle || "dark"} />
              </div>
            ) : (
              <p className="text-slate-400 text-sm">لم يتم تخصيص الهوية البصرية</p>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              الأعضاء ({members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.slice(0, 10).map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <p className="text-sm text-white">{member.userName || "مستخدم"}</p>
                      <p className="text-xs text-slate-400">{member.userEmail || ""}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">لا يوجد أعضاء</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">تغيير خطة الاشتراك</DialogTitle>
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

const roleLabels: Record<string, string> = {
  owner: "مالك",
  admin: "مدير",
  principal: "مديرة",
  teacher: "معلمة",
  assistant: "مساعدة",
  accountant: "محاسب",
  receptionist: "استقبال",
  parent: "ولي أمر",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
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
  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-300">الخطة</Label>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white mt-1">
            <SelectValue placeholder="اختر الخطة" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id.toString()}>
                {plan.nameAr} - {plan.priceMonthly} ر.س/شهر
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300">دورة الفوترة</Label>
        <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">شهرية</SelectItem>
            <SelectItem value="yearly">سنوية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={!planId || isLoading}
        onClick={() => onSubmit(parseInt(planId), billingCycle)}
      >
        {isLoading ? "جاري التعيين..." : "تعيين الخطة"}
      </Button>
    </div>
  );
}
