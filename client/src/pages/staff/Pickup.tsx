import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Phone, Bell, CheckCircle2, UserCheck, Clock, History, AlertCircle, Timer, Users, TrendingUp, Shield, User } from "lucide-react";

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

  // Color escalation: >10min = red, >5min = yellow, else green
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

// Priority indicator based on wait time
function PriorityBadge({ requestedAt }: { requestedAt: string | Date }) {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const start = new Date(requestedAt).getTime();
    const update = () => setMinutes(Math.floor((Date.now() - start) / 60000));
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [requestedAt]);

  if (minutes >= 10) {
    return <Badge className="bg-red-600 text-white animate-pulse">عاجل</Badge>;
  } else if (minutes >= 5) {
    return <Badge className="bg-amber-500 text-white">متأخر</Badge>;
  }
  return null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; nextAction: string; nextStatus: string; step: number }> = {
  waiting: { label: "بانتظار الاستجابة", color: "bg-amber-100 text-amber-800", icon: Clock, nextAction: "تم الاستلام", nextStatus: "called", step: 1 },
  called: { label: "جاري التجهيز", color: "bg-blue-100 text-blue-800", icon: Bell, nextAction: "الطفل جاهز", nextStatus: "ready", step: 2 },
  ready: { label: "جاهز للتسليم", color: "bg-green-100 text-green-800", icon: CheckCircle2, nextAction: "تم التسليم", nextStatus: "picked_up", step: 3 },
};

export default function StaffPickup() {
  const { data: activeRequests, isLoading, refetch } = trpc.pickup.active.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });
  const { data: history } = trpc.pickup.history.useQuery({ limit: 50 });
  const { data: stats } = trpc.pickup.stats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const [pickupDialog, setPickupDialog] = useState<{ open: boolean; requestId: number; childId: number; childName: string } | null>(null);
  const [selectedPickupPerson, setSelectedPickupPerson] = useState("");
  const [customPickupPerson, setCustomPickupPerson] = useState("");

  // Fetch authorized persons when dialog opens
  const { data: authorizedPersons } = trpc.pickup.authorizedPersons.useQuery(
    { childId: pickupDialog?.childId || 0 },
    { enabled: !!pickupDialog?.childId }
  );

  const updateStatus = trpc.pickup.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  const handleStatusUpdate = (id: number, status: string, childId?: number, childName?: string) => {
    // For picked_up status, open the verification dialog
    if (status === "picked_up" && childId) {
      setPickupDialog({ open: true, requestId: id, childId, childName: childName || "" });
      return;
    }
    updateStatus.mutate({ id, status: status as any });
  };

  const handleConfirmPickup = () => {
    if (!pickupDialog) return;
    const pickedUpBy = selectedPickupPerson === "custom" ? customPickupPerson : selectedPickupPerson;
    if (!pickedUpBy) {
      toast.error("يرجى تحديد اسم المستلم");
      return;
    }
    updateStatus.mutate({
      id: pickupDialog.requestId,
      status: "picked_up",
      pickedUpBy,
    });
    setPickupDialog(null);
    setSelectedPickupPerson("");
    setCustomPickupPerson("");
  };

  // Sort requests by priority (waiting first, then by time)
  const sortedRequests = useMemo(() => {
    if (!activeRequests) return [];
    return [...activeRequests].sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { waiting: 0, called: 1, ready: 2 };
      const orderDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
    });
  }, [activeRequests]);

  // Card border color based on wait time
  const getCardBorderColor = (requestedAt: string | Date, status: string) => {
    if (status !== "waiting") {
      return status === "called" ? "border-r-blue-500" : "border-r-green-500";
    }
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

      {/* Dashboard Stats */}
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
              <p className="text-xs text-blue-600 mt-1">متوسط الاستجابة</p>
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
                const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.waiting;
                const StatusIcon = config.icon;
                const cardBorder = getCardBorderColor(req.requestedAt, req.status);
                return (
                  <Card key={req.id} className={`${cardBorder} transition-all duration-300`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        {/* Top row: child info + timer */}
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Child photo and info */}
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
                                <PriorityBadge requestedAt={req.requestedAt} />
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
                                {req.parentPhone && (
                                  <span className="inline-flex items-center gap-1 mr-2">
                                    <Phone className="h-3 w-3" /> {req.parentPhone}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                وقت الطلب: {new Date(req.requestedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Timer and status */}
                          <div className="flex flex-col items-end gap-2">
                            <WaitTimer requestedAt={req.requestedAt} />
                            <Badge className={`${config.color} text-sm`}>
                              <StatusIcon className="h-3.5 w-3.5 ml-1" />
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress steps */}
                        <div className="flex items-center gap-1">
                          {[
                            { label: "وصل ولي الأمر", done: true },
                            { label: "تم الاستلام", done: config.step >= 2 },
                            { label: "الطفل جاهز", done: config.step >= 3 },
                            { label: "تم التسليم", done: false },
                          ].map((step, i) => (
                            <div key={i} className="flex items-center flex-1">
                              <div className={`h-2 flex-1 rounded-full transition-colors ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground -mt-2">
                          <span>وصل</span>
                          <span>استلام</span>
                          <span>جاهز</span>
                          <span>تسليم</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 justify-end border-t pt-3">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(req.id, config.nextStatus, req.childId, `${req.childFirstName} ${req.childLastName}`)}
                            disabled={updateStatus.isPending}
                            className={
                              req.status === 'waiting' ? 'bg-blue-600 hover:bg-blue-700' :
                              req.status === 'called' ? 'bg-emerald-600 hover:bg-emerald-700' :
                              'bg-green-600 hover:bg-green-700'
                            }
                          >
                            {req.status === 'waiting' && <Bell className="h-4 w-4 ml-1" />}
                            {req.status === 'called' && <CheckCircle2 className="h-4 w-4 ml-1" />}
                            {req.status === 'ready' && <UserCheck className="h-4 w-4 ml-1" />}
                            {config.nextAction}
                          </Button>
                          {req.status === "waiting" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200"
                              onClick={() => handleStatusUpdate(req.id, "cancelled")}
                              disabled={updateStatus.isPending}
                            >
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
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {!history || history.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد سجل استلام</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {history.map((req: any) => {
                // Calculate total time
                const totalMinutes = req.requestedAt && req.pickedUpAt
                  ? Math.round((new Date(req.pickedUpAt).getTime() - new Date(req.requestedAt).getTime()) / 60000)
                  : null;
                const responseMinutes = req.requestedAt && req.calledAt
                  ? Math.round((new Date(req.calledAt).getTime() - new Date(req.requestedAt).getTime()) / 60000)
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
                            {responseMinutes !== null && <span>استجابة: {responseMinutes}د</span>}
                            {totalMinutes !== null && <span>إجمالي: {totalMinutes}د</span>}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">
                            {req.pickedUpAt ? new Date(req.pickedUpAt).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                          </p>
                          {req.pickedUpBy && <p className="text-xs font-medium">المستلم: {req.pickedUpBy}</p>}
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

      {/* Pickup Verification Dialog */}
      <Dialog open={!!pickupDialog?.open} onOpenChange={(open) => !open && setPickupDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              التحقق من المستلم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="font-bold text-lg">{pickupDialog?.childName}</p>
              <p className="text-sm text-muted-foreground">تأكد من هوية المستلم قبل التسليم</p>
            </div>

            {/* Authorized pickup persons */}
            <div>
              <label className="text-sm font-medium mb-2 block">الأشخاص المصرح لهم بالاستلام:</label>
              {authorizedPersons && authorizedPersons.length > 0 ? (
                <div className="space-y-2">
                  {authorizedPersons.map((person: any) => (
                    <div
                      key={person.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedPickupPerson === person.name ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => { setSelectedPickupPerson(person.name); setCustomPickupPerson(""); }}
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{person.relationship} - {person.phone}</p>
                      </div>
                      {selectedPickupPerson === person.name && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا يوجد أشخاص مسجلين</p>
              )}
            </div>

            {/* Custom pickup person */}
            <div>
              <label className="text-sm font-medium mb-1 block">أو أدخل اسم المستلم:</label>
              <Input
                placeholder="اسم المستلم"
                value={customPickupPerson}
                onChange={(e) => { setCustomPickupPerson(e.target.value); setSelectedPickupPerson("custom"); }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPickupDialog(null)}>إلغاء</Button>
            <Button
              onClick={handleConfirmPickup}
              disabled={updateStatus.isPending || (!selectedPickupPerson && !customPickupPerson)}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="h-4 w-4 ml-1" />
              تأكيد التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
