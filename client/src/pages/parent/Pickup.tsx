import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, CheckCircle2, UserCheck, Bell, History } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  waiting: { label: "بانتظار الاستجابة", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock, description: "تم إرسال طلبك، بانتظار استجابة المعلمة" },
  called: { label: "تم استدعاء الطفل", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Bell, description: "تم استدعاء طفلك من الفصل، يرجى الانتظار" },
  ready: { label: "جاهز للاستلام", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, description: "طفلك جاهز للاستلام، يرجى التوجه للاستقبال" },
  picked_up: { label: "تم الاستلام", color: "bg-gray-100 text-gray-700 border-gray-200", icon: UserCheck, description: "تم تسليم طفلك بنجاح" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700 border-red-200", icon: Clock, description: "تم إلغاء الطلب" },
};

export default function ParentPickup() {
  const { data: children, isLoading: loadingChildren } = trpc.children.list.useQuery();
  const { data: myRequests, refetch: refetchRequests } = trpc.pickup.myRequests.useQuery();
  const [showHistory, setShowHistory] = useState(false);

  const requestPickup = trpc.pickup.request.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الاستلام بنجاح");
      refetchRequests();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال الطلب");
    },
  });

  const cancelPickup = trpc.pickup.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء طلب الاستلام");
      refetchRequests();
    },
  });

  // Get active requests (not picked_up or cancelled)
  const activeRequests = myRequests?.filter((r: any) => ["waiting", "called", "ready"].includes(r.status)) || [];
  const historyRequests = myRequests?.filter((r: any) => ["picked_up", "cancelled"].includes(r.status)) || [];

  // Check if child has active request
  const hasActiveRequest = (childId: number) => {
    return activeRequests.some((r: any) => r.childId === childId);
  };

  const getActiveRequestForChild = (childId: number) => {
    return activeRequests.find((r: any) => r.childId === childId);
  };

  if (loadingChildren) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">طلب الاستلام</h1>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="h-4 w-4 ml-2" />
          {showHistory ? "الطلبات الحالية" : "السجل"}
        </Button>
      </div>

      {!showHistory ? (
        <>
          {/* Active pickup requests status */}
          {activeRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">الطلبات النشطة</h2>
              {activeRequests.map((req: any) => {
                const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.waiting;
                const StatusIcon = config.icon;
                return (
                  <Card key={req.id} className={`border-2 ${req.status === 'ready' ? 'border-green-300 bg-green-50/50' : 'border-primary/20'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {req.childPhoto ? (
                          <img src={req.childPhoto} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                            {req.childFirstName?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{req.childFirstName} {req.childLastName}</p>
                          <Badge className={`${config.color} mt-1`}>
                            <StatusIcon className="h-3.5 w-3.5 ml-1" />
                            {config.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                        </div>
                        {req.status === 'waiting' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => cancelPickup.mutate({ id: req.id })}
                            disabled={cancelPickup.isPending}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                      {/* Progress steps */}
                      <div className="mt-4 flex items-center gap-1">
                        {["waiting", "called", "ready", "picked_up"].map((step, i) => {
                          const stepIndex = ["waiting", "called", "ready", "picked_up"].indexOf(req.status);
                          const isActive = i <= stepIndex;
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className={`h-2 flex-1 rounded-full ${isActive ? 'bg-primary' : 'bg-muted'}`} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>بانتظار</span>
                        <span>استدعاء</span>
                        <span>جاهز</span>
                        <span>تم</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Children cards with "I'm Here" button */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">أطفالي</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children?.map((child: any) => {
                const hasActive = hasActiveRequest(child.id);
                const activeReq = getActiveRequestForChild(child.id);
                return (
                  <Card key={child.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {child.photo ? (
                          <img src={child.photo} alt={`${child.firstName} ${child.lastName}`} className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                            {child.firstName?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{child.firstName} {child.lastName}</p>
                          <p className="text-sm text-muted-foreground">{child.className || ""}</p>
                        </div>
                      </div>
                      
                      {hasActive ? (
                        <div className="text-center py-2">
                          <Badge className={STATUS_CONFIG[activeReq?.status || "waiting"].color}>
                            {STATUS_CONFIG[activeReq?.status || "waiting"].label}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                          onClick={() => requestPickup.mutate({ childId: child.id })}
                          disabled={requestPickup.isPending}
                        >
                          <MapPin className="h-5 w-5 ml-2" />
                          {requestPickup.isPending ? "جاري الإرسال..." : "أنا هنا - طلب استلام"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Pickup History */
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">سجل الاستلام</h2>
          {historyRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد سجل استلام سابق</CardContent></Card>
          ) : (
            historyRequests.map((req: any) => (
              <Card key={req.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {req.childPhoto ? (
                      <img src={req.childPhoto} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {req.childFirstName?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{req.childFirstName} {req.childLastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.pickedUpAt ? new Date(req.pickedUpAt).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(req.requestedAt).toLocaleDateString('ar-SA')}
                      </p>
                      {req.pickedUpBy && <p className="text-xs text-muted-foreground">المستلم: {req.pickedUpBy}</p>}
                    </div>
                    <Badge className={STATUS_CONFIG[req.status]?.color || "bg-gray-100"}>
                      {STATUS_CONFIG[req.status]?.label || req.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
