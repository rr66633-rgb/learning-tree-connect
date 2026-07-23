import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Trophy, Flame, TrendingUp, Star, Target, BookOpen, Camera, Eye } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function EngagementScore() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [selectedChildId, setSelectedChildId] = useState<number>(0);

  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  useEffect(() => {
    if (childrenData?.length && !selectedChildId) {
      setSelectedChildId(childrenData[0].id);
    }
  }, [childrenData, selectedChildId]);

  const { data: score, isLoading: scoreLoading } = trpc.engagement.engagement.myScore.useQuery(
    { childId: activeChildId },
    { enabled: !!activeChildId }
  );

  const { data: leaderboard } = trpc.engagement.engagement.leaderboard.useQuery({ period: "monthly" });

  const getLevelInfo = (level: string) => {
    const levels: Record<string, { label: string; color: string; icon: string; nextLevel: string; threshold: number }> = {
      inactive: { label: isAr ? "مبتدئ" : "Beginner", color: "text-gray-500", icon: "🌱", nextLevel: isAr ? "مشارك" : "Participant", threshold: 20 },
      beginner: { label: "مشارك", color: "text-blue-500", icon: "🌿", nextLevel: isAr ? "نشط" : "Active", threshold: 40 },
      active: { label: isAr ? "نشط" : "Active", color: "text-emerald-500", icon: "🌳", nextLevel: "متميز", threshold: 60 },
      engaged: { label: isAr ? "متميز" : "Distinguished", color: "text-purple-500", icon: "🌟", nextLevel: isAr ? "بطل" : "Hero", threshold: 80 },
      champion: { label: isAr ? "بطل" : "Hero", color: "text-amber-500", icon: "🏆", nextLevel: "-", threshold: 100 },
    };
    return levels[level] || levels.inactive;
  };

  const levelInfo = getLevelInfo(score?.level || "inactive");
  const currentScore = score?.score || 0;

  if (scoreLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
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
            <Trophy className="h-5 w-5 text-amber-500" />
            {isAr ? "نقاط المشاركة" : "Engagement Points"}
          </h1>
          <p className="text-sm text-muted-foreground">{isAr ? "تتبع مشاركتك في تعليم طفلك" : "Track your involvement in your child\'s education"}</p>
        </div>
      </div>

      {/* Score Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-bl from-amber-500/10 via-purple-500/10 to-emerald-500/10 p-6">
          <div className="text-center space-y-3">
            <span className="text-5xl">{levelInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{levelInfo.label}</h2>
              <p className={`text-sm ${levelInfo.color} font-medium`}>{isAr ? "المستوى الحالي" : "Current Level"}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-bold">{currentScore}</span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <Progress value={currentScore} className="h-3 max-w-xs mx-auto" />
            {score?.level !== "champion" && (
              <p className="text-xs text-muted-foreground">
                {levelInfo.threshold - currentScore} {isAr ? "نقطة للوصول لمستوى" : "Point to reach level"} {levelInfo.nextLevel}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{score?.streak || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "أسابيع متتالية" : "consecutive weeks"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{score?.totalPoints || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "إجمالي النقاط" : "Total Points"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            {isAr ? "تفاصيل المشاركة هذا الشهر" : "Participation Details This Month"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{isAr ? "أنشطة مكتملة" : "Completed Activities"}</span>
            </div>
            <Badge variant="secondary">{score?.activitiesCompleted || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm">{isAr ? "تحديات مكتملة" : "Completed Challenges"}</span>
            </div>
            <Badge variant="secondary">{score?.challengesCompleted || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-pink-500" />
              <span className="text-sm">{isAr ? "يوميات الإنجاز" : "Achievement Diaries"}</span>
            </div>
            <Badge variant="secondary">{score?.journalEntries || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-teal-500" />
              <span className="text-sm">{isAr ? "ملاحظات مرسلة" : "Sent Notes"}</span>
            </div>
            <Badge variant="secondary">{score?.observationsSubmitted || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-indigo-500" />
              <span className="text-sm">{isAr ? "أهداف محققة" : "Achieved Goals"}</span>
            </div>
            <Badge variant="secondary">{score?.goalsCompleted || 0}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {isAr ? "لوحة المتصدرين" : "Leaderboard"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry: any, idx: number) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.parentId === score?.parentId ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200" : ""
                  }`}
                >
                  <span className={`text-sm font-bold w-6 text-center ${idx < 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                  <div className="flex-1">
                    <Progress value={entry.score} className="h-2" />
                  </div>
                  <span className="text-sm font-bold w-10 text-left">{entry.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
