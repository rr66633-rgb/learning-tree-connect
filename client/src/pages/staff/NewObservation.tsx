import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2, Brain } from "lucide-react";

export default function NewObservation() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedChildId = params.get("childId");

  const [childId, setChildId] = useState(preselectedChildId || "");
  const [areaId, setAreaId] = useState("");
  const [level, setLevel] = useState("");
  const [observation, setObservation] = useState("");
  const [context, setContext] = useState("");
  const [evidence, setEvidence] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const { data: areas, isLoading: loadingAreas } = trpc.development.getAreas.useQuery();
  const { data: childrenData } = trpc.children.list.useQuery({});

  const children = useMemo(() => {
    if (!childrenData) return [];
    return Array.isArray(childrenData) ? childrenData : (childrenData as any)?.children || [];
  }, [childrenData]);

  const createMutation = trpc.development.createObservation.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      navigate(preselectedChildId ? `/staff/development/child/${preselectedChildId}` : "/staff/development");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || !areaId || !level || !observation) {
      toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }
    createMutation.mutate({
      childId: parseInt(childId),
      areaId: parseInt(areaId),
      level: level as any,
      observation,
      context: (context || undefined) as any,
      evidence: evidence || undefined,
      nextSteps: nextSteps || undefined,
    });
  };

  if (loadingAreas) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Flatten areas for select
  const allAreas = areas?.flatMap((parent: any) => [
    parent,
    ...(parent.subAreas || []),
  ]) || [];

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isAr ? "ملاحظة تطورية جديدة" : "New Developmental Note"}</h1>
          <p className="text-sm text-muted-foreground">سجّل ملاحظة عن تطور الطفل في أحد مجالات EYFS</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Child Selection */}
            <div className="space-y-2">
              <Label className="font-medium">الطفل *</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child: any) => (
                    <SelectItem key={child.id} value={String(child.id)}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Development Area */}
            <div className="space-y-2">
              <Label className="font-medium">مجال التطور *</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر مجال التطور" : "Select Development Area"} />
                </SelectTrigger>
                <SelectContent>
                  {allAreas.map((area: any) => (
                    <SelectItem key={area.id} value={String(area.id)}>
                      {area.parentAreaId ? "  ↳ " : ""}{area.nameAr || area.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label className="font-medium">مستوى التطور *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر المستوى" : "Select Level"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emerging">{isAr ? "ناشئ - بداية الاستكشاف" : "Emerging - Beginning to Explore"}</SelectItem>
                  <SelectItem value="developing">{isAr ? "يتطور - يُظهر تقدماً" : "Developing - Shows Progress"}</SelectItem>
                  <SelectItem value="secure">{isAr ? "مستقر - يتقن المهارة" : "Stable - Masters Skill"}</SelectItem>
                  <SelectItem value="exceeding">{isAr ? "متفوق - يتجاوز التوقعات" : "Exceeding - Exceeds Expectations"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observation */}
            <div className="space-y-2">
              <Label className="font-medium">الملاحظة *</Label>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder={isAr ? "صف ما لاحظته عن الطفل بالتفصيل..." : "Describe what you observed about the child in detail..."}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Context */}
            <div className="space-y-2">
              <Label className="font-medium">{isAr ? "السياق" : "Context"}</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر سياق الملاحظة (اختياري)" : "Select observation context (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_play">{isAr ? "لعب حر" : "Free play"}</SelectItem>
                  <SelectItem value="guided_activity">{isAr ? "نشاط موجه" : "Guided Activity"}</SelectItem>
                  <SelectItem value="group_time">{isAr ? "وقت المجموعة" : "Group Time"}</SelectItem>
                  <SelectItem value="outdoor">{isAr ? "خارجي" : "External"}</SelectItem>
                  <SelectItem value="meal_time">{isAr ? "وقت الوجبة" : "Meal Time"}</SelectItem>
                  <SelectItem value="transition">{isAr ? "انتقال" : "Transfer"}</SelectItem>
                  <SelectItem value="one_to_one">{isAr ? "فردي" : "Individual"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Evidence */}
            <div className="space-y-2">
              <Label className="font-medium">{isAr ? "الدليل / الشواهد" : "Evidence / Proof"}</Label>
              <Textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder={isAr ? "أضف أي أدلة داعمة (صور، أعمال الطفل، اقتباسات)..." : "Add any supporting evidence (photos, child\'s work, quotes)..."}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Next Steps */}
            <div className="space-y-2">
              <Label className="font-medium">{isAr ? "الخطوات التالية" : "Next Steps"}</Label>
              <Textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder={isAr ? "ما الخطوات التالية المقترحة لدعم تطور الطفل؟" : "What are the suggested next steps to support child development?"}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                {isAr ? "حفظ الملاحظة" : "Save Note"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1 as any)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
