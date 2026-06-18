import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Info, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, any> = { info: Info, warning: AlertTriangle, message: MessageCircle, general: Bell };
const typeColors: Record<string, string> = { info: "text-blue-600", warning: "text-amber-600", message: "text-primary", general: "text-muted-foreground" };

export default function Notifications() {
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success("تم تحديد الكل كمقروء"); },
  });



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          {(unreadCount ?? 0) > 0 && <Badge variant="destructive">{unreadCount} غير مقروء</Badge>}
        </div>
        {(unreadCount ?? 0) > 0 && (
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="h-4 w-4 ml-2" />تحديد الكل كمقروء
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notif => {
                const Icon = typeIcons[notif.type] || Bell;
                const color = typeColors[notif.type] || "text-muted-foreground";
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 p-4 border-b hover:bg-muted/30 transition-colors cursor-pointer ${!notif.isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => { if (!notif.isRead) markRead.mutate({ id: notif.id }); }}
                  >
                    <div className={`mt-1 ${color}`}><Icon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>{notif.title}</p>
                        {!notif.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {notif.body && <p className="text-sm text-muted-foreground mt-1">{notif.body}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notif.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">لا توجد إشعارات</p>
                <p className="text-sm">ستظهر الإشعارات هنا عند وصولها</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
