import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell, CheckCheck, CalendarCheck, FileText, MessageCircle,
  CreditCard, Info, Megaphone, UserPlus, Settings, Trash2, X
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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

export function NotificationBell() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(undefined, {
    // The full list is only needed while the popover is visible. The global
    // unread-count observer remains the lightweight real-time signal.
    enabled: open,
    staleTime: 15_000,
    refetchInterval: open ? 30_000 : false,
  });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 5_000,
  });
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success(isAr ? "تم تحديد الكل كمقروء" : "All marked as read");
    },
  });

  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id });
    }
    // Navigate to link if available
    if (notif.link) {
      setLocation(notif.link);
      setOpen(false);
    } else if (notif.metadata) {
      // Try to derive link from metadata
      const meta = typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : notif.metadata;
      if (meta?.conversationId && notif.type === 'message') {
        setOpen(false);
      } else if (meta?.childId && notif.type === 'attendance') {
        setOpen(false);
      }
    }
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return (isAr ? "الآن" : "Now");
    if (diffMins < 60) return (isAr ? `منذ ${diffMins} دقيقة` : `Since${diffMins}Minute`);
    if (diffHours < 24) return (isAr ? `منذ ${diffHours} ساعة` : `Since${diffHours}Hour`);
    if (diffDays < 7) return (isAr ? `منذ ${diffDays} يوم` : `Since${diffDays}Day`);
    return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  };

  const count = unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl hover:bg-accent/60 transition-all duration-200"
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#EC4899] rounded-full shadow-sm animate-in zoom-in-50 duration-200">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 rounded-2xl shadow-xl border border-border/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">الإشعارات</h3>
            {count > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-[#EC4899] rounded-full">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 ml-1" />
                {isAr ? "قراءة الكل" : "Read All"}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div>
              {notifications.slice(0, 20).map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const color = typeColors[notif.type] || "#64748b";
                return (
                  <div
                    key={notif.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-accent/30 transition-all duration-150 cursor-pointer ${
                      !notif.isRead ? "bg-[#00C9B7]/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {/* Icon */}
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] leading-tight ${!notif.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {notif.titleAr || notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#00C9B7] shrink-0 mt-1.5" />
                        )}
                      </div>
                      {(notif.bodyAr || notif.body) && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.bodyAr || notif.body}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>

                    {/* Delete button (visible on hover) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif.mutate({ id: notif.id });
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Bell className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium">لا توجد إشعارات</p>
              <p className="text-xs mt-1">{isAr ? "ستظهر الإشعارات هنا عند وصولها" : "Notifications will appear here when they arrive"}</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer - View All */}
        {notifications && notifications.length > 0 && (
          <div className="border-t border-border/50 p-2 bg-background">
            <Button
              variant="ghost"
              className="w-full h-8 text-xs font-medium text-[#00C9B7] hover:text-[#00C9B7] hover:bg-[#00C9B7]/10 rounded-lg"
              onClick={() => {
                setOpen(false);
                setLocation("/notifications");
              }}
            >
              عرض جميع الإشعارات
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
