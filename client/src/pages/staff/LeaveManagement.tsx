import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  CalendarDays, Palmtree, Stethoscope, AlertTriangle
} from "lucide-react";

const LEAVE_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  annual: { label: "سنوية", icon: Palmtree, color: "text-blue-600 bg-blue-50" },
  sick: { label: "مرضية", icon: Stethoscope, color: "text-orange-600 bg-orange-50" },
  emergency: { label: "اضطرارية", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  unpaid: { label: "بدون راتب", icon: CalendarDays, color: "text-gray-600 bg-gray-50" },
  maternity: { label: "أمومة", icon: Calendar, color: "text-pink-600 bg-pink-50" },
  other: { label: "أخرى", icon: Calendar, color: "text-purple-600 bg-purple-50" },
};

const LEAVE_STATUS: Record<string, { label: string; icon: any; color: string; badgeColor: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-600", badgeColor: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "مقبولة", icon: CheckCircle, color: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "مرفوضة", icon: XCircle, color: "text-red-600", badgeColor: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "ملغاة", icon: AlertCircle, color: "text-gray-500", badgeColor: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function LeaveManagement() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.staffManagement.leaves.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    page,
    limit,
  });

  const approveLeave = trpc.staffManagement.leaves.approve.useMutation({
    onSuccess: () => {
      toast.success("تم قبول الإجازة");
      utils.staffManagement.leaves.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectLeave = trpc.staffManagement.leaves.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض الإجازة");
      utils.staffManagement.leaves.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  // Count pending
  const pendingCount = data?.items?.filter((i: any) => i.leave.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الإجازات</h1>
        <p className="text-sm text-muted-foreground mt-1">مراجعة وإدارة طلبات الإجازات لجميع الموظفين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">بانتظار المراجعة</p>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{data?.items?.filter((i: any) => i.leave.type === "annual").length ?? 0}</p>
            <p className="text-xs text-muted-foreground">إجازات سنوية</p>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-orange-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{data?.items?.filter((i: any) => i.leave.type === "sick").length ?? 0}</p>
            <p className="text-xs text-muted-foreground">إجازات مرضية</p>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-red-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{data?.items?.filter((i: any) => i.leave.type === "emergency").length ?? 0}</p>
            <p className="text-xs text-muted-foreground">إجازات اضطرارية</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(LEAVE_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leaves List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !data?.items?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد طلبات إجازة</h3>
            <p className="text-muted-foreground">لم يتم تقديم أي طلبات إجازة بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((item: any) => {
            const leave = item.leave;
            const typeInfo = LEAVE_TYPES[leave.type] || LEAVE_TYPES.other;
            const statusInfo = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={leave.id} className={leave.status === "pending" ? "border-amber-200 bg-amber-50/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${typeInfo.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{item.staffName || "موظف"}</h3>
                          {item.staffJobTitle && (
                            <span className="text-xs text-muted-foreground">({
                              { teacher: "معلم/ة", supervisor: "مشرف/ة", principal: "مدير/ة", assistant: "مساعد/ة", admin_staff: "إداري/ة", specialist: "أخصائي/ة" }[item.staffJobTitle as string] || item.staffJobTitle
                            })</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeInfo.label} • {new Date(leave.startDate).toLocaleDateString("ar-SA")} — {new Date(leave.endDate).toLocaleDateString("ar-SA")} ({leave.totalDays} يوم)
                        </p>
                        {leave.reason && <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusInfo.badgeColor}>{statusInfo.label}</Badge>
                      {leave.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => approveLeave.mutate({ id: leave.id })}
                            disabled={approveLeave.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => rejectLeave.mutate({ id: leave.id })}
                            disabled={rejectLeave.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5 ml-1" />
                            رفض
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
