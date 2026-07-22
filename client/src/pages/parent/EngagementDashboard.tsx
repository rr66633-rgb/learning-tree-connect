import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Trophy, Star, Target, BookOpen, Camera, MessageCircle,
  Flame, Award, TrendingUp, ChevronLeft
} from "lucide-react";

export default function EngagementDashboard() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { user } = useAuth();
  const [selectedChildId] = useState<number>(0); // Will be set from parent's children

  // Get parent's children
  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  // Get engagement score
  const { data: score, isLoading: scoreLoading } = trpc.engagement.engagement.myScore.useQuery(
    { childId: activeChildId },
    { enabled: !!activeChildId }
  );

  // Get badges
  const { data: badgesData, isLoading: badgesLoading } = trpc.engagement.engagement.myBadges.useQuery();

  // Get active challenges
  const { data: challenges } = trpc.engagement.challenges.listActive.useQuery({});

  // Get recent activities
  const { data: activities } = trpc.engagement.activities.list.useQuery(
    { childId: activeChildId, limit: 5 },
    { enabled: !!activeChildId }
  );

  // Get goals
  const { data: goals } = trpc.engagement.goals.list.useQuery(
    { childId: activeChildId, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { enabled: !!activeChildId }
  );

  const getLevelInfo = (level: string) => {
    const levels: Record<string, { label: string; color: string; icon: string }> = {
      inactive: { label: "غير نشط", color: "bg-gray-200 text-gray-600", icon: "😴" },
      emerging: { label: "بداية", color: "bg-blue-100 text-blue-700", icon: "🌱" },
      developing: { label: "نامي", color: "bg-green-100 text-green-700", icon: "🌿" },
      active: { label: "نشط", color: "bg-yellow-100 text-yellow-700", icon: "⭐" },
      highly_engaged: { label: "متميز", color: "bg-purple-100 text-purple-700", icon: "🌟" },
      champion: { label: "بطل", color: "bg-amber-100 text-amber-700", icon: "🏆" },
    };
    return levels[level] || levels.inactive;
  };

  if (scoreLoading) {
    return (
      <div className="container max-w-lg mx-auto py-6 px-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const levelInfo = getLevelInfo(score?.level || "inactive");

  return (
    <div className="container max-w-lg mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز مشاركة الأسرة</h1>
          <p className="text-muted-foreground text-sm">تعلّم، شارك، وانمُ مع طفلك</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${levelInfo.color}`}>
          {levelInfo.icon} {levelInfo.label}
        </div>
      </div>

      {/* Engagement Score Card */}
      <Link href="/parent/engagement/score">
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">نقاط المشاركة</span>
            </div>
            <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{score?.totalPoints || 0}</span>
          </div>
          <Progress value={score?.score || 0} className="h-3 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>المستوى: {levelInfo.label}</span>
            <span>{score?.score || 0}% من الهدف الشهري</span>
          </div>
          {(score?.streak || 0) > 0 && (
            <div className="flex items-center gap-1 mt-2 text-orange-600">
              <Flame className="h-4 w-4" />
              <span className="text-sm font-medium">{score?.streak} أسابيع متتالية!</span>
            </div>
          )}
        </CardContent>
      </Card>
      </Link>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/parent/engagement/activities">
          <Card className="text-center p-3 cursor-pointer hover:shadow-md transition-all active:scale-95">
            <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{score?.activitiesCompleted || 0}</p>
            <p className="text-[10px] text-muted-foreground">أنشطة</p>
          </Card>
        </Link>
        <Link href="/parent/engagement/challenges">
          <Card className="text-center p-3 cursor-pointer hover:shadow-md transition-all active:scale-95">
            <Target className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold">{score?.challengesCompleted || 0}</p>
            <p className="text-[10px] text-muted-foreground">تحديات</p>
          </Card>
        </Link>
        <Link href="/parent/engagement/journal">
          <Card className="text-center p-3 cursor-pointer hover:shadow-md transition-all active:scale-95">
            <Camera className="h-5 w-5 mx-auto text-pink-500 mb-1" />
            <p className="text-lg font-bold">{score?.journalEntries || 0}</p>
            <p className="text-[10px] text-muted-foreground">يوميات</p>
          </Card>
        </Link>
        <Link href="/parent/engagement/goals">
          <Card className="text-center p-3 cursor-pointer hover:shadow-md transition-all active:scale-95">
            <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{score?.goalsCompleted || 0}</p>
            <p className="text-[10px] text-muted-foreground">أهداف</p>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/parent/engagement/activities">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">أنشطة منزلية</p>
                <p className="text-xs text-muted-foreground">أنشطة مخصصة بالذكاء الاصطناعي</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/challenges">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">التحديات الأسرية</p>
                <p className="text-xs text-muted-foreground">{challenges?.length || 0} تحدي نشط</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/journal">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Camera className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-sm">يوميات الإنجاز</p>
                <p className="text-xs text-muted-foreground">وثّق لحظات طفلك</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/chatbot">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">مستشار التربية</p>
                <p className="text-xs text-muted-foreground">اسأل الذكاء الاصطناعي</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/observations">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Star className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-sm">ملاحظاتي</p>
                <p className="text-xs text-muted-foreground">سجل ملاحظاتك</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/goals">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-sm">أهداف الشهر</p>
                <p className="text-xs text-muted-foreground">تتبع أهدافك</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/engagement/badges">
          <Card className="cursor-pointer hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-sm">شارات الإنجاز</p>
                <p className="text-xs text-muted-foreground">اعرض إنجازاتك</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Badges */}
      {!badgesLoading && badgesData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              شارات الإنجاز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badgesData.earned.map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <span className="text-2xl">{item.badge?.icon}</span>
                  <span className="text-[10px] font-medium text-center">{item.badge?.nameAr}</span>
                </div>
              ))}
              {badgesData.earned.length === 0 && (
                <p className="text-sm text-muted-foreground">أكمل الأنشطة لكسب شارات الإنجاز!</p>
              )}
            </div>
            {badgesData.available.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">الشارات المتاحة ({badgesData.available.length})</p>
                <div className="flex flex-wrap gap-2">
                  {badgesData.available.slice(0, 5).map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 opacity-50">
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-[10px] text-center">{badge.nameAr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Goals Preview */}
      {goals && goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              أهداف الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.slice(0, 3).map((goal: any) => (
              <div key={goal.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{goal.titleAr}</p>
                  <Progress value={goal.progressPercent || 0} className="h-2 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground">{goal.progressPercent || 0}%</span>
              </div>
            ))}
            <Link href="/parent/engagement/goals">
              <Button variant="ghost" size="sm" className="w-full mt-2">عرض جميع الأهداف</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
