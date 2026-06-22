import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, CheckCheck, CalendarCheck, FileText, MessageCircle,
  CreditCard, Info, Megaphone, UserPlus, Settings, Trash2, X
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const typeIcons: Record<string, any> = {
  attendance: CalendarCheck,
  report: FileText,
  message: MessageCircle,
  payment: CreditCard,
  general: Bell,
  activity: Info,
  announcement: Megaphone,
  registration: UserPlus,
  system: Settings,
};

const typeColors: Record<string, string> = {
  attendance: "#00C9B7",
  report: "#7C3AED",
  message: "#00C9B7",
  payment: "#F97316",
  general: "#64748b",
  activity: "#EC4899",
  announcement: "#7C3AED",
  registration: "#00C9B7",
  system: "#64748b",
};

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success("تم تحديد الكل كمقروء"); },
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });
  const deleteAll = trpc.notifications.deleteAll.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success("تم حذف جميع الإشعارات"); },
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id });
    }
    if (notif.link) {
      setLocation(notif.link);
    }
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EC4899]/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-[#EC4899]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإشعارات</h1>
            {(unreadCount ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} إشعار غير مقروء</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(unreadCount ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} className="rounded-lg">
              <CheckCheck className="h-4 w-4 ml-1.5" />
              قراءة الكل
            </Button>
          )}
          {notifications && notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => deleteAll.mutate()} disabled={deleteAll.isPending} className="rounded-lg text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 ml-1.5" />
              حذف الكل
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            {isLoading ? (
              <div className="space-y-1 p-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-2.5 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div>
                {notifications.map(notif => {
                  const Icon = typeIcons[notif.type] || Bell;
                  const color = typeColors[notif.type] || "#64748b";
                  return (
                    <div
                      key={notif.id}
                      className={`group flex items-start gap-3 px-4 py-3.5 border-b border-border/30 last:border-b-0 hover:bg-accent/30 transition-all duration-150 cursor-pointer ${
                        !notif.isRead ? "bg-[#00C9B7]/5" : ""
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {/* Icon */}
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 mt-0.5"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!notif.isRead ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                            {notif.titleAr || notif.title}
                          </p>
                          {!notif.isRead && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#00C9B7] shrink-0 mt-1" />
                          )}
                        </div>
                        {(notif.bodyAr || notif.body) && (
                          <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {notif.bodyAr || notif.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1.5">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotif.mutate({ id: notif.id });
                        }}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium">لا توجد إشعارات</p>
                <p className="text-sm mt-1">ستظهر الإشعارات هنا عند وصولها</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
