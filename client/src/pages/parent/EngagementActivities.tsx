import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import { ChevronRight, BookOpen, Clock, Star, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

export default function EngagementActivities() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [selectedChildId, setSelectedChildId] = useState<number>(0);

  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  const { data: activities, isLoading } = trpc.engagement.activities.list.useQuery(
    { childId: activeChildId, limit: 20 },
    { enabled: !!activeChildId }
  );

  const generateMutation = trpc.engagement.activities.generate.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إنشاء أنشطة جديدة مخصصة لطفلك!" : "New activities customized for your child created!");
    },
    onError: () => {
      toast.error(isAr ? "حدث خطأ أثناء إنشاء الأنشطة" : "Error creating activities");
    },
  });

  const completeMutation = trpc.engagement.activities.complete.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "أحسنت! تم تسجيل إكمال النشاط 🎉" : "Well done! Activity completion recorded 🎉");
    },
  });

  const getDifficultyBadge = (difficulty: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      easy: { label: isAr ? "سهل" : "Easy", variant: "secondary" },
      medium: { label: isAr ? "متوسط" : "Average", variant: "default" },
      hard: { label: isAr ? "متقدم" : "Advanced", variant: "destructive" },
    };
    return map[difficulty] || map.easy;
  };

  const getAreaIcon = (area: string) => {
    const icons: Record<string, string> = {
      communication: "🗣️",
      physical: "🏃",
      personal_social: "🤝",
      literacy: "📖",
      mathematics: "🔢",
      world: "🌍",
      arts: "🎨",
    };
    return icons[area] || "📚";
  };

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto py-6 px-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const pending = activities?.filter((a: any) => a.status === "assigned" || a.status === "in_progress") || [];
  const completed = activities?.filter((a: any) => a.status === "completed") || [];

  return (
    <div className="container max-w-lg mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/parent/engagement">
            <Button variant="ghost" size="sm" className="mb-1 -mr-2">
              <ChevronRight className="h-4 w-4 ml-1" />
              {isAr ? "العودة" : "Back"}
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{isAr ? "الأنشطة المنزلية" : "Home Activities"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "أنشطة مخصصة بالذكاء الاصطناعي لتطوير طفلك" : "AI-Powered Custom Activities for Your Child\'s Development"}</p>
        </div>
        <Button
          size="sm"
          onClick={() => generateMutation.mutate({ childId: activeChildId, category: "language" })}
          disabled={generateMutation.isPending}
          className="gap-1"
        >
          <Sparkles className="h-4 w-4" />
          {generateMutation.isPending ? isAr ? "جاري..." : "Processing..." : isAr ? "أنشطة جديدة" : "New Activities"}
        </Button>
      </div>

      {/* Child selector if multiple children */}
      {childrenData && childrenData.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {childrenData.map((child: any) => (
            <Button
              key={child.id}
              variant={activeChildId === child.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
            >
              {child.firstName}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            قيد التنفيذ ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            مكتملة ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <EmptyState variant="activities" compact />
                <Button
                  onClick={() => generateMutation.mutate({ childId: activeChildId, category: "language" })}
                  disabled={generateMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 ml-2" />
                  {isAr ? "إنشاء أنشطة بالذكاء الاصطناعي" : "Create AI Activities"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            pending.map((activity: any) => {
              const diff = getDifficultyBadge(activity.difficulty);
              return (
                <Card key={activity.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getAreaIcon(activity.developmentArea)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{activity.titleAr}</h3>
                          <Badge variant={diff.variant} className="text-[10px] shrink-0">{diff.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{activity.descriptionAr}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.durationMinutes} دقيقة
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {activity.pointsValue} نقطة
                          </span>
                        </div>
                        {activity.materialsNeeded && (
                          <p className="text-xs text-blue-600 mt-1">{isAr ? "المواد:" : "Materials:"} {activity.materialsNeeded}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => completeMutation.mutate({ activityId: activity.id })}
                        disabled={completeMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 ml-1" />
                        {isAr ? "تم الإكمال" : "Completed"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completed.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState variant="activities" compact title={isAr ? "لم تكمل أي أنشطة بعد" : "You haven\'t completed any activities yet"} description={isAr ? "أكمل الأنشطة المعينة لكسب النقاط والشارات" : "Complete Assigned Activities to Earn Points and Badges"} />
              </CardContent>
            </Card>
          ) : (
            completed.map((activity: any) => (
              <Card key={activity.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.titleAr}</p>
                      <p className="text-xs text-muted-foreground">+{activity.pointsValue} {isAr ? "نقطة" : "Point"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
