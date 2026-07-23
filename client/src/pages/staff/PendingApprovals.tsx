import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserCheck, UserX, Eye, Clock, Users, Mail, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function PendingApprovals() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: pendingUsers, isLoading } = trpc.users.pending.useQuery();
  const utils = trpc.useUtils();

  const approveUser = trpc.users.approveAsParent.useMutation({
    onSuccess: () => {
      utils.users.pending.invalidate();
      utils.users.list.invalidate();
      toast.success(isAr ? "تم قبول ولي الأمر بنجاح" : "Parent accepted successfully");
      setSelectedUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectUser = trpc.users.reject.useMutation({
    onSuccess: () => {
      utils.users.pending.invalidate();
      utils.users.list.invalidate();
      toast.success(isAr ? "تم رفض الطلب" : "Request rejected");
      setSelectedUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [selectedUser, setSelectedUser] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{isAr ? "طلبات الموافقة" : "Approval requests"}</h1>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "طلبات الموافقة" : "Approval requests"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isAr ? "مراجعة وقبول أو رفض حسابات أولياء الأمور الجدد" : "Review and approve or reject new parent accounts"}</p>
        </div>
        <Badge variant="secondary" className="gap-1 text-base px-3 py-1">
          <Clock className="h-4 w-4" />
          {pendingUsers?.length || 0} طلب معلق
        </Badge>
      </div>

      {(!pendingUsers || pendingUsers.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{isAr ? "لا توجد طلبات معلقة" : "No pending requests"}</h3>
            <p className="text-muted-foreground text-sm">{isAr ? "جميع الحسابات تمت مراجعتها" : "All Accounts Reviewed"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base">{user.name || isAr ? "مستخدم جديد" : "New User"}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      )}
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span dir="ltr">{user.phone}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      تاريخ التسجيل: {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedUser(user)}>
                    <Eye className="h-4 w-4" />
                    {isAr ? "عرض" : "View"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveUser.mutate({ id: user.id })}
                    disabled={approveUser.isPending}
                  >
                    <UserCheck className="h-4 w-4" />
                    {isAr ? "قبول" : "Accept"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => rejectUser.mutate({ id: user.id })}
                    disabled={rejectUser.isPending}
                  >
                    <UserX className="h-4 w-4" />
                    {isAr ? "رفض" : "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "تفاصيل المستخدم" : "User Details"}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Users className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name || isAr ? "مستخدم جديد" : "New User"}</h3>
                  <Badge variant="secondary">{isAr ? "في انتظار الموافقة" : "Pending Approval"}</Badge>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email"}</span>
                  <span>{selectedUser.email || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "رقم الجوال" : "Phone"}</span>
                  <span dir="ltr">{selectedUser.phone || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "رقم الهوية" : "National ID"}</span>
                  <span dir="ltr">{selectedUser.nationalId || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "تاريخ التسجيل" : "Registration Date"}</span>
                  <span>{new Date(selectedUser.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "طريقة التسجيل" : "Registration method"}</span>
                  <span>{selectedUser.loginMethod || isAr ? "مباشر" : "Direct"}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>{isAr ? "إغلاق" : "Close"}</Button>
            <Button
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => approveUser.mutate({ id: selectedUser.id })}
              disabled={approveUser.isPending}
            >
              <UserCheck className="h-4 w-4" />
              {isAr ? "قبول كولي أمر" : "Accept as Guardian"}
            </Button>
            <Button
              variant="destructive"
              className="gap-1"
              onClick={() => rejectUser.mutate({ id: selectedUser.id })}
              disabled={rejectUser.isPending}
            >
              <UserX className="h-4 w-4" />
              {isAr ? "رفض" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
