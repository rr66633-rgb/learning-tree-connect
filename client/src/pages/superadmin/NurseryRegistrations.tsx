import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import {
  ClipboardList, Search, CheckCircle2, XCircle, Clock, Eye,
  Building2, User, Phone, Mail, MapPin, Calendar
} from "lucide-react";

export default function NurseryRegistrations() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data: registrations, isLoading, refetch } = trpc.registration.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const updateStatus = trpc.registration.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApprove = (id: number) => {
    updateStatus.mutate({ id, status: "approved" });
  };

  const handleReject = () => {
    if (!rejectingId) return;
    updateStatus.mutate({ id: rejectingId, status: "rejected", rejectionReason });
  };

  const filteredRegistrations = (registrations || []).filter((r: any) =>
    r.nurseryName?.includes(searchQuery) || r.nurseryNameAr?.includes(searchQuery) || r.ownerName?.includes(searchQuery) || r.ownerEmail?.includes(searchQuery) || r.ownerPhone?.includes(searchQuery)
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 ml-1" /> قيد المراجعة</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 ml-1" /> تمت الموافقة</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 ml-1" /> مرفوض</Badge>;
      case "converted": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="w-3 h-3 ml-1" /> تم التحويل</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = (registrations || []).filter((r: any) => r.status === "pending").length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <ClipboardList className="w-7 h-7 text-emerald-600" />
          طلبات تسجيل الحضانات
        </h1>
        <p className="text-muted-foreground">مراجعة والموافقة على طلبات التسجيل الجديدة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50/50">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">قيد المراجعة</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <div className="text-2xl font-bold">{(registrations || []).filter((r: any) => r.status === "approved").length}</div>
            <div className="text-sm text-muted-foreground">تمت الموافقة</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50">
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
            <div className="text-2xl font-bold">{(registrations || []).filter((r: any) => r.status === "rejected").length}</div>
            <div className="text-sm text-muted-foreground">مرفوض</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <Building2 className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-2xl font-bold">{(registrations || []).length}</div>
            <div className="text-sm text-muted-foreground">إجمالي الطلبات</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الحضانة أو المالك..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">قيد المراجعة</SelectItem>
            <SelectItem value="approved">تمت الموافقة</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات تسجيل</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRegistrations.map((reg: any) => (
            <Card key={reg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">{reg.nurseryName}</span>
                      {statusBadge(reg.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {reg.ownerName}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {reg.ownerPhone || "—"}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {reg.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(reg.createdAt).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedRegistration(reg); setShowDetailDialog(true); }}
                    >
                      <Eye className="w-4 h-4 ml-1" /> عرض
                    </Button>
                    {reg.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApprove(reg.id)}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-1" /> موافقة
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { setRejectingId(reg.id); setShowRejectDialog(true); }}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب التسجيل</DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">اسم الحضانة</label>
                  <p className="font-medium">{selectedRegistration.nurseryName}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">المدينة</label>
                  <p className="font-medium">{selectedRegistration.city}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">اسم المالك</label>
                  <p className="font-medium">{selectedRegistration.ownerName}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">البريد الإلكتروني</label>
                  <p className="font-medium">{selectedRegistration.ownerEmail || "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">رقم الجوال</label>
                  <p className="font-medium">{selectedRegistration.ownerPhone || "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">الخطة المطلوبة</label>
                  <p className="font-medium">{selectedRegistration.selectedPlan || "غير محدد"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">عدد الأطفال المتوقع</label>
                  <p className="font-medium">{selectedRegistration.childrenCount || "غير محدد"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">الحالة</label>
                  <div>{statusBadge(selectedRegistration.status)}</div>
                </div>
              </div>
              {selectedRegistration.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">ملاحظات</label>
                  <p className="font-medium">{selectedRegistration.notes}</p>
                </div>
              )}
              {selectedRegistration.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { handleApprove(selectedRegistration.id); setShowDetailDialog(false); }}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-1" /> موافقة
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setRejectingId(selectedRegistration.id); setShowRejectDialog(true); setShowDetailDialog(false); }}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 ml-1" /> رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">سبب الرفض (اختياري)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض..."
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={updateStatus.isPending}
              >
                تأكيد الرفض
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
