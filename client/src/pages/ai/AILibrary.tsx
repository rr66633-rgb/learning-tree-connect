import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Library, Search, Trash2, Eye, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const typeColors: Record<string, string> = {
  observation: "bg-violet-100 text-violet-700",
  weekly_plan: "bg-blue-100 text-blue-700",
  activity: "bg-amber-100 text-amber-700",
  progress_report: "bg-emerald-100 text-emerald-700",
  parent_message: "bg-pink-100 text-pink-700",
  newsletter: "bg-indigo-100 text-indigo-700",
  story: "bg-teal-100 text-teal-700",
};

export default function AILibrary() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const typeLabels: Record<string, string> = { activity: t("aiLibrary.activity"), story: t("aiLibrary.story"), song: t("aiLibrary.song"), game: t("aiLibrary.game"), experiment: t("aiLibrary.experiment"), craft: t("aiLibrary.craft"), observation: i18n.language === "ar" ? "ملاحظة" : "Observation", weekly_plan: i18n.language === "ar" ? "خطة أسبوعية" : "Weekly Plan", progress_report: i18n.language === "ar" ? "تقرير تقدم" : "Progress Report", parent_message: i18n.language === "ar" ? "رسالة لولي الأمر" : "Parent Message", newsletter: i18n.language === "ar" ? "نشرة" : "Newsletter" };
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const libraryQuery = trpc.ai.getLibrary.useQuery({ category: typeFilter === "all" ? undefined : typeFilter as any, limit: 50 });
  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم الحفظ في المكتبة" : "Saved to library"); libraryQuery.refetch(); },
  });
  const deleteMutation = trpc.ai.removeFromLibrary.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم الحذف" : "Deleted"); libraryQuery.refetch(); },
  });

  const items = libraryQuery.data || [];
  const filteredItems = search
    ? (items as any[]).filter((item: any) => item.title?.includes(search) || item.type?.includes(search))
    : items;

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-muted"><Library className="h-5 w-5 text-muted-foreground" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">المكتبة</h1>
          <p className="text-sm text-muted-foreground">AI Library</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المكتبة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="observation">ملاحظات</SelectItem>
            <SelectItem value="weekly_plan">خطط أسبوعية</SelectItem>
            <SelectItem value="activity">أنشطة</SelectItem>
            <SelectItem value="progress_report">تقارير تقدم</SelectItem>
            <SelectItem value="parent_message">رسائل</SelectItem>
            <SelectItem value="newsletter">نشرات</SelectItem>
            <SelectItem value="story">قصص</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      {libraryQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (filteredItems as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Library className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">المكتبة فارغة</p>
          <p className="text-sm mt-1">المحتوى المُنشأ بالذكاء الاصطناعي سيظهر هنا تلقائياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filteredItems as any[]).map((item: any) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItem(item)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={typeColors[item.type] || "bg-gray-100 text-gray-700"}>
                    {typeLabels[item.type] || item.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: item.id }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("ar-SA")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.title}
              <Badge className={typeColors[selectedItem?.type] || ""}>
                {typeLabels[selectedItem?.type] || selectedItem?.type}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(selectedItem?.content, null, 2)}
            </pre>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(selectedItem?.content, null, 2)); toast.success(isAr ? "تم النسخ" : "Copied"); }}>
                <Copy className="h-4 w-4 ml-1" />نسخ المحتوى
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
