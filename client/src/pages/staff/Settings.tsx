import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Building2, Save, Bell, Send, CheckCircle2, XCircle, Upload, Image, X } from "lucide-react";
import ChangePassword from "@/components/ChangePassword";
import { NotificationSoundSettings } from "@/components/NotificationSoundSettings";
import { PushNotificationToggle } from "@/components/PushNotificationBanner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";

function PickupAlertSettingsSection() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isAdmin = user?.role && ['super_admin', 'admin', 'principal'].includes(user.role);
  const { data: settings, isLoading } = trpc.pickup.alertSettings.useQuery();
  const updateSettings = trpc.pickup.updateAlertSettings.useMutation({
    onSuccess: () => toast.success(isAr ? "تم حفظ إعدادات التنبيه" : "Alert Settings Saved"),
  });
  const testAlert = trpc.pickup.testAlert.useMutation({
    onSuccess: (data) => toast.success(isAr ? `تم إرسال تنبيه تجريبي إلى ${data.onDutyCount} موظف (${data.sent} تم الإرسال)` : `Test alert sent to${data.onDutyCount}Employee (${data.sent}Sent)`),
    onError: () => toast.error(isAr ? "فشل إرسال التنبيه التجريبي" : "Failed to Send Test Alert"),
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
          {isAr ? "إعدادات تنبيهات الاستلام التشغيلية" : "Operational Pickup Alert Settings"}
        </CardTitle>
        <CardDescription>
          {isAr ? "تحكم في صوت التنبيه، التكرار، ووقت التصعيد" : "Control alert sound, repetition, and escalation time"}
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
          <Label>{isAr ? "نغمة التنبيه" : "Alert Tone"}</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">{isAr ? "عاجل (صوت قوي)" : "Urgent (loud sound)"}</SelectItem>
              <SelectItem value="alarm">{isAr ? "إنذار (صوت تحذيري)" : "Alarm (Warning Sound)"}</SelectItem>
              <SelectItem value="gentle">{isAr ? "هادئ (صوت لطيف)" : "Calm (Gentle Sound)"}</SelectItem>
              <SelectItem value="chime">{isAr ? "رنين (صوت موسيقي)" : "Ringtone (Musical Sound)"}</SelectItem>
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
            {isAr ? "إذا لم يتم الاستجابة خلال هذا الوقت، يتم تصعيد التنبيه للمشرف" : "If no response within this time, alert is escalated to supervisor"}
          </p>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button
            onClick={() => updateSettings.mutate({ volume, tone: tone as any, repeatIntervalSeconds: repeatInterval, escalationMinutes })}
            disabled={updateSettings.isPending}
          >
            <Save className="ml-2 h-4 w-4" />
            {isAr ? "حفظ الإعدادات" : "Save Settings"}
          </Button>
          <Button
            variant="outline"
            onClick={() => testAlert.mutate()}
            disabled={testAlert.isPending}
            className="border-amber-500 text-amber-700 hover:bg-amber-50"
          >
            <Bell className="ml-2 h-4 w-4" />
            {isAr ? "تجربة تنبيه الاستلام" : "Pickup Alert Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TestNotificationSection() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const testPush = trpc.push.test.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(isAr ? `تم إرسال إشعار تجريبي بنجاح (${data.sent} جهاز)` : `Test notification sent successfully (${data.sent}Device)`);
      } else {
        toast.error(isAr ? "لم يتم إرسال أي إشعار. تأكد من تفعيل الإشعارات أولاً." : "No notification sent. Make sure notifications are enabled first.");
      }
    },
    onError: () => toast.error(isAr ? "فشل إرسال الإشعار التجريبي" : "Failed to Send Test Notification"),
  });

  return (
    <div className="pt-4 border-t space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{isAr ? "اختبار الإشعارات" : "Test Notifications"}</p>
          <p className="text-xs text-muted-foreground">{isAr ? "إرسال إشعار تجريبي للتأكد من عمل الصوت والاهتزاز" : "Send a test notification to ensure sound and vibration are working"}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => testPush.mutate()}
          disabled={testPush.isPending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {testPush.isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال إشعار تجريبي" : "Send Test Notification")}
        </Button>
      </div>
    </div>
  );
}

export default function StaffSettings() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: settings, isLoading } = trpc.centerSettings.get.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.centerSettings.update.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
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
  const [vatNumber, setVatNumber] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.centerName || "");
      setLat(settings.latitude?.toString() || "");
      setLng(settings.longitude?.toString() || "");
      setRadius(settings.allowedRadius?.toString() || "100");
      setWorkStart(settings.workingHoursStart || "07:00");
      setWorkEnd(settings.workingHoursEnd || "17:00");
      setVatNumber((settings as any).vatNumber || "");
      setCommercialRegister((settings as any).commercialRegister || "");
      setLogoUrl((settings as any).logoUrl || "");
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
      vatNumber: vatNumber,
      commercialRegister: commercialRegister,
      logoUrl: logoUrl,
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isAr ? "المتصفح لا يدعم خدمات الموقع" : "Browser does not support location services");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success(isAr ? "تم تحديد الموقع الحالي" : "Current location detected");
      },
      () => toast.error(isAr ? "لا يمكن تحديد الموقع. يرجى تفعيل خدمات الموقع." : "Cannot determine location. Please enable location services."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{isAr ? "إعدادات المركز" : "Center Settings"}</h1>

      {/* Center Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>{isAr ? "معلومات المركز" : "Center Information"}</CardTitle>
          </div>
          <CardDescription>{isAr ? "الاسم والمعلومات الأساسية للمركز" : "Basic center name and information"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{isAr ? "اسم المركز" : "Center Name"}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={isAr ? "مركز شجرة التعلم" : "Learning Tree Center"} />
          </div>
          {/* Logo Upload */}
          <div>
            <Label>{isAr ? "شعار المركز" : "Center Logo"}</Label>
            <p className="text-xs text-muted-foreground mb-2">يظهر في ترويسة الفاتورة عند الطباعة أو التصدير ك PDF</p>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="شعار المركز" className="h-16 w-16 object-contain rounded border p-1" />
                  <button onClick={() => setLogoUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                  <Image className="h-6 w-6" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="logo-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
                    if (!allowedTypes.includes(file.type)) {
                      toast.error(isAr ? "نوع الملف غير مدعوم. يرجى رفع صور PNG أو JPG أو SVG" : "File type not supported. Please upload PNG, JPG, or SVG images");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(isAr ? "حجم الصورة يجب أن يكون أقل من 5 ميغابايت" : "Image size must be less than 5 MB");
                      return;
                    }
                    setUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const resp = await fetchWithCsrf(apiUrl('/api/upload-logo'), {
                        method: 'POST',
                        body: formData,
                      });
                      if (!resp.ok) {
                        const errData = await resp.json().catch(() => ({}));
                        toast.error(errData.error || (isAr ? "فشل رفع الشعار" : "Failed to Upload Logo"));
                        return;
                      }
                      const data = await resp.json();
                      if (data.url) {
                        setLogoUrl(data.url);
                        toast.success(isAr ? "تم رفع الشعار بنجاح" : "Logo Uploaded Successfully");
                      } else {
                        toast.error(isAr ? "فشل رفع الشعار" : "Failed to Upload Logo");
                      }
                    } catch {
                      toast.error(isAr ? "فشل رفع الشعار. تأكد من اتصالك بالإنترنت" : "Failed to Upload Logo. Check your internet connection");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('logo-upload')?.click()}>
                  <Upload className="h-4 w-4 ml-1" />
                  {uploading ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع شعار" : "Upload Logo")}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG أو JPG أو SVG - أقل من 5 ميغا</p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>الرقم الضريبي (VAT)</Label>
              <Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="300000000000003" dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">يظهر في الفواتير ورمز QR</p>
            </div>
            <div>
              <Label>{isAr ? "السجل التجاري" : "Commercial Register"}</Label>
              <Input value={commercialRegister} onChange={e => setCommercialRegister(e.target.value)} placeholder="1010000000" dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "يظهر في الفواتير" : "Appears on invoices"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>{isAr ? "إعدادات الموقع الجغرافي" : "Location Settings"}</CardTitle>
          </div>
          <CardDescription>{isAr ? "تحديد موقع المركز ونطاق تسجيل الحضور المسموح" : "Set center location and allowed attendance radius"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{isAr ? "خط العرض" : "Latitude"}</Label>
              <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="24.7136" dir="ltr" />
            </div>
            <div>
              <Label>{isAr ? "خط الطول" : "Longitude"}</Label>
              <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="46.6753" dir="ltr" />
            </div>
          </div>
          <Button variant="outline" onClick={handleGetCurrentLocation} className="gap-2">
            <MapPin className="h-4 w-4" />
            {isAr ? "استخدام موقعي الحالي" : "Use My Current Location"}
          </Button>
          <Separator />
          <div>
            <Label>{isAr ? "نطاق الحضور المسموح (بالمتر)" : "Allowed Attendance Range (in meters)"}</Label>
            <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="100" dir="ltr" />
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? "المسافة القصوى المسموح بها لتسجيل حضور الموظفين من موقع المركز" : "Maximum allowed distance for staff attendance from center location"}
            </p>
          </div>
          {lat && lng && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">{isAr ? "الموقع المحدد:" : "Selected Location:"}</p>
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
            <CardTitle>{isAr ? "ساعات العمل" : "Working Hours"}</CardTitle>
          </div>
          <CardDescription>{isAr ? "تحديد أوقات بداية ونهاية الدوام" : "Set shift start and end times"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{isAr ? "بداية الدوام" : "Start Time"}</Label>
              <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label>{isAr ? "نهاية الدوام" : "End of Workday"}</Label>
              <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {update.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الإعدادات" : "Save Settings")}
        </Button>
      </div>

      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>{isAr ? "إشعارات الدفع الفورية" : "Push Notifications"}</CardTitle>
          </div>
          <CardDescription>{isAr ? "تفعيل أو إيقاف إشعارات الدفع لتلقي التنبيهات الفورية" : "Enable or disable push notifications for real-time alerts"}</CardDescription>
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
