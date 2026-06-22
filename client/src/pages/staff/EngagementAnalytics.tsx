import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, TrendingUp, Users, Star, Trophy, BookOpen,
  AlertTriangle, CheckCircle, Eye, Calendar
} from "lucide-react";
import { Link } from "wouter";

export default function EngagementAnalytics() {
  const [period, setPeriod] = useState("month");

  const { data: stats, isLoading } = trpc.engagement.analytics.overview.useQuery();
  const { data: leaderboard } = trpc.engagement.engagement.leaderboard.useQuery({ period: "monthly" });
  const { data: recentSubmissions } = trpc.engagement.journal.list.useQuery({ childId: 0 });
  const { data: challenges } = trpc.engagement.challenges.listActive.useQuery({});

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تحليلات مشاركة الأسر</h1>
          <p className="text-muted-foreground">متابعة تفاعل أولياء الأمور مع أنشطة التعلم المنزلي</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">هذا الأسبوع</SelectItem>
            <SelectItem value="month">هذا الشهر</SelectItem>
            <SelectItem value="term">هذا الفصل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/staff/engagement/reviews">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 ml-1" />
            مراجعة المشاركات
            {stats?.pendingJournalReviews || stats?.pendingObservationReviews ? (
              <Badge className="bg-amber-500 mr-2 text-[10px]">{(stats?.pendingJournalReviews || 0) + (stats?.pendingObservationReviews || 0)}</Badge>
            ) : null}
          </Button>
        </Link>
        <Link href="/staff/engagement/reports">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 ml-1" />
            إنشاء تقارير
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-emerald-700">{stats?.totalActivities || 0}</p>
            <p className="text-xs text-emerald-600">إجمالي الأنشطة</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-700">{stats?.completedActivities || 0}</p>
            <p className="text-xs text-blue-600">أنشطة مكتملة</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-700">{stats?.pendingJournalReviews || 0}</p>
            <p className="text-xs text-purple-600">مشاركات بانتظار المراجعة</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-amber-700">{stats?.completionRate || 0}%</p>
            <p className="text-xs text-amber-600">نسبة الإكمال</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="submissions">المشاركات الأخيرة</TabsTrigger>
          <TabsTrigger value="leaderboard">لوحة المتصدرين</TabsTrigger>
          <TabsTrigger value="alerts">تنبيهات</TabsTrigger>
        </TabsList>

        {/* Recent Submissions */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                آخر مشاركات أولياء الأمور
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentSubmissions?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد مشاركات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSubmissions.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {entry.entryType === "milestone" && <Star className="h-5 w-5 text-amber-500" />}
                        {entry.entryType === "achievement" && <Trophy className="h-5 w-5 text-purple-500" />}
                        {entry.entryType === "photo" && <Heart className="h-5 w-5 text-pink-500" />}
                        {entry.entryType === "note" && <BookOpen className="h-5 w-5 text-blue-500" />}
                        {entry.entryType === "video" && <Eye className="h-5 w-5 text-green-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{entry.title || "مشاركة جديدة"}</span>
                          <Badge variant="outline" className="text-xs">
                            {entry.entryType === "milestone" ? "إنجاز" :
                             entry.entryType === "achievement" ? "تحقيق" :
                             entry.entryType === "photo" ? "صورة" :
                             entry.entryType === "video" ? "فيديو" : "ملاحظة"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline ml-1" />
                          {new Date(entry.createdAt).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                أكثر الأسر تفاعلاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!(leaderboard as any[])?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد بيانات كافية حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(leaderboard as any[]).map((family: any, index: number) => (
                    <div key={family.id || index} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-gray-100 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">ولي أمر #{family.parentId}</p>
                        <p className="text-xs text-muted-foreground">المستوى: {family.level}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{family.score}</p>
                        <p className="text-xs text-muted-foreground">نقطة</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                أسر تحتاج متابعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.pendingObservationReviews === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium text-green-700">جميع المشاركات تمت مراجعتها</p>
                  <p className="text-sm">لا توجد ملاحظات بانتظار المراجعة</p>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">ملاحظات بانتظار المراجعة</p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.pendingObservationReviews} ملاحظة من أولياء الأمور تحتاج مراجعة
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Challenges */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              التحديات النشطة
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/staff/engagement/challenges/new">تحدي جديد</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!challenges?.length ? (
            <div className="text-center py-6 text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>لا توجد تحديات نشطة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {challenges.map((challenge: any) => (
                <div key={challenge.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{challenge.titleAr || challenge.titleEn}</h3>
                    <Badge variant={challenge.difficulty === "easy" ? "default" : challenge.difficulty === "medium" ? "secondary" : "destructive"} className="text-xs">
                      {challenge.difficulty === "easy" ? "سهل" : challenge.difficulty === "medium" ? "متوسط" : "صعب"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{challenge.descriptionAr || challenge.descriptionEn}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{challenge.participantsCount || 0} مشارك</span>
                    <span>{challenge.points} نقطة</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
