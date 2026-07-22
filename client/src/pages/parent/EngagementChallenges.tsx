import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "wouter";
import { ChevronRight, Target, Trophy, Users, Calendar, CheckCircle2, Clock } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

export default function EngagementChallenges() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: challenges, isLoading } = trpc.engagement.challenges.listActive.useQuery({});

  const joinMutation = trpc.engagement.challenges.enroll.useMutation({
    onSuccess: () => {
      toast.success("تم الانضمام للتحدي بنجاح! 🎯");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الانضمام");
    },
  });

  const submitMutation = trpc.engagement.challenges.updateProgress.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل تقدمك! 🌟");
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto py-6 px-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <Link href="/parent/engagement">
          <Button variant="ghost" size="sm" className="mb-1 -mr-2">
            <ChevronRight className="h-4 w-4 ml-1" />
            العودة
          </Button>
        </Link>
        <h1 className="text-xl font-bold">التحديات الأسرية</h1>
        <p className="text-sm text-muted-foreground">شارك مع عائلتك في تحديات ممتعة وتعليمية</p>
      </div>

      {/* Active Challenges */}
      {!challenges || challenges.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState variant="challenges" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge: any) => {
            const daysLeft = Math.ceil(
              (new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const isJoined = challenge.participation?.status === "joined" || challenge.participation?.status === "completed";

            return (
              <Card key={challenge.id} className="overflow-hidden">
                <div className={`h-2 ${challenge.difficulty === 'easy' ? 'bg-green-500' : challenge.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{challenge.titleAr}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{challenge.descriptionAr}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <Trophy className="h-3 w-3 ml-1" />
                      {challenge.pointsReward} نقطة
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {daysLeft > 0 ? `${daysLeft} يوم متبقي` : "انتهى"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {challenge.participantCount || 0} مشارك
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {challenge.targetDays} يوم
                    </span>
                  </div>

                  {isJoined ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>التقدم</span>
                        <span className="font-medium">
                          {challenge.participation?.completedDays || 0}/{challenge.targetDays}
                        </span>
                      </div>
                      <Progress
                        value={((challenge.participation?.completedDays || 0) / challenge.targetDays) * 100}
                        className="h-2"
                      />
                      {challenge.participation?.status !== "completed" && (
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => submitMutation.mutate({
                            participationId: challenge.participation?.id || 0,
                            progressPercent: Math.min(100, ((challenge.participation?.completedDays || 0) + 1) / challenge.targetDays * 100),
                            notes: "تم إكمال اليوم",
                          })}
                          disabled={submitMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-1" />
                          تسجيل إنجاز اليوم
                        </Button>
                      )}
                      {challenge.participation?.status === "completed" && (
                        <div className="flex items-center gap-2 mt-3 text-green-600 justify-center">
                          <Trophy className="h-5 w-5" />
                          <span className="font-medium">مبروك! أكملت التحدي 🎉</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="w-full mt-4"
                      onClick={() => joinMutation.mutate({ challengeId: challenge.id, childId: 0 })}
                      disabled={joinMutation.isPending || daysLeft <= 0}
                    >
                      {daysLeft <= 0 ? "انتهى التحدي" : "انضم للتحدي"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
