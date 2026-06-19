import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export default function ParentAnnouncements() {
  const { data: announcements } = trpc.announcements.list.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الإعلانات</h1>
      <div className="space-y-3">
        {announcements?.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Megaphone className="h-5 w-5 text-amber-600" /></div>
                <div className="flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!announcements || announcements.length === 0) && <p className="text-center text-muted-foreground py-8">لا توجد إعلانات</p>}
      </div>
    </div>
  );
}
