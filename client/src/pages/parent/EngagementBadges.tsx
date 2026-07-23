import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Award, Lock, CheckCircle, Trophy, Flame, Star } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function EngagementBadges() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: badgesData, isLoading } = trpc.engagement.engagement.myBadges.useQuery();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const earned = badgesData?.earned || [];
  const available = badgesData?.available || [];

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
            <Award className="h-5 w-5 text-amber-500" />
            {isAr ? "شارات الإنجاز" : "Achievement Badges"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? "اكسب شارات من خلال مشاركتك في تعليم طفلك" : "Earn badges by participating in your child's education"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{earned.length}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "مكتسبة" : "Acquired"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Star className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{available.length}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "متاحة" : "Available"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{earned.length + available.length}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Earned Badges */}
      {earned.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            الشارات المكتسبة ({earned.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {earned.map((item: any) => (
              <Card key={item.id} className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
                <CardContent className="p-4 text-center space-y-2">
                  <span className="text-4xl block">{item.badge?.icon || "🏅"}</span>
                  <h3 className="font-bold text-sm">{item.badge?.nameAr || item.badge?.nameEn}</h3>
                  <p className="text-[10px] text-muted-foreground">{item.badge?.descriptionAr || item.badge?.descriptionEn}</p>
                  <p className="text-[10px] text-amber-600">
                    {isAr ? "حصلت عليها" : "Got it"} {new Date(item.earnedAt).toLocaleDateString(locale)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Badges */}
      {available.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-400" />
            شارات متاحة للاكتساب ({available.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {available.map((badge: any) => (
              <Card key={badge.id} className="overflow-hidden opacity-70">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="relative inline-block">
                    <span className="text-4xl block grayscale">{badge.icon || "🏅"}</span>
                    <Lock className="h-4 w-4 absolute -bottom-1 -left-1 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-sm">{badge.nameAr || badge.nameEn}</h3>
                  <p className="text-[10px] text-muted-foreground">{badge.descriptionAr || badge.descriptionEn}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {getCriteriaLabel(badge.criteria, isAr)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {earned.length === 0 && available.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent>
            <EmptyState variant="badges" actionLabel={isAr ? "ابدأ الآن" : "Start Now"} actionHref="/parent/engagement/activities" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getCriteriaLabel(criteria: any, isAr: boolean): string {
  if (!criteria) return isAr ? "أكمل المهام" : "Complete Tasks";
  try {
    const parsed = typeof criteria === "string" ? JSON.parse(criteria) : criteria;
    switch (parsed.type) {
      case "activities_completed": return `${isAr ? "أكمل " : "Complete"}${parsed.count} ${isAr ? "نشاط" : "Activity"}`;
      case "challenges_completed": return `${isAr ? "أكمل " : "Complete"}${parsed.count} ${isAr ? "تحدي" : "Challenge"}`;
      case "journal_entries": return `${isAr ? "أضف " : "Add"}${parsed.count} ${isAr ? "يومية" : "Daily"}`;
      case "streak_weeks": return `${parsed.count} ${isAr ? "أسابيع متتالية" : "consecutive weeks"}`;
      case "total_points": return `${isAr ? "اجمع " : "Collect"}${parsed.count} ${isAr ? "نقطة" : "Point"}`;
      default: return isAr ? "أكمل المهام" : "Complete Tasks";
    }
  } catch {
    return isAr ? "أكمل المهام" : "Complete Tasks";
  }
}
