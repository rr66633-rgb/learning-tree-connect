import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Crown, Search, RefreshCw, XCircle, Clock, CheckCircle2,
  AlertTriangle, TrendingUp, Building2, CalendarDays, Banknote
} from "lucide-react";

type SubStatus = "all" | "active" | "expired" | "cancelled" | "past_due" | "trialing";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  active: { label: "نشط", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  expired: { label: "منتهي", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: XCircle },
  cancelled: { label: "ملغي", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200", icon: XCircle },
  past_due: { label: "متأخر الدفع", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: AlertTriangle },
  trialing: { label: "فترة تجريبية", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Clock },
};

function getDaysRemaining(endDate: string | Date | null): { days: number; text: string; urgent: boolean } {
  if (!endDate) return { days: 0, text: "غير محدد", urgent: false };
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { days, text: `منتهي منذ ${Math.abs(days)} يوم`, urgent: true };
  if (days === 0) return { days: 0, text: "ينتهي اليوم", urgent: true };
  if (days <= 7) return { days, text: `${days} أيام متبقية`, urgent: true };
  if (days <= 30) return { days, text: `${days} يوم متبقي`, urgent: false };
  return { days, text: `${days} يوم متبقي`, urgent: false };
}

function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SubscriptionsManagement() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [statusFilter, setStatusFilter] = useState<SubStatus>("all");
  const [search, setSearch] = useState("");
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [renewCycle, setRenewCycle] = useState<"monthly" | "yearly">("yearly");

  const { data, isLoading, refetch } = trpc.superAdmin.listSubscriptions.useQuery({
    status: statusFilter,
    search: search || undefined,
  });

  const renewMutation = trpc.superAdmin.renewSubscription.useMutation({
    onSuccess: () => {
      toast.success("تم تجديد الاشتراك بنجاح");
      refetch();
      setRenewDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.superAdmin.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الاشتراك");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const stats = data?.stats;
  const subscriptions = data?.subscriptions || [];

  // Summary cards data
  const summaryCards = useMemo(() => [
    { label: "إجمالي الاشتراكات", value: stats?.total || 0, icon: Crown, color: "#7C3AED", bg: "bg-purple-50" },
    { label: "نشط", value: stats?.active || 0, icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50" },
    { label: "فترة تجريبية", value: stats?.trialing || 0, icon: Clock, color: "#3b82f6", bg: "bg-blue-50" },
    { label: "منتهي / ملغي", value: (stats?.expired || 0) + (stats?.cancelled || 0), icon: XCircle, color: "#ef4444", bg: "bg-red-50" },
  ], [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="w-6 h-6 text-[#F97316]" />
            إدارة الاشتراكات
          </h1>
          <p className="text-muted-foreground mt-1">متابعة جميع اشتراكات الحضانات وحالتها</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`${card.bg} border`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الحضانة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubStatus)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="حالة الاشتراك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="trialing">فترة تجريبية</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
                <SelectItem value="past_due">متأخر الدفع</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد اشتراكات مطابقة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const config = statusConfig[sub.status] || statusConfig.active;
            const StatusIcon = config.icon;
            const remaining = getDaysRemaining(sub.currentPeriodEnd);

            return (
              <Card key={sub.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Organization Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED]/10 to-[#00C9B7]/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#7C3AED]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {sub.orgNameAr || sub.orgName || "—"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {sub.planNameAr || sub.planName || "—"} • {sub.billingCycle === "yearly" ? "سنوي" : "شهري"}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${config.bgColor} ${config.color} border gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </div>

                    {/* Remaining Days */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <CalendarDays className={`w-4 h-4 ${remaining.urgent ? "text-red-500" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${remaining.urgent ? "text-red-600" : "text-foreground"}`}>
                        {remaining.text}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {sub.amount} ر.س
                      </span>
                    </div>

                    {/* Period */}
                    <div className="text-xs text-muted-foreground min-w-[160px]">
                      <div>من: {formatDate(sub.currentPeriodStart)}</div>
                      <div>إلى: {formatDate(sub.currentPeriodEnd)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(sub.status === "expired" || sub.status === "cancelled" || sub.status === "past_due" || sub.status === "trialing") && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={() => {
                            setSelectedSubId(sub.id);
                            setRenewDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          تجديد
                        </Button>
                      )}
                      {(sub.status === "active" || sub.status === "trialing") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من إلغاء هذا الاشتراك؟")) {
                              cancelMutation.mutate({ subscriptionId: sub.id });
                            }
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          إلغاء
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تجديد الاشتراك</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">دورة الفوترة</label>
              <Select value={renewCycle} onValueChange={(v) => setRenewCycle(v as "monthly" | "yearly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">سنوي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedSubId) {
                    renewMutation.mutate({ subscriptionId: selectedSubId, billingCycle: renewCycle });
                  }
                }}
                disabled={renewMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                {renewMutation.isPending ? "جاري التجديد..." : "تأكيد التجديد"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
