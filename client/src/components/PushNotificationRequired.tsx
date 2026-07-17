import { useState } from 'react';
import { Bell, BellRing, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Full-screen overlay that requires staff to enable push notifications.
 * Shows on first login for teachers, assistants, and reception staff.
 * Cannot be dismissed - must enable notifications or skip (with warning).
 */
export function PushNotificationRequired() {
  const { user } = useAuth();
  const { permission, isSubscribed, isLoading, isSupported, subscribe } = usePushNotifications();
  const [skipped, setSkipped] = useState(() => {
    return localStorage.getItem('push-required-skipped') === 'true';
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const testPush = trpc.push.test.useMutation();

  // Only show for staff roles
  const isStaff = user && ['super_admin', 'admin', 'principal', 'teacher', 'assistant', 'receptionist'].includes(user.role);
  
  // Don't show if:
  // - Not staff
  // - Already subscribed
  // - Already skipped
  // - Permission denied (can't do anything)
  // - Not supported
  if (!isStaff || isSubscribed || skipped || permission === 'denied' || !isSupported) {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowSuccess(true);
      toast.success('تم تفعيل الإشعارات بنجاح! ستتلقى تنبيهات فورية.');
      // Send test notification
      try {
        await testPush.mutateAsync();
      } catch {}
      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } else {
      toast.error('فشل تفعيل الإشعارات. يرجى المحاولة مرة أخرى أو التحقق من إعدادات المتصفح.');
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    localStorage.setItem('push-required-skipped', 'true');
    toast.warning('تم تخطي تفعيل الإشعارات. قد لا تسمع تنبيهات الاستلام!', {
      duration: 5000,
    });
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-emerald-700">تم التفعيل بنجاح!</h3>
            <p className="text-muted-foreground">ستتلقى إشعارات فورية لطلبات الاستلام</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <Card className="w-full max-w-md md:max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <BellRing className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-xl">تفعيل الإشعارات مطلوب</CardTitle>
          <CardDescription className="text-base">
            لضمان سماع تنبيهات استلام الأطفال، يرجى تفعيل الإشعارات الفورية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">مهم جداً</p>
              <p className="mt-1">
                بدون تفعيل الإشعارات، لن تسمع تنبيهات طلبات الاستلام عندما يصل ولي الأمر.
                هذا قد يؤدي إلى تأخير في تسليم الأطفال.
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-base">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>تنبيه فوري عند طلب استلام طفل</span>
            </div>
            <div className="flex items-center gap-3 text-base">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>صوت واضح يسهل سماعه في الفصل</span>
            </div>
            <div className="flex items-center gap-3 text-base">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>يعمل حتى عند استخدام تطبيق آخر</span>
            </div>
            <div className="flex items-center gap-3 text-base">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>يمكنك التحكم بمستوى الصوت والنغمة لاحقاً</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base font-bold"
              onClick={handleEnable}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  جاري التفعيل...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  تفعيل الإشعارات الآن
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-base text-muted-foreground"
              onClick={handleSkip}
            >
              تخطي (غير مستحسن)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
