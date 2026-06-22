import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Brain,
  ClipboardList,
  Bell,
  Star,
  Activity,
  ChevronLeft,
  Eye,
} from "lucide-react";

export default function DevelopmentDashboard() {
  const [, navigate] = useLocation();
  const { data: dashboard, isLoading } = trpc.development.teacherDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز النمو والتطور</h1>
            <p className="text-sm text-muted-foreground">لوحة المعلم - متابعة تطور الأطفال</p>
          </div>
        </div>
        <Button onClick={() => navigate("/staff/development/observations/new")} className="bg-emerald-600 hover:bg-emerald-700">
          <ClipboardList className="w-4 h-4 ml-2" />
          ملاحظة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">إجمالي الأطفال</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{dashboard.totalChildren}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200/50 dark:bg-blue-800/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">يحتاجون اهتمام</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{dashboard.childrenNeedingAttention}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-800/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">يتفوقون</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{dashboard.childrenExceeding}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-200/50 dark:bg-emerald-800/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">تنبيهات نشطة</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{dashboard.activeAlerts}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-200/50 dark:bg-red-800/30 flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="attention" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="attention" className="rounded-md">
            <AlertTriangle className="w-4 h-4 ml-1" />
            يحتاجون اهتمام
          </TabsTrigger>
          <TabsTrigger value="exceeding" className="rounded-md">
            <Star className="w-4 h-4 ml-1" />
            يتفوقون
          </TabsTrigger>
          <TabsTrigger value="below" className="rounded-md">
            <TrendingDown className="w-4 h-4 ml-1" />
            أقل من المتوقع
          </TabsTrigger>
          <TabsTrigger value="missing" className="rounded-md">
            <ClipboardList className="w-4 h-4 ml-1" />
            تقييمات ناقصة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attention" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                أطفال يحتاجون اهتمام خاص
              </CardTitle>
              <CardDescription>أطفال لديهم تنبيهات نشطة أو تقييمات أقل من المتوقع</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.childrenNeedingAttentionList?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.childrenNeedingAttentionList.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-200 font-bold text-sm">
                          {child.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{child.firstName} {child.lastName}</p>
                          <p className="text-xs text-muted-foreground">{child.reason || "تنبيه نشط"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          {child.alertCount || 1} تنبيه
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/staff/development/child/${child.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">لا يوجد أطفال يحتاجون اهتمام حالياً</p>
                  <p className="text-sm mt-1">جميع الأطفال يتقدمون بشكل جيد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceeding" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-emerald-500" />
                أطفال يتفوقون على التوقعات
              </CardTitle>
              <CardDescription>أطفال أداؤهم أعلى من المستوى المتوقع لأعمارهم</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.exceedingList?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.exceedingList.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-200 font-bold text-sm">
                          {child.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{child.firstName} {child.lastName}</p>
                          <p className="text-xs text-muted-foreground">أداء متميز</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          متفوق
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/staff/development/child/${child.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">لا توجد بيانات كافية بعد</p>
                  <p className="text-sm mt-1">أضف ملاحظات تطورية لرؤية الأطفال المتفوقين</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="below" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                أطفال أقل من المستوى المتوقع
              </CardTitle>
              <CardDescription>أطفال يحتاجون دعم إضافي في مجالات معينة</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.belowExpectedList?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.belowExpectedList.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-700 dark:text-red-200 font-bold text-sm">
                          {child.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{child.firstName} {child.lastName}</p>
                          <p className="text-xs text-muted-foreground">يحتاج دعم إضافي</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          أقل من المتوقع
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/staff/development/child/${child.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">لا توجد بيانات كافية بعد</p>
                  <p className="text-sm mt-1">أضف ملاحظات تطورية لتحديد الأطفال الذين يحتاجون دعم</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                تقييمات ناقصة
              </CardTitle>
              <CardDescription>أطفال لم يتم تقييمهم في هذا الفصل الدراسي</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.missingAssessmentsList?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.missingAssessmentsList.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-200 font-bold text-sm">
                          {child.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{child.firstName} {child.lastName}</p>
                          <p className="text-xs text-muted-foreground">لم يتم تقييمه هذا الفصل</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/staff/development/observations/new?childId=${child.id}`)}>
                          <ClipboardList className="w-4 h-4 ml-1" />
                          تقييم
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">جميع الأطفال تم تقييمهم</p>
                  <p className="text-sm mt-1">ممتاز! لا توجد تقييمات ناقصة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Alerts */}
      {dashboard.recentAlerts?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500" />
              آخر التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentAlerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                  <div className={`w-3 h-3 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title || alert.alertType}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                  <Badge variant="outline" className={alert.severity === 'high' ? 'text-red-600 border-red-300' : 'text-amber-600 border-amber-300'}>
                    {alert.severity === 'high' ? 'عالي' : alert.severity === 'medium' ? 'متوسط' : 'منخفض'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
