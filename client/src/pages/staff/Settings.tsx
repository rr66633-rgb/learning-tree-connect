import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Building2, Save, Bell, Send, CheckCircle2, XCircle } from "lucide-react";
import ChangePassword from "@/components/ChangePassword";
import { NotificationSoundSettings } from "@/components/NotificationSoundSettings";
import { PushNotificationToggle } from "@/components/PushNotificationBanner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

function PickupAlertSettingsSection() {
  const { user } = useAuth();
  const isAdmin = user?.role && ['super_admin', 'admin', 'principal'].includes(user.role);
  const { data: settings, isLoading } = trpc.pickup.alertSettings.useQuery();
  const updateSettings = trpc.pickup.updateAlertSettings.useMutation({
    onSuccess: () => toast.success('تم حفظ إعدادات التنبيه'),
  });
  const testAlert = trpc.pickup.testAlert.useMutation({
    onSuccess: (data) => toast.success(`تم إرسال تنبيه تجريبي إلى ${data.onDutyCount} موظف (${data.sent} تم الإرسال)`),
    onError: () => toast.error('فشل إرسال التنبيه التجريبي'),
  });

  const [volume, setVolume] = useState(80);
  const [tone, setTone] = useState('urgent');
  const [repeatInterval, setRepeatInterval] = useState(5);
  const [escalationMinutes, setEscalationMinutes] = useState(2);

  useEffect(() => {
    if (settings) {
      setVolume(settings.volume ?? 80);
      setTone(settings.tone ?? 'urgent');
      setRepeatInterval(settings.repeatIntervalSeconds ?? 5);
      setEscalationMinutes(settings.escalationMinutes ?? 2);
    }
  }, [settings]);

  if (!isAdmin) return null;
  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          إعدادات تنبيهات الاستلام التشغيلية
        </CardTitle>
        <CardDescription>
          تحكم في صوت التنبيه، التكرار، ووقت التصعيد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume */}
        <div className="space-y-2">
          <Label>مستوى الصوت: {volume}%</Label>
          <Slider
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label>نغمة التنبيه</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">عاجل (صوت قوي)</SelectItem>
              <SelectItem value="alarm">إنذار (صوت تحذيري)</SelectItem>
              <SelectItem value="gentle">هادئ (صوت لطيف)</SelectItem>
              <SelectItem value="chime">رنين (صوت موسيقي)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Repeat Interval */}
        <div className="space-y-2">
          <Label>تكرار الصوت كل: {repeatInterval} ثوانٍ</Label>
          <Slider
            value={[repeatInterval]}
            onValueChange={([v]) => setRepeatInterval(v)}
            min={2}
            max={30}
            step={1}
          />
        </div>

        {/* Escalation Time */}
        <div className="space-y-2">
          <Label>وقت التصعيد: {escalationMinutes} دقائق</Label>
          <Slider
            value={[escalationMinutes]}
            onValueChange={([v]) => setEscalationMinutes(v)}
            min={1}
            max={10}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            إذا لم يتم الاستجابة خلال هذا الوقت، يتم تصعيد التنبيه للمشرف
          </p>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button
            onClick={() => updateSettings.mutate({ volume, tone: tone as any, repeatIntervalSeconds: repeatInterval, escalationMinutes })}
            disabled={updateSettings.isPending}
          >
            <Save className="ml-2 h-4 w-4" />
            حفظ الإعدادات
          </Button>
          <Button
            variant="outline"
            onClick={() => testAlert.mutate()}
            disabled={testAlert.isPending}
            className="border-amber-500 text-amber-700 hover:bg-amber-50"
          >
            <Bell className="ml-2 h-4 w-4" />
            تجربة تنبيه الاستلام
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TestNotificationSection() {
  const testPush = trpc.push.test.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`تم إرسال إشعار تجريبي بنجاح (${data.sent} جهاز)`);
      } else {
        toast.error('لم يتم إرسال أي إشعار. تأكد من تفعيل الإشعارات أولاً.');
      }
    },
    onError: () => toast.error('فشل إرسال الإشعار التجريبي'),
  });

  return (
    <div className="pt-4 border-t space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">اختبار الإشعارات</p>
          <p className="text-xs text-muted-foreground">إرسال إشعار تجريبي للتأكد من عمل الصوت والاهتزاز</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => testPush.mutate()}
          disabled={testPush.isPending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {testPush.isPending ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
        </Button>
      </div>
    </div>
  );
}

export default function StaffSettings() {
  const { data: settings, isLoading } = trpc.centerSettings.get.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.centerSettings.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      utils.centerSettings.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.centerName || "");
      setLat(settings.latitude?.toString() || "");
      setLng(settings.longitude?.toString() || "");
      setRadius(settings.allowedRadius?.toString() || "100");
      setWorkStart(settings.workingHoursStart || "07:00");
      setWorkEnd(settings.workingHoursEnd || "17:00");
    }
  }, [settings]);

  const handleSave = () => {
    update.mutate({
      name: name,
      gpsLat: lat,
      gpsLng: lng,
      gpsRadius: parseInt(radius) || 100,
      workingHoursStart: workStart,
      workingHoursEnd: workEnd,
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم خدمات الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("تم تحديد الموقع الحالي");
      },
      () => toast.error("لا يمكن تحديد الموقع. يرجى تفعيل خدمات الموقع."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">إعدادات المركز</h1>

      {/* Center Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>معلومات المركز</CardTitle>
          </div>
          <CardDescription>الاسم والمعلومات الأساسية للمركز</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اسم المركز</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="مركز شجرة التعلم" />
          </div>
        </CardContent>
      </Card>

      {/* GPS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>إعدادات الموقع الجغرافي</CardTitle>
          </div>
          <CardDescription>تحديد موقع المركز ونطاق تسجيل الحضور المسموح</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>خط العرض</Label>
              <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="24.7136" dir="ltr" />
            </div>
            <div>
              <Label>خط الطول</Label>
              <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="46.6753" dir="ltr" />
            </div>
          </div>
          <Button variant="outline" onClick={handleGetCurrentLocation} className="gap-2">
            <MapPin className="h-4 w-4" />
            استخدام موقعي الحالي
          </Button>
          <Separator />
          <div>
            <Label>نطاق الحضور المسموح (بالمتر)</Label>
            <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="100" dir="ltr" />
            <p className="text-xs text-muted-foreground mt-1">
              المسافة القصوى المسموح بها لتسجيل حضور الموظفين من موقع المركز
            </p>
          </div>
          {lat && lng && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">الموقع المحدد:</p>
              <p className="text-muted-foreground" dir="ltr">{lat}, {lng}</p>
              <p className="text-muted-foreground">النطاق: {radius || 100} متر</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>ساعات العمل</CardTitle>
          </div>
          <CardDescription>تحديد أوقات بداية ونهاية الدوام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>بداية الدوام</Label>
              <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label>نهاية الدوام</Label>
              <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {update.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>

      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>إشعارات الدفع الفورية</CardTitle>
          </div>
          <CardDescription>تفعيل أو إيقاف إشعارات الدفع لتلقي التنبيهات الفورية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushNotificationToggle />
          <TestNotificationSection />
        </CardContent>
      </Card>

      {/* Notification Sound Settings */}
      <NotificationSoundSettings />

      {/* Operational Alert Settings (Admin only) */}
      <PickupAlertSettingsSection />

      {/* Change Password */}
      <ChangePassword />
    </div>
  );
}
