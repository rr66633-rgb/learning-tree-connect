import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export default function StaffNotifications() {
  const { data: notifications } = trpc.notifications.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success("تم تحديد الكل كمقروء"); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          {(unreadCount ?? 0) > 0 && <Badge>{unreadCount}</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>تحديد الكل كمقروء</Button>
      </div>
      <div className="space-y-2">
        {notifications?.map((n: any) => (
          <Card key={n.id} className={!n.read ? "border-primary/30 bg-primary/5" : ""}>
            <CardContent className="p-4 flex items-start gap-3">
              <Bell className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString('ar-SA')}</p>
              </div>
              {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate({ id: n.id })}><Check className="h-4 w-4" /></Button>}
            </CardContent>
          </Card>
        ))}
        {(!notifications || notifications.length === 0) && <p className="text-center text-muted-foreground py-8">لا توجد إشعارات</p>}
      </div>
    </div>
  );
}
