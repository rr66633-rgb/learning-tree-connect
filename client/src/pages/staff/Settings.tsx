import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Building2, Save } from "lucide-react";
import ChangePassword from "@/components/ChangePassword";

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

      {/* Change Password */}
      <ChangePassword />
    </div>
  );
}
