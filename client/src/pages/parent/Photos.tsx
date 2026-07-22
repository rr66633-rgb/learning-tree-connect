import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Image as ImageIcon, Film, Eye, Download, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

export default function ParentPhotos() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  
  const childIdNum = selectedChild && selectedChild !== 'all' ? parseInt(selectedChild) : undefined;
  const { data: mediaList, isLoading } = trpc.media.list.useQuery(
    childIdNum ? { childId: childIdNum } : undefined
  );

  const [previewItem, setPreviewItem] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الصور والأنشطة</h1>
      </div>

      {/* Child Filter */}
      <Select value={selectedChild} onValueChange={setSelectedChild}>
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder="جميع الأطفال" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الأطفال</SelectItem>
          {children?.map((c: any) => (
            <SelectItem key={c.id} value={c.id.toString()}>
              {c.firstName} {c.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="photos">الصور</TabsTrigger>
          <TabsTrigger value="videos">الفيديو</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList} onPreview={setPreviewItem} />
          )}
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList?.filter((m: any) => m.type === 'photo')} onPreview={setPreviewItem} />
          )}
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList?.filter((m: any) => m.type === 'video')} onPreview={setPreviewItem} />
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="relative">
              {previewItem.type === 'video' ? (
                <video src={previewItem.url} controls className="w-full max-h-[70vh] rounded-t-lg" />
              ) : (
                <img src={previewItem.url} alt={previewItem.caption || ''} className="w-full max-h-[70vh] object-contain bg-black" />
              )}
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {previewItem.caption && (
              <div className="p-4 border-t">
                <p className="text-sm">{previewItem.caption}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(previewItem.createdAt).toLocaleDateString('ar-SA', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MediaGallery({ items, onPreview }: { items: any[] | undefined; onPreview: (item: any) => void }) {
  if (!items || items.length === 0) {
    return <EmptyState variant="photos" />;
  }

  // Group by date
  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const date = new Date(item.createdAt).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, dateItems]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dateItems.map((item: any) => (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer group hover:shadow-md transition-shadow"
                onClick={() => onPreview(item)}
              >
                <div className="relative">
                  {item.type === 'photo' ? (
                    <img src={item.url} alt={item.caption || ''} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                      <Film className="h-12 w-12 text-muted-foreground/50" />
                      <Badge className="absolute bottom-2 right-2 text-xs" variant="secondary">
                        <Film className="h-3 w-3 ml-1" />
                        فيديو
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
                {item.caption && (
                  <CardContent className="p-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-lg" />
      ))}
    </div>
  );
}
