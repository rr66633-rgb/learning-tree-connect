import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Vibrate, Play, Music } from "lucide-react";
import { useNotificationSound, TONE_LABELS, type NotificationTone } from "@/hooks/useNotificationSound";

/**
 * Notification sound settings component.
 * Allows users to customize notification tones, volume, vibration, and mute.
 */
export function NotificationSoundSettings() {
  const { settings, updateSettings, previewTone } = useNotificationSound();

  const toneOptions: NotificationTone[] = ["soft_chime", "gentle_bell", "friendly_ping", "calm_melody", "none"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <CardTitle>إعدادات صوت الإشعارات</CardTitle>
        </div>
        <CardDescription>تخصيص أصوات الإشعارات ومستوى الصوت والاهتزاز</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label className="text-base font-medium">تفعيل الصوت</Label>
              <p className="text-sm text-muted-foreground">تشغيل صوت عند وصول إشعار جديد</p>
            </div>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
          />
        </div>

        {/* Volume Slider */}
        {settings.soundEnabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">مستوى الصوت</Label>
              <span className="text-sm text-muted-foreground">{settings.volume}%</span>
            </div>
            <Slider
              value={[settings.volume]}
              onValueChange={([value]) => updateSettings({ volume: value })}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>منخفض</span>
              <span>مرتفع</span>
            </div>
          </div>
        )}

        {/* Tone Selection */}
        {settings.soundEnabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">نغمة الإشعار</Label>
            <div className="grid gap-2">
              {toneOptions.map((tone) => (
                <div
                  key={tone}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.tone === tone
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-border hover:border-emerald-300 hover:bg-muted/50"
                  }`}
                  onClick={() => updateSettings({ tone })}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        settings.tone === tone
                          ? "border-emerald-600"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {settings.tone === tone && (
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <span className={`text-sm ${settings.tone === tone ? "font-medium text-emerald-700" : ""}`}>
                      {TONE_LABELS[tone]}
                    </span>
                  </div>
                  {tone !== "none" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewTone(tone);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vibration Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <Vibrate className="h-5 w-5 text-emerald-600" />
            <div>
              <Label className="text-base font-medium">الاهتزاز</Label>
              <p className="text-sm text-muted-foreground">اهتزاز الجهاز عند وصول إشعار</p>
            </div>
          </div>
          <Switch
            checked={settings.vibrationEnabled}
            onCheckedChange={(checked) => updateSettings({ vibrationEnabled: checked })}
          />
        </div>

        {/* Quick preset buttons */}
        <div className="pt-2 border-t space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">إعدادات سريعة</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ soundEnabled: true, vibrationEnabled: true, tone: "soft_chime", volume: 60 })}
              className="text-xs"
            >
              الوضع الافتراضي
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ soundEnabled: false, vibrationEnabled: true })}
              className="text-xs"
            >
              اهتزاز فقط
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ soundEnabled: false, vibrationEnabled: false })}
              className="text-xs"
            >
              صامت
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ soundEnabled: true, vibrationEnabled: true, volume: 100, tone: "gentle_bell" })}
              className="text-xs"
            >
              صوت مرتفع
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
