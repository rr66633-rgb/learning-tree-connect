import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function PushNotificationBanner() {
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('push-banner-dismissed') === 'true';
  });
  const testPush = trpc.push.test.useMutation();

  // Don't show if unsupported, already subscribed, denied, or dismissed
  if (!isSupported || permission === 'denied' || isSubscribed || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('تم تفعيل الإشعارات بنجاح');
      // Send a test notification
      testPush.mutate();
    } else if ((permission as string) === 'denied') {
      toast.error('تم رفض إذن الإشعارات. يرجى تفعيلها من إعدادات المتصفح.');
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 flex items-center gap-3 animate-in slide-in-from-top-2">
      <div className="bg-primary/10 p-2 rounded-full shrink-0">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">تفعيل الإشعارات الفورية</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          احصل على تنبيهات فورية لطلبات الاستلام وتحديثات الحضور والفواتير
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={handleSubscribe} disabled={isLoading}>
          {isLoading ? 'جاري التفعيل...' : 'تفعيل'}
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } = usePushNotifications();
  const testPush = trpc.push.test.useMutation();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">الإشعارات غير مدعومة</p>
          <p className="text-xs text-muted-foreground">المتصفح الحالي لا يدعم إشعارات الدفع</p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <BellOff className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium">الإشعارات محظورة</p>
          <p className="text-xs text-muted-foreground">يرجى تفعيل الإشعارات من إعدادات المتصفح</p>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) toast.success('تم إيقاف الإشعارات');
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('تم تفعيل الإشعارات بنجاح');
        testPush.mutate();
      }
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Bell className={`h-5 w-5 ${isSubscribed ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <p className="text-sm font-medium">إشعارات الدفع الفورية</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed ? 'مفعّلة - ستصلك تنبيهات فورية' : 'غير مفعّلة - فعّلها لتلقي التنبيهات'}
          </p>
        </div>
      </div>
      <Button
        variant={isSubscribed ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
      >
        {isLoading ? '...' : isSubscribed ? 'إيقاف' : 'تفعيل'}
      </Button>
    </div>
  );
}
