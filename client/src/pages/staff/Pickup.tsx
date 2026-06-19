import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, Bell, CheckCircle2, UserCheck, Clock, History, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; nextAction: string; nextStatus: string }> = {
  waiting: { label: "بانتظار", color: "bg-amber-100 text-amber-800", icon: Clock, nextAction: "استدعاء الطفل", nextStatus: "called" },
  called: { label: "تم الاستدعاء", color: "bg-blue-100 text-blue-800", icon: Bell, nextAction: "جاهز للاستلام", nextStatus: "ready" },
  ready: { label: "جاهز", color: "bg-green-100 text-green-800", icon: CheckCircle2, nextAction: "تم التسليم", nextStatus: "picked_up" },
};

export default function StaffPickup() {
  const { data: activeRequests, isLoading, refetch } = trpc.pickup.active.useQuery(undefined, {
    refetchInterval: 10000, // Poll every 10 seconds for real-time updates
  });
  const { data: history } = trpc.pickup.history.useQuery({ limit: 50 });
  const [pickedUpByMap, setPickedUpByMap] = useState<Record<number, string>>({});

  const updateStatus = trpc.pickup.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  const handleStatusUpdate = (id: number, status: string) => {
    const extra: any = { id, status };
    if (status === "picked_up") {
      extra.pickedUpBy = pickedUpByMap[id] || "ولي الأمر";
    }
    updateStatus.mutate(extra);
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
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !activeRequests || activeRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">لا توجد طلبات استلام حالياً</p>
                <p className="text-sm text-muted-foreground mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeRequests.map((req: any) => {
                const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.waiting;
                const StatusIcon = config.icon;
                return (
                  <Card key={req.id} className={`border-r-4 ${req.status === 'waiting' ? 'border-r-amber-500' : req.status === 'called' ? 'border-r-blue-500' : 'border-r-green-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Child photo and info */}
                        <div className="flex items-center gap-3 flex-1">
                          {req.childPhoto ? (
                            <img src={req.childPhoto} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                              {req.childFirstName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-lg">{req.childFirstName} {req.childLastName}</p>
                            <p className="text-sm text-muted-foreground">ولي الأمر: {req.parentName}</p>
                            {req.parentPhone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {req.parentPhone}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              وقت الطلب: {new Date(req.requestedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Status and actions */}
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={`${config.color} text-sm`}>
                            <StatusIcon className="h-3.5 w-3.5 ml-1" />
                            {config.label}
                          </Badge>

                          {/* Picked up by input (only for ready → picked_up) */}
                          {req.status === "ready" && (
                            <Input
                              placeholder="اسم المستلم"
                              className="w-48 text-sm"
                              value={pickedUpByMap[req.id] || ""}
                              onChange={(e) => setPickedUpByMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                            />
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(req.id, config.nextStatus)}
                              disabled={updateStatus.isPending}
                              className={req.status === 'ready' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
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
              {history.map((req: any) => (
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
                        <p className="text-xs text-muted-foreground">ولي الأمر: {req.parentName}</p>
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
