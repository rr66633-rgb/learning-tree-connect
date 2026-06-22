import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, Target, Sparkles, CheckCircle, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function EngagementGoals() {
  const [selectedChildId, setSelectedChildId] = useState<number>(0);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [progressValue, setProgressValue] = useState<number[]>([0]);
  const [notes, setNotes] = useState("");

  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  useEffect(() => {
    if (childrenData?.length && !selectedChildId) {
      setSelectedChildId(childrenData[0].id);
    }
  }, [childrenData, selectedChildId]);

  const now = useMemo(() => new Date(), []);
  const { data: goals, isLoading, refetch } = trpc.engagement.goals.list.useQuery(
    { childId: activeChildId, month: now.getMonth() + 1, year: now.getFullYear() },
    { enabled: !!activeChildId }
  );

  const generateMutation = trpc.engagement.goals.generate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء أهداف جديدة بنجاح");
      refetch();
    },
    onError: () => toast.error("حدث خطأ أثناء إنشاء الأهداف"),
  });

  const updateMutation = trpc.engagement.goals.updateProgress.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التقدم بنجاح");
      setUpdateDialogOpen(false);
      refetch();
    },
    onError: () => toast.error("حدث خطأ أثناء تحديث التقدم"),
  });

  const handleUpdateProgress = () => {
    if (!selectedGoal) return;
    updateMutation.mutate({
      goalId: selectedGoal.id,
      progressPercent: progressValue[0],
      parentNotes: notes || undefined,
    });
  };

  const openUpdateDialog = (goal: any) => {
    setSelectedGoal(goal);
    setProgressValue([goal.progressPercent || 0]);
    setNotes(goal.parentNotes || "");
    setUpdateDialogOpen(true);
  };

  const activeGoals = goals?.filter((g: any) => g.status === "active") || [];
  const completedGoals = goals?.filter((g: any) => g.status === "completed") || [];

  const getCategoryInfo = (category: string) => {
    const categories: Record<string, { label: string; color: string }> = {
      vocabulary: { label: "المفردات", color: "bg-blue-100 text-blue-700" },
      fine_motor: { label: "المهارات الحركية الدقيقة", color: "bg-purple-100 text-purple-700" },
      gross_motor: { label: "المهارات الحركية الكبرى", color: "bg-orange-100 text-orange-700" },
      social: { label: "المهارات الاجتماعية", color: "bg-pink-100 text-pink-700" },
      independence: { label: "الاستقلالية", color: "bg-teal-100 text-teal-700" },
      literacy: { label: "القراءة والكتابة", color: "bg-indigo-100 text-indigo-700" },
      numeracy: { label: "الحساب", color: "bg-amber-100 text-amber-700" },
      creativity: { label: "الإبداع", color: "bg-rose-100 text-rose-700" },
    };
    return categories[category] || { label: category, color: "bg-gray-100 text-gray-700" };
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
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
            <Target className="h-5 w-5 text-indigo-500" />
            أهداف النمو الشهرية
          </h1>
          <p className="text-sm text-muted-foreground">
            أهداف مخصصة لتطوير مهارات طفلك
          </p>
        </div>
      </div>

      {/* Generate Goals Button */}
      {(!goals || goals.length === 0) && (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">لا توجد أهداف لهذا الشهر</h3>
              <p className="text-sm text-muted-foreground mt-1">
                اضغط لإنشاء أهداف مخصصة بالذكاء الاصطناعي بناءً على عمر ومستوى طفلك
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate({ childId: activeChildId })}
              disabled={generateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Sparkles className="h-4 w-4 ml-2" />
              )}
              إنشاء أهداف بالذكاء الاصطناعي
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            الأهداف النشطة ({activeGoals.length})
          </h2>
          {activeGoals.map((goal: any) => {
            const catInfo = getCategoryInfo(goal.category);
            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">{goal.titleAr}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{goal.descriptionAr}</p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${catInfo.color}`}>
                      {catInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={goal.progressPercent || 0} className="flex-1 h-2" />
                    <span className="text-xs font-bold text-muted-foreground w-10 text-left">
                      {goal.progressPercent || 0}%
                    </span>
                  </div>
                  {goal.suggestedActivities && goal.suggestedActivities.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground">أنشطة مقترحة:</p>
                      {goal.suggestedActivities.slice(0, 2).map((act: any, idx: number) => (
                        <p key={idx} className="text-xs">• {act.titleAr || act.description}</p>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openUpdateDialog(goal)}
                  >
                    <TrendingUp className="h-3 w-3 ml-1" />
                    تحديث التقدم
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            أهداف مكتملة ({completedGoals.length})
          </h2>
          {completedGoals.map((goal: any) => {
            const catInfo = getCategoryInfo(goal.category);
            return (
              <Card key={goal.id} className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{goal.titleAr}</h3>
                      <Badge variant="secondary" className={`text-[10px] mt-1 ${catInfo.color}`}>
                        {catInfo.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Update Progress Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث التقدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">{selectedGoal?.titleAr}</p>
              <p className="text-xs text-muted-foreground">{selectedGoal?.descriptionAr}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>نسبة الإنجاز</span>
                <span className="font-bold">{progressValue[0]}%</span>
              </div>
              <Slider
                value={progressValue}
                onValueChange={setProgressValue}
                max={100}
                step={5}
                className="py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظاتك عن تقدم طفلك..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleUpdateProgress}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التقدم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
