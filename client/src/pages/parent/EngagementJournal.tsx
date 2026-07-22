import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "wouter";
import { ChevronRight, Plus, Camera, Heart, Star, Smile, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function EngagementJournal() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryType, setEntryType] = useState("milestone");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("happy");
  const [selectedChildId, setSelectedChildId] = useState<number>(0);

  const { data: childrenData } = trpc.children.list.useQuery();
  const firstChildId = childrenData?.[0]?.id || 0;
  const activeChildId = selectedChildId || firstChildId;

  const { data: entries, isLoading } = trpc.engagement.journal.list.useQuery(
    { childId: activeChildId, limit: 20 },
    { enabled: !!activeChildId }
  );

  const createMutation = trpc.engagement.journal.create.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حفظ اللحظة بنجاح! 📸" : "Moment saved successfully! 📸");
      setShowNewEntry(false);
      setTitle("");
      setContent("");
    },
    onError: () => {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error while saving");
    },
  });

  const getMoodEmoji = (m: string) => {
    const moods: Record<string, string> = {
      happy: "😊", excited: "🤩", proud: "🥹", calm: "😌",
      curious: "🤔", creative: "🎨", energetic: "⚡", loving: "🥰",
    };
    return moods[m] || "😊";
  };

  const getTypeIcon = (type: string) => {
    const types: Record<string, string> = {
      milestone: "🏆", funny_moment: "😂", learning: "📚",
      creativity: "🎨", social: "🤝", physical: "🏃", emotional: "💝",
    };
    return types[type] || "📝";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      milestone: "إنجاز", funny_moment: "لحظة مضحكة", learning: "تعلم جديد",
      creativity: "إبداع", social: "تفاعل اجتماعي", physical: "نشاط بدني", emotional: "نمو عاطفي",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto py-6 px-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/parent/engagement">
            <Button variant="ghost" size="sm" className="mb-1 -mr-2">
              <ChevronRight className="h-4 w-4 ml-1" />
              العودة
            </Button>
          </Link>
          <h1 className="text-xl font-bold">يوميات الإنجاز</h1>
          <p className="text-sm text-muted-foreground">وثّق لحظات طفلك المميزة</p>
        </div>
        <Button size="sm" onClick={() => setShowNewEntry(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          لحظة جديدة
        </Button>
      </div>

      {/* Child selector */}
      {childrenData && childrenData.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {childrenData.map((child: any) => (
            <Button
              key={child.id}
              variant={activeChildId === child.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
            >
              {child.firstName}
            </Button>
          ))}
        </div>
      )}

      {/* New Entry Dialog */}
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>لحظة جديدة ✨</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">نوع اللحظة</label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">🏆 إنجاز</SelectItem>
                  <SelectItem value="funny_moment">😂 لحظة مضحكة</SelectItem>
                  <SelectItem value="learning">📚 تعلم جديد</SelectItem>
                  <SelectItem value="creativity">🎨 إبداع</SelectItem>
                  <SelectItem value="social">🤝 تفاعل اجتماعي</SelectItem>
                  <SelectItem value="physical">🏃 نشاط بدني</SelectItem>
                  <SelectItem value="emotional">💝 نمو عاطفي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">العنوان</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: أول كلمة جديدة تعلمها اليوم"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">التفاصيل</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="صف اللحظة بالتفصيل..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">مزاج الطفل</label>
              <div className="flex flex-wrap gap-2">
                {["happy", "excited", "proud", "calm", "curious", "creative", "energetic", "loving"].map((m) => (
                  <Button
                    key={m}
                    variant={mood === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMood(m)}
                    className="text-lg"
                  >
                    {getMoodEmoji(m)}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => createMutation.mutate({
                childId: activeChildId,
                entryType: entryType as "milestone" | "photo" | "note" | "video" | "achievement",
                title,
                description: content,
              })}
              disabled={!title || !content || createMutation.isPending}
            >
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ اللحظة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Journal Entries */}
      {!entries || entries.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">لم تسجل أي لحظات بعد</p>
            <p className="text-xs text-muted-foreground mt-1">ابدأ بتوثيق لحظات طفلك المميزة</p>
            <Button className="mt-4" onClick={() => setShowNewEntry(true)}>
              <Plus className="h-4 w-4 ml-2" />
              أضف أول لحظة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{entry.titleAr}</h3>
                      <span className="text-lg">{getMoodEmoji(entry.mood)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{entry.contentAr}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{getTypeLabel(entry.type)}</span>
                      <span>•</span>
                      <span>{new Date(entry.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                    {entry.teacherComment && (
                      <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-xs">
                        <span className="font-medium text-blue-700 dark:text-blue-300">تعليق المعلمة: </span>
                        {entry.teacherComment}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
