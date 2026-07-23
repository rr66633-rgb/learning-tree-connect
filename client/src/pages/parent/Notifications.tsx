import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CreditCard, AlertTriangle, CheckCircle2, XCircle, FileText, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const notificationIcons: Record<string, any> = {
  payment: CreditCard,
  invoice: FileText,
  overdue: AlertTriangle,
  message: MessageCircle,
};

const notificationColors: Record<string, string> = {
  payment: "text-green-600",
  invoice: "text-blue-600",
  overdue: "text-red-600",
  message: "text-primary",
};

export default function ParentNotifications() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); } });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); toast.success(isAr ? "تم تحديد الكل كمقروء" : "All marked as read"); } });

  const getIcon = (notification: any) => {
    const type = notification.type || '';
    const title = (notification.title || '').toLowerCase();
    
    if (type === 'payment' || title.includes(isAr ? 'دفع' : 'Pay') || title.includes(isAr ? 'فاتورة' : 'Invoice')) {
      if (title.includes(isAr ? 'فشل' : 'Failure')) return <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />;
      if (title.includes(isAr ? 'تذكير' : 'Reminder') || title.includes(isAr ? 'متأخر' : 'Late')) return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />;
      if (title.includes(isAr ? 'جديدة' : 'New')) return <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />;
      if (title.includes(isAr ? 'استرداد' : 'Refund')) return <CreditCard className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />;
      return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />;
    }
    
    const Icon = notificationIcons[type] || Bell;
    const color = notificationColors[type] || "text-muted-foreground";
    return <Icon className={`h-5 w-5 ${color} shrink-0 mt-0.5`} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{isAr ? "الإشعارات" : "Notifications"}</h1>{(unreadCount ?? 0) > 0 && <Badge>{unreadCount}</Badge>}</div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={!unreadCount}>{isAr ? "تحديد الكل كمقروء" : "Mark All as Read"}</Button>
      </div>
      <div className="space-y-2">
        {isLoading ? <PageSkeleton variant="list" title={false} count={5} /> : notifications?.map((n: any) => (
          <Card key={n.id} className={`transition-all ${!n.isRead ? "border-primary/30 bg-primary/5" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              {getIcon(n)}
              <div className="flex-1">
                <p className="font-medium text-sm">{n.titleAr || n.title}</p>
                <p className="text-sm text-muted-foreground">{n.bodyAr || n.body || n.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {!n.isRead && <Button size="sm" variant="ghost" onClick={() => markRead.mutate({ id: n.id })}><Check className="h-4 w-4" /></Button>}
            </CardContent>
          </Card>
        ))}
        {(!notifications || notifications.length === 0) && (
          <EmptyState variant="notifications" />
        )}
      </div>
    </div>
  );
}
