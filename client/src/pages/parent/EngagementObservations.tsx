import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, Eye, Plus, Sparkles, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const contextOptions = [
  { value: "home_play", label: "اللعب في المنزل" },
  { value: "outdoor", label: "الأنشطة الخارجية" },
  { value: "social", label: "التفاعل الاجتماعي" },
  { value: "mealtime", label: "وقت الطعام" },
  { value: "bedtime", label: "وقت النوم" },
  { value: "learning", label: "التعلم" },
  { value: "creative", label: "الأنشطة الإبداعية" },
  { value: "other", label: "أخرى" },
];

export default function EngagementObservations() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [selectedChildId, setSelectedChildId] = useState<number>(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [observationText, setObservationText] = useState("");
  const [context, setContext] = useState<string>("home_play");

  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  useEffect(() => {
    if (childrenData?.length && !selectedChildId) {
      setSelectedChildId(childrenData[0].id);
    }
  }, [childrenData, selectedChildId]);

  const { data: observations, isLoading, refetch } = trpc.engagement.observations.list.useQuery(
    { childId: activeChildId, limit: 30 },
    { enabled: !!activeChildId }
  );

  const createMutation = trpc.engagement.observations.create.useMutation({
    onSuccess: (data) => {
      toast.success(isAr ? "تم إرسال الملاحظة بنجاح" : "Observation sent successfully");
      setCreateDialogOpen(false);
      setObservationText("");
      setContext("home_play");
      refetch();
    },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إرسال الملاحظة" : "Error sending observation"),
  });

  const handleSubmit = () => {
    if (!observationText.trim() || observationText.length < 10) {
      toast.error(isAr ? "يرجى كتابة ملاحظة لا تقل عن 10 أحرف" : "Please write an observation of at least 10 characters");
      return;
    }
    createMutation.mutate({
      childId: activeChildId,
      observationText: observationText.trim(),
      context: context as any,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]"><Clock className="h-3 w-3 ml-1" />قيد المراجعة</Badge>;
      case "reviewed": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="h-3 w-3 ml-1" />تمت المراجعة</Badge>;
      case "flagged": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]"><AlertTriangle className="h-3 w-3 ml-1" />مميزة</Badge>;
      case "linked_to_assessment": return <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px]"><Sparkles className="h-3 w-3 ml-1" />مرتبطة بتقييم</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getSignificanceBadge = (significance: string) => {
    switch (significance) {
      case "milestone": return <Badge className="bg-purple-600 text-[10px]">إنجاز مهم</Badge>;
      case "concern": return <Badge className="bg-red-600 text-[10px]">يحتاج متابعة</Badge>;
      case "progress": return <Badge className="bg-blue-600 text-[10px]">تقدم ملحوظ</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/parent/engagement">
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-500" />
            ملاحظاتي عن طفلي
          </h1>
          <p className="text-sm text-muted-foreground">
            شارك ملاحظاتك وسيحللها الذكاء الاصطناعي
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="h-4 w-4 ml-1" />
          ملاحظة جديدة
        </Button>
      </div>

      {/* Child Selector */}
      {childrenData && childrenData.length > 1 && (
        <Select value={String(activeChildId)} onValueChange={(v) => setSelectedChildId(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="اختر طفلك" />
          </SelectTrigger>
          <SelectContent>
            {childrenData.map((child) => (
              <SelectItem key={child.id} value={String(child.id)}>
                {child.firstName} {child.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Observations List */}
      {(!observations || observations.length === 0) ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center space-y-3">
            <EmptyState variant="observations" />
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 ml-1" />
              أضف أول ملاحظة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {observations.map((obs: any) => (
            <Card key={obs.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(obs.teacherStatus || "pending")}
                    {getSignificanceBadge(obs.significance)}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(obs.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
                <p className="text-sm">{obs.observationText}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {contextOptions.find(c => c.value === obs.context)?.label || obs.context}
                  </Badge>
                </div>
                {obs.aiAnalysis && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3" />
                      تحليل الذكاء الاصطناعي
                    </p>
                    <p className="text-xs">
                      {typeof obs.aiAnalysis === "string" ? obs.aiAnalysis : obs.aiAnalysis?.summary || "تم التحليل"}
                    </p>
                    {obs.aiAnalysis?.suggestedAreas && obs.aiAnalysis.suggestedAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obs.aiAnalysis.suggestedAreas.map((area: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">{area}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {obs.teacherNotes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-2">
                    <p className="text-[10px] font-bold text-blue-700 mb-1">ملاحظات المعلمة:</p>
                    <p className="text-xs text-blue-800">{obs.teacherNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Observation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-teal-500" />
              إضافة ملاحظة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">سياق الملاحظة</label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contextOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظتك</label>
              <Textarea
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                placeholder="صف ما لاحظته عن طفلك... مثال: لاحظت أن طفلي بدأ يستخدم جمل أطول عند التحدث مع أصدقائه في الحديقة"
                rows={5}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                {observationText.length < 10 ? `أدخل ${10 - observationText.length} أحرف إضافية على الأقل` : "سيتم تحليل ملاحظتك بالذكاء الاصطناعي وربطها بمجالات التطور"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || observationText.length < 10}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createMutation.isPending ? "جاري الإرسال..." : "إرسال الملاحظة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
