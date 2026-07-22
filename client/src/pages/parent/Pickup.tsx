import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, UserCheck, Bell, History, Car, Timer, Send, Building2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

const STATUS_STEPS = [
  { key: "waiting_teacher", label: "تم إرسال الطلب", description: "بانتظار استجابة المعلمة", icon: Clock, color: "text-amber-600" },
  { key: "sent_to_reception", label: "طفلك في الطريق", description: "المعلمة أرسلت طفلك إلى الاستقبال", icon: Send, color: "text-blue-600" },
  { key: "waiting_at_reception", label: "طفلك بالاستقبال", description: "طفلك وصل الاستقبال وينتظرك", icon: Building2, color: "text-purple-600" },
  { key: "picked_up", label: "تم التسليم", description: "تم تسليم طفلك بنجاح", icon: UserCheck, color: "text-green-600" },
];

// Live timer showing how long the parent has been waiting
function ParentWaitTimer({ requestedAt }: { requestedAt: string | Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(requestedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [requestedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Timer className="h-4 w-4" />
      <span className="font-mono">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
      <span className="text-xs">وقت الانتظار</span>
    </div>
  );
}

export default function ParentPickup() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children, isLoading: loadingChildren } = trpc.children.list.useQuery();
  const { data: myRequests, refetch: refetchRequests } = trpc.pickup.myRequests.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const [showHistory, setShowHistory] = useState(false);

  const requestPickup = trpc.pickup.request.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إرسال طلب الاستلام - ستصلك إشعارات بكل تحديث" : "Pickup request sent - you will receive notifications for updates");
      refetchRequests();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال الطلب");
    },
  });

  const cancelPickup = trpc.pickup.cancel.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إلغاء طلب الاستلام" : "Pickup request cancelled");
      refetchRequests();
    },
  });

  // Get active requests (not picked_up or cancelled)
  const activeRequests = myRequests?.filter((r: any) => ["waiting_teacher", "sent_to_reception", "waiting_at_reception"].includes(r.status)) || [];
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
          {/* Active pickup requests with detailed status tracking */}
          {activeRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">الطلبات النشطة</h2>
              {activeRequests.map((req: any) => {
                const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === req.status);
                return (
                  <Card key={req.id} className={`border-2 ${req.status === 'waiting_at_reception' ? 'border-green-300 bg-green-50/30' : 'border-primary/20'}`}>
                    <CardContent className="p-5">
                      {/* Child info */}
                      <div className="flex items-center gap-4 mb-4">
                        {req.childPhoto ? (
                          <img src={req.childPhoto} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                            {req.childFirstName?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-lg">{req.childFirstName} {req.childLastName}</p>
                          <ParentWaitTimer requestedAt={req.requestedAt} />
                        </div>
                        {req.status === 'waiting_teacher' && (
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

                      {/* Current status message */}
                      {req.status === 'waiting_at_reception' && (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 text-center">
                          <Building2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
                          <p className="font-bold text-green-800">طفلك بالاستقبال!</p>
                          <p className="text-sm text-green-700">يرجى التوجه إلى الاستقبال لاستلام طفلك</p>
                        </div>
                      )}

                      {req.status === 'sent_to_reception' && (
                        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4 text-center">
                          <Send className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                          <p className="font-bold text-blue-800">طفلك في الطريق للاستقبال</p>
                          <p className="text-sm text-blue-700">المعلمة أرسلت طفلك إلى الاستقبال</p>
                        </div>
                      )}

                      {/* Step-by-step progress */}
                      <div className="space-y-0">
                        {STATUS_STEPS.map((step, i) => {
                          const isCompleted = i <= currentStepIndex;
                          const isCurrent = i === currentStepIndex;
                          const StepIcon = step.icon;
                          return (
                            <div key={step.key} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompleted ? 'bg-primary border-primary text-white' :
                                  'bg-muted border-muted-foreground/20 text-muted-foreground'
                                } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-2' : ''}`}>
                                  <StepIcon className="h-4 w-4" />
                                </div>
                                {i < STATUS_STEPS.length - 1 && (
                                  <div className={`w-0.5 h-8 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                                )}
                              </div>
                              <div className={`pt-1 ${isCurrent ? 'font-bold' : ''}`}>
                                <p className={`text-sm ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </p>
                                {isCurrent && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                )}
                                {isCompleted && i === 0 && req.requestedAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(req.requestedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                                {isCompleted && i === 1 && req.teacherResponseAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(req.teacherResponseAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                                {isCompleted && i === 2 && req.arrivedReceptionAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(req.arrivedReceptionAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                          <Badge className={
                            activeReq?.status === 'waiting_teacher' ? "bg-amber-100 text-amber-800 border-amber-200" :
                            activeReq?.status === 'sent_to_reception' ? "bg-blue-100 text-blue-800 border-blue-200" :
                            activeReq?.status === 'waiting_at_reception' ? "bg-green-100 text-green-800 border-green-200" :
                            "bg-gray-100 text-gray-800 border-gray-200"
                          }>
                            {activeReq?.status === 'waiting_teacher' && "بانتظار المعلمة"}
                            {activeReq?.status === 'sent_to_reception' && "طفلك في الطريق للاستقبال"}
                            {activeReq?.status === 'waiting_at_reception' && "طفلك بالاستقبال"}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 shadow-lg hover:shadow-xl transition-all active:scale-[0.97]"
                          onClick={() => requestPickup.mutate({ childId: child.id })}
                          disabled={requestPickup.isPending}
                        >
                          <Car className="h-5 w-5 ml-2" />
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
            <Card><CardContent><EmptyState variant="generic" compact title="لا يوجد سجل استلام سابق" description="ستظهر هنا طلبات الاستلام السابقة" /></CardContent></Card>
          ) : (
            historyRequests.map((req: any) => {
              const totalMinutes = req.requestedAt && req.pickedUpAt
                ? Math.round((new Date(req.pickedUpAt).getTime() - new Date(req.requestedAt).getTime()) / 60000)
                : null;
              return (
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
                        {totalMinutes !== null && (
                          <p className="text-xs text-muted-foreground">مدة الانتظار: {totalMinutes} دقيقة</p>
                        )}
                        {req.pickedUpBy && <p className="text-xs text-muted-foreground">المستلم: {req.pickedUpBy}</p>}
                      </div>
                      <Badge className={req.status === 'picked_up' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>
                        {req.status === 'picked_up' ? "تم الاستلام" : "ملغي"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
