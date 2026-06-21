import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle2, UserCheck, Clock, AlertCircle, Timer, Shield, User, Send, Building2 } from "lucide-react";

// Timer component that shows elapsed time with color escalation
function WaitTimer({ requestedAt }: { requestedAt: string | Date }) {
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

  let colorClass = "text-green-600 bg-green-50 border-green-200";
  if (minutes >= 10) {
    colorClass = "text-red-600 bg-red-50 border-red-300 animate-pulse";
  } else if (minutes >= 5) {
    colorClass = "text-amber-600 bg-amber-50 border-amber-300";
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-mono font-bold ${colorClass}`}>
      <Timer className="h-4 w-4" />
      <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; step: number }> = {
  waiting_teacher: { label: "بانتظار المعلمة", color: "bg-amber-100 text-amber-800", icon: Clock, step: 1 },
  sent_to_reception: { label: "في الطريق للاستقبال", color: "bg-blue-100 text-blue-800", icon: Send, step: 2 },
  waiting_at_reception: { label: "بالاستقبال", color: "bg-purple-100 text-purple-800", icon: Building2, step: 3 },
  picked_up: { label: "تم الاستلام", color: "bg-green-100 text-green-800", icon: CheckCircle2, step: 4 },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "الأب",
  mother: "الأم",
  grandfather: "الجد",
  grandmother: "الجدة",
  driver: "السائق",
  relative: "قريب مخول",
  other: "شخص مخول آخر",
};

export default function StaffPickup() {
  const { data: activeRequests, isLoading, refetch } = trpc.pickup.active.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: history } = trpc.pickup.history.useQuery({ limit: 50 });
  const { data: stats } = trpc.pickup.stats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const [pickupDialog, setPickupDialog] = useState<{ open: boolean; requestId: number; childId: number; childName: string } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; relationship: string } | null>(null);

  // Fetch authorized persons when dialog opens
  const { data: authorizedPersons } = trpc.pickup.authorizedPersons.useQuery(
    { childId: pickupDialog?.childId || 0 },
    { enabled: !!pickupDialog?.childId }
  );

  // Teacher sends child to reception (Step 2)
  const sendToReception = trpc.pickup.teacherSendToReception.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الطفل للاستقبال");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  // Reception marks child as arrived (Step 3)
  const markWaiting = trpc.pickup.markWaitingAtReception.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد وصول الطفل للاستقبال");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  // Complete pickup (Step 4 & 5)
  const completePickup = trpc.pickup.completePickup.useMutation({
    onSuccess: () => {
      toast.success("تم تسليم الطفل بنجاح");
      refetch();
      setPickupDialog(null);
      setSelectedPerson(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  const handleAction = (req: any) => {
    if (req.status === "waiting_teacher") {
      sendToReception.mutate({ id: req.id });
    } else if (req.status === "sent_to_reception") {
      markWaiting.mutate({ id: req.id });
    } else if (req.status === "waiting_at_reception") {
      setPickupDialog({ open: true, requestId: req.id, childId: req.childId, childName: `${req.childFirstName} ${req.childLastName}` });
    }
  };

  const handleConfirmPickup = () => {
    if (!pickupDialog || !selectedPerson) {
      toast.error("يجب تحديد شخص الاستلام المخول");
      return;
    }
    completePickup.mutate({
      id: pickupDialog.requestId,
      pickedUpBy: selectedPerson.name,
      pickedUpByRelationship: selectedPerson.relationship,
    });
  };

  const getActionButton = (req: any) => {
    const isPending = sendToReception.isPending || markWaiting.isPending;
    switch (req.status) {
      case "waiting_teacher":
        return (
          <Button
            size="sm"
            onClick={() => handleAction(req)}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4 ml-1" />
            تم إرسال الطفل للاستقبال
          </Button>
        );
      case "sent_to_reception":
        return (
          <Button
            size="sm"
            onClick={() => handleAction(req)}
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Building2 className="h-4 w-4 ml-1" />
            الطفل وصل الاستقبال
          </Button>
        );
      case "waiting_at_reception":
        return (
          <Button
            size="sm"
            onClick={() => handleAction(req)}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <UserCheck className="h-4 w-4 ml-1" />
            تسليم الطفل
          </Button>
        );
      default:
        return null;
    }
  };

  // Sort requests by status priority then time
  const sortedRequests = useMemo(() => {
    if (!activeRequests) return [];
    return [...activeRequests].sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { waiting_teacher: 0, sent_to_reception: 1, waiting_at_reception: 2 };
      const orderDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
    });
  }, [activeRequests]);

  const getCardBorderColor = (requestedAt: string | Date, status: string) => {
    if (status === "sent_to_reception") return "border-r-blue-500 border-r-4";
    if (status === "waiting_at_reception") return "border-r-purple-500 border-r-4";
    const minutes = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 60000);
    if (minutes >= 10) return "border-r-red-600 border-r-4 shadow-red-100 shadow-lg";
    if (minutes >= 5) return "border-r-amber-500 border-r-4 shadow-amber-100 shadow-md";
    return "border-r-amber-400 border-r-4";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الاستلام</h1>
        {activeRequests && activeRequests.length > 0 && (
          <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">
            <AlertCircle className="h-4 w-4 ml-1" />
            {activeRequests.length} طلب نشط
          </Badge>
        )}
      </div>

      {/* Live Status Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-700">{stats.pendingCount}</div>
              <p className="text-xs text-amber-600 mt-1">طلبات معلقة</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{stats.completedToday}</div>
              <p className="text-xs text-green-600 mt-1">مكتمل اليوم</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">
                {stats.avgResponseSeconds ? `${Math.round(stats.avgResponseSeconds / 60)}د` : "-"}
              </div>
              <p className="text-xs text-blue-600 mt-1">متوسط استجابة المعلمة</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-700">
                {stats.avgTotalSeconds ? `${Math.round(stats.avgTotalSeconds / 60)}د` : "-"}
              </div>
              <p className="text-xs text-purple-600 mt-1">متوسط وقت الاستلام</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Status Indicators */}
      {activeRequests && activeRequests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(() => {
            const counts = {
              waiting_teacher: activeRequests.filter((r: any) => r.status === 'waiting_teacher').length,
              sent_to_reception: activeRequests.filter((r: any) => r.status === 'sent_to_reception').length,
              waiting_at_reception: activeRequests.filter((r: any) => r.status === 'waiting_at_reception').length,
            };
            return (
              <>
                {counts.waiting_teacher > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 gap-1">
                    <Clock className="h-3 w-3" /> بانتظار المعلمة: {counts.waiting_teacher}
                  </Badge>
                )}
                {counts.sent_to_reception > 0 && (
                  <Badge className="bg-blue-100 text-blue-800 gap-1">
                    <Send className="h-3 w-3" /> في الطريق: {counts.sent_to_reception}
                  </Badge>
                )}
                {counts.waiting_at_reception > 0 && (
                  <Badge className="bg-purple-100 text-purple-800 gap-1">
                    <Building2 className="h-3 w-3" /> بالاستقبال: {counts.waiting_at_reception}
                  </Badge>
                )}
              </>
            );
          })()}
        </div>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="active" className="flex-1 md:flex-none">
            الطلبات النشطة
            {activeRequests && activeRequests.length > 0 && (
              <Badge className="mr-2 bg-red-500 text-white text-xs">{activeRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 md:flex-none">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !sortedRequests || sortedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">لا توجد طلبات استلام حالياً</p>
                <p className="text-sm text-muted-foreground mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedRequests.map((req: any) => {
                const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.waiting_teacher;
                const StatusIcon = config.icon;
                const cardBorder = getCardBorderColor(req.requestedAt, req.status);
                return (
                  <Card key={req.id} className={`${cardBorder} transition-all duration-300`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        {/* Top row: child info + timer */}
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            {req.childPhoto ? (
                              <img src={req.childPhoto} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                                {req.childFirstName?.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-lg">{req.childFirstName} {req.childLastName}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                الفصل: <span className="font-medium">{req.classNameAr || req.className || "-"}</span>
                              </p>
                              {req.teacherName && (
                                <p className="text-sm text-muted-foreground">
                                  المعلمة: <span className="font-medium">{req.teacherName}</span>
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                ولي الأمر: <span className="font-medium">{req.parentName}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                وقت الطلب: {new Date(req.requestedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <WaitTimer requestedAt={req.requestedAt} />
                            <Badge className={`${config.color} text-sm`}>
                              <StatusIcon className="h-3.5 w-3.5 ml-1" />
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress steps - 4 step workflow */}
                        <div className="flex items-center gap-1">
                          {[
                            { label: "طلب ولي الأمر", done: true },
                            { label: "أُرسل للاستقبال", done: config.step >= 2 },
                            { label: "بالاستقبال", done: config.step >= 3 },
                            { label: "تم التسليم", done: config.step >= 4 },
                          ].map((step, i) => (
                            <div key={i} className="flex items-center flex-1">
                              <div className={`h-2 flex-1 rounded-full transition-colors ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground -mt-2">
                          <span>طلب</span>
                          <span>أُرسل</span>
                          <span>استقبال</span>
                          <span>تسليم</span>
                        </div>

                        {/* Action button */}
                        <div className="flex flex-wrap gap-2 justify-end border-t pt-3">
                          {getActionButton(req)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {!history || history.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد سجل استلام</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {history.map((req: any) => {
                const totalMinutes = req.requestedAt && req.pickedUpAt
                  ? Math.round((new Date(req.pickedUpAt).getTime() - new Date(req.requestedAt).getTime()) / 60000)
                  : null;
                const responseMinutes = req.requestedAt && req.teacherResponseAt
                  ? Math.round((new Date(req.teacherResponseAt).getTime() - new Date(req.requestedAt).getTime()) / 60000)
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
                            {req.classNameAr || req.className || ""} | ولي الأمر: {req.parentName}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            {responseMinutes !== null && <span>استجابة المعلمة: {responseMinutes}د</span>}
                            {totalMinutes !== null && <span>إجمالي: {totalMinutes}د</span>}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">
                            {req.pickedUpAt ? new Date(req.pickedUpAt).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                          </p>
                          {req.pickedUpBy && <p className="text-xs font-medium">المستلم: {req.pickedUpBy}</p>}
                          {req.pickedUpByRelationship && <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[req.pickedUpByRelationship] || req.pickedUpByRelationship}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pickup Verification Dialog - SECURITY: Only authorized persons */}
      <Dialog open={!!pickupDialog?.open} onOpenChange={(open) => { if (!open) { setPickupDialog(null); setSelectedPerson(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              تسليم الطفل - التحقق من المستلم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="font-bold text-lg">{pickupDialog?.childName}</p>
              <p className="text-sm text-muted-foreground">يجب اختيار شخص مخول من القائمة</p>
            </div>

            {/* Authorized pickup persons - REQUIRED selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">الأشخاص المصرح لهم بالاستلام:</label>
              {authorizedPersons && authorizedPersons.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {authorizedPersons.map((person: any) => (
                    <div
                      key={person.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPerson?.name === person.name && selectedPerson?.relationship === person.relationship
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                      }`}
                      onClick={() => setSelectedPerson({ name: person.name, relationship: person.relationship })}
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[person.relationship] || person.relationship}</p>
                      </div>
                      {selectedPerson?.name === person.name && selectedPerson?.relationship === person.relationship && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-700 font-medium">لا يوجد أشخاص مخولين مسجلين لهذا الطفل</p>
                  <p className="text-xs text-red-600 mt-1">يرجى إضافة أشخاص مخولين في ملف الطفل أولاً</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPickupDialog(null); setSelectedPerson(null); }}>إلغاء</Button>
            <Button
              onClick={handleConfirmPickup}
              disabled={completePickup.isPending || !selectedPerson}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="h-4 w-4 ml-1" />
              {completePickup.isPending ? "جاري التسليم..." : "تأكيد التسليم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
