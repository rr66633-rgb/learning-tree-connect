import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Utensils, Moon, Droplets, Baby, Sun, ThermometerSun, Camera, StickyNote } from "lucide-react";

const activityTypes = [
  { value: "meal", label: "وجبة", icon: Utensils, options: ["كاملة", "جزئية", "رفض"] },
  { value: "snack", label: "وجبة خفيفة", icon: Utensils, options: [] },
  { value: "nap_start", label: "بداية قيلولة", icon: Moon, options: [] },
  { value: "nap_end", label: "نهاية قيلولة", icon: Moon, options: [] },
  { value: "diaper", label: "تغيير حفاض", icon: Baby, options: ["نظيف", "مبلل", "متسخ"] },
  { value: "toilet", label: "دورة مياه", icon: Droplets, options: ["نجح", "محاولة"] },
  { value: "water", label: "شرب ماء", icon: Droplets, options: [] },
  { value: "medication", label: "دواء", icon: ThermometerSun, options: [] },
  { value: "outdoor_play", label: "لعب خارجي", icon: Sun, options: [] },
  { value: "indoor_play", label: "لعب داخلي", icon: Sun, options: [] },
  { value: "mood", label: "المزاج", icon: StickyNote, options: ["سعيد", "هادئ", "منزعج", "يبكي"] },
  { value: "temperature", label: "درجة الحرارة", icon: ThermometerSun, options: [] },
  { value: "note", label: "ملاحظة", icon: StickyNote, options: [] },
];

export default function StaffDailyLog() {
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [details, setDetails] = useState("");
  const [mode, setMode] = useState<"individual" | "bulk">("individual");

  const logActivity = trpc.dailyActivities.create.useMutation({
    onSuccess: () => { toast.success("تم تسجيل النشاط"); setDetails(""); utils.dailyActivities.byChild.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleLog = () => {
    if (!selectedChild || !selectedType) { toast.error("اختر الطفل ونوع النشاط"); return; }
    logActivity.mutate({ childId: parseInt(selectedChild), type: selectedType as "activity" | "meal" | "nap" | "diaper" | "milestone" | "note" | "medication", description: details || undefined });
  };

  const selectedTypeInfo = activityTypes.find(t => t.value === selectedType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">سجل الرعاية اليومية</h1>
        <div className="flex gap-2">
          <Button variant={mode === "individual" ? "default" : "outline"} size="sm" onClick={() => setMode("individual")}>فردي</Button>
          <Button variant={mode === "bulk" ? "default" : "outline"} size="sm" onClick={() => setMode("bulk")}>جماعي</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>تسجيل نشاط جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
              <SelectContent>
                {children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger><SelectValue placeholder="نوع النشاط" /></SelectTrigger>
              <SelectContent>
                {activityTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedTypeInfo?.options && selectedTypeInfo.options.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selectedTypeInfo.options.map(opt => (
                <Badge key={opt} variant={details === opt ? "default" : "outline"} className="cursor-pointer" onClick={() => setDetails(opt)}>{opt}</Badge>
              ))}
            </div>
          )}

          <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="تفاصيل إضافية (اختياري)" rows={2} />
          <Button onClick={handleLog} disabled={logActivity.isPending} className="w-full md:w-auto">
            {logActivity.isPending ? "جاري التسجيل..." : "تسجيل النشاط"}
          </Button>
        </CardContent>
      </Card>

      {/* Activity type quick buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {activityTypes.map(type => (
          <Card key={type.value} className={`cursor-pointer hover:shadow-md transition-all ${selectedType === type.value ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedType(type.value)}>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <type.icon className="h-6 w-6 text-primary" />
              <span className="text-xs text-center">{type.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
