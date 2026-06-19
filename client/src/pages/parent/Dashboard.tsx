import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Baby, Calendar, Bell, CreditCard, Utensils, Moon } from "lucide-react";

export default function ParentDashboard() {
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: notifications } = trpc.notifications.unreadCount.useQuery();
  const { data: announcements } = trpc.announcements.list.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مرحباً بك</h1>

      {/* Children summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        )) : children?.map((child: any) => (
          <Card key={child.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Baby className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{child.name}</p>
                  <p className="text-sm text-muted-foreground">{child.age ? `${child.age} سنوات` : ""}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">الفصل: {child.classId || "غير محدد"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Bell className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">{notifications ?? 0}</p><p className="text-xs text-muted-foreground">إشعارات جديدة</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Baby className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{children?.length ?? 0}</p><p className="text-xs text-muted-foreground">أطفالي</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">-</p><p className="text-xs text-muted-foreground">أحداث قادمة</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">-</p><p className="text-xs text-muted-foreground">فواتير معلقة</p></div></CardContent></Card>
      </div>

      {/* Recent announcements */}
      {announcements && announcements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">آخر الإعلانات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
