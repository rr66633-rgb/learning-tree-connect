import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Megaphone, Pin } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useState } from "react";

export default function ParentAnnouncements() {
  const { data: announcements, isLoading } = trpc.announcements.list.useQuery();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (isLoading) return <PageSkeleton variant="list" count={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الإعلانات</h1>
      <div className="space-y-3">
        {announcements?.map((a: any) => (
          <Card key={a.id} className={a.isPinned ? "border-amber-300 bg-amber-50/50 shadow-sm" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${a.isPinned ? "bg-amber-200" : "bg-amber-100"}`}>
                  {a.isPinned ? (
                    <Pin className="h-5 w-5 text-amber-700" />
                  ) : (
                    <Megaphone className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium">{a.title}</p>
                    {a.isPinned && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        <Pin className="h-3 w-3 ml-1" />مهم
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                  {a.imageUrl && (
                    <img
                      src={a.imageUrl}
                      alt="مرفق"
                      className="mt-3 rounded-lg border max-h-56 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewImage(a.imageUrl)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!announcements || announcements.length === 0) && <EmptyState variant="announcements" />}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img src={previewImage} alt="معاينة" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
