import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { CalendarDays, Eye, Film, Image as ImageIcon, Images, Maximize2, Play, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

export default function ParentPhotos() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  
  const childIdNum = selectedChild && selectedChild !== 'all' ? parseInt(selectedChild) : undefined;
  const { data: mediaList, isLoading } = trpc.media.list.useQuery(
    childIdNum ? { childId: childIdNum } : undefined
  );

  const [previewItem, setPreviewItem] = useState<any>(null);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#DDF2EF] bg-gradient-to-br from-[#F0FFFC] via-white to-[#F3F0FF] p-5 shadow-sm sm:p-7">
        <div className="absolute -end-16 -top-20 size-52 rounded-full bg-[#7B61FF]/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#008F83]">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white shadow-sm"><Images className="size-4" /></span>
              {isAr ? 'لحظات أطفالك' : "Your children's moments"}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#182033] sm:text-3xl">{isAr ? "الصور والأنشطة" : "Images & Activities"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#657087]">{isAr ? 'تابع الصور والفيديوهات التي يشاركها المركز في معرض واحد مرتب.' : 'View photos and videos shared by the nursery in one organized gallery.'}</p>
          </div>

          <div className="w-full sm:w-72">
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#647087]"><SlidersHorizontal className="size-3.5" />{isAr ? 'تصفية حسب الطفل' : 'Filter by child'}</label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="h-11 rounded-2xl border-white bg-white/90 shadow-sm">
                <SelectValue placeholder={isAr ? "جميع الأطفال" : "All Children"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "جميع الأطفال" : "All Children"}</SelectItem>
                {children?.map((child: any) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    {child.arabicName || `${child.firstName} ${child.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Tabs defaultValue="all" className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-black text-[#202A3D]">{isAr ? 'معرض الوسائط' : 'Media gallery'}</h2>
            <p className="mt-1 text-xs text-[#7B8699]">{isAr ? `${mediaList?.length || 0} ملفاً متاحاً للعرض` : `${mediaList?.length || 0} files available`}</p>
          </div>
          <TabsList className="h-11 w-full rounded-2xl bg-[#EEF2F6] p-1 sm:w-auto">
            <TabsTrigger value="all" className="flex-1 rounded-xl px-5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{isAr ? "الكل" : "All"}</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1 rounded-xl px-5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{isAr ? "الصور" : "Images"}</TabsTrigger>
            <TabsTrigger value="videos" className="flex-1 rounded-xl px-5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{isAr ? "الفيديو" : "Video"}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList} onPreview={setPreviewItem} />
          )}
        </TabsContent>
        <TabsContent value="photos" className="mt-0">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList?.filter((m: any) => m.type === 'photo')} onPreview={setPreviewItem} />
          )}
        </TabsContent>
        <TabsContent value="videos" className="mt-0">
          {isLoading ? <MediaSkeleton /> : (
            <MediaGallery items={mediaList?.filter((m: any) => m.type === 'video')} onPreview={setPreviewItem} />
          )}
        </TabsContent>
      </Tabs>

      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent dir={isAr ? 'rtl' : 'ltr'} className="w-fit max-w-[96vw] gap-0 overflow-hidden rounded-3xl border-0 bg-[#111827] p-0 sm:max-w-[94vw]">
            <div className="relative flex max-h-[82vh] min-h-60 min-w-[min(90vw,320px)] items-center justify-center bg-black">
              {previewItem.type === 'video' ? (
                <video src={previewItem.url} controls autoPlay playsInline className="block max-h-[82vh] max-w-[92vw]" />
              ) : (
                <img src={previewItem.url} alt={previewItem.caption || ''} className="block max-h-[82vh] max-w-[92vw] object-contain" />
              )}
              <span className="absolute bottom-3 start-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur"><Maximize2 className="size-3" />{previewItem.type === 'video' ? (isAr ? 'معاينة الفيديو' : 'Video preview') : (isAr ? 'معاينة الصورة' : 'Photo preview')}</span>
            </div>
            {(previewItem.caption || previewItem.createdAt) && (
              <div className="bg-white px-4 py-3 text-start">
                {previewItem.caption && <p className="text-sm font-medium leading-6 text-[#344054]">{previewItem.caption}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(previewItem.createdAt).toLocaleDateString(locale, {
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
  const { i18n: subI18n } = useTranslation();
  const isAr = subI18n.language === 'ar';
  if (!items || items.length === 0) {
    return <EmptyState variant="photos" />;
  }

  // Group by date
  const locale = isAr ? 'ar-SA' : 'en-US';
  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const date = new Date(item.createdAt).toLocaleDateString(locale, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-7">
      {Object.entries(grouped).map(([date, dateItems]) => (
        <div key={date}>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#6D788D]"><span className="flex size-7 items-center justify-center rounded-lg bg-[#EEF2F6]"><CalendarDays className="size-3.5" /></span>{date}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {dateItems.map((item: any) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(35,48,72,0.12)]"
              >
                <button type="button" onClick={() => onPreview(item)} className="relative block aspect-[4/3] w-full overflow-hidden bg-[#E9EEF4] text-start">
                  {item.type === 'photo' ? (
                    <img src={item.url} alt={item.caption || ''} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                    <span className="flex size-11 scale-90 items-center justify-center rounded-full bg-white/95 text-[#162033] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                      {item.type === 'video' ? <Play className="ms-0.5 size-4 fill-current" /> : <Eye className="size-4" />}
                    </span>
                  </div>
                  <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">{item.type === 'video' ? <Film className="size-2.5" /> : <ImageIcon className="size-2.5" />}{item.type === 'video' ? (isAr ? 'فيديو' : 'Video') : (isAr ? 'صورة' : 'Photo')}</span>
                </button>
                <div className="min-h-[58px] p-3">
                  <p className={`text-xs leading-5 ${item.caption ? 'line-clamp-2 font-medium text-[#465167]' : 'text-[#A0A8B6]'}`}>{item.caption || (isAr ? 'بدون وصف' : 'No caption')}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
      ))}
    </div>
  );
}
