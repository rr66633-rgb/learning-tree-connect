import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export default function StaffNotifications() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
    const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success(isAr ? "تم تحديد الكل كمقروء" : "All marked as read"); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{isAr ? "الإشعارات" : "Notifications"}</h1>
          {(unreadCount ?? 0) > 0 && <Badge>{unreadCount}</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>{isAr ? "تحديد الكل كمقروء" : "Mark All as Read"}</Button>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-4 flex items-start gap-3"><Skeleton className="h-5 w-5 rounded shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/5" /></div></CardContent></Card>
          ))
        ) : notifications?.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">{isAr ? "لا توجد إشعارات" : "No notifications"}</p></CardContent></Card>
        ) : (
          notifications?.map((n: any) => (
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
          ))
        )}
      </div>
    </div>
  );
}
