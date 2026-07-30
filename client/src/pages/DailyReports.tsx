import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Loader2, Camera, X, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";
import { useTranslation } from "react-i18next";

const moodColors: Record<string, string> = { happy: "bg-green-100 text-green-700", calm: "bg-blue-100 text-blue-700", tired: "bg-amber-100 text-amber-700", upset: "bg-red-100 text-red-700", excited: "bg-purple-100 text-purple-700" };

export default function DailyReports() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const moodLabels: Record<string, string> = { happy: "سعيد", calm: "هادئ", tired: "متعب", upset: isAr ? "منزعج" : "Upset", excited: "متحمس" };

  const { data: reports, isLoading: reportsLoading } = trpc.dailyReports.list.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createReport = trpc.dailyReports.create.useMutation({
    onSuccess: () => { utils.dailyReports.list.invalidate(); toast.success(isAr ? "تم إنشاء التقرير بنجاح" : "Report created successfully"); setOpen(false); setPhotos([]); },
    onError: () => toast.error(isAr ? "حدث خطأ" : "An error occurred") });

  const [form, setForm] = useState({
    childId: 0,
    date: new Date().toISOString().split('T')[0],
    mood: "happy" as "happy" | "calm" | "tired" | "upset" | "excited",
    activities: "",
    teacherNotes: "",
    meals: { breakfast: "", lunch: "", snack: "" },
    sleep: { from: "", to: "", quality: "good" } });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error(isAr ? "الحد الأقصى 5 صور لكل تقرير" : "Maximum 5 photos per report");
      return;
    }
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetchWithCsrf(apiUrl('/api/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64,
              fileName: `report-${Date.now()}-${file.name}`,
              contentType: file.type }) });
          if (!response.ok) throw new Error('Upload failed');
          const { url } = await response.json();
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { toast.error(isAr ? "يرجى اختيار الطفل" : "Please select a child"); return; }

    setUploading(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await Promise.all(photos.map(p => uploadPhoto(p.file)));
      }

      createReport.mutate({
        childId: form.childId,
        date: form.date,
        mood: form.mood,
        activities: form.activities,
        teacherNotes: form.teacherNotes,
        meals: form.meals,
        sleep: form.sleep,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
        isPublished: true });
    } catch {
      toast.error(isAr ? "فشل رفع الصور" : "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const getChildName = (childId: number) => {
    const child = children?.find(c => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : isAr ? "غير معروف" : "Unknown";
  };

  const getReportPhotos = (report: any): string[] => {
    if (!report.photos) return [];
    if (Array.isArray(report.photos)) return report.photos;
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {isAr ? "التقارير اليومية" : "Daily Reports"}
          {reportsLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />{isAr ? "تقرير جديد" : "New Report"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isAr ? "إنشاء تقرير يومي" : "Create Daily Report"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isAr ? "الطفل" : "Child"}</Label>
                  <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => setForm(f => ({ ...f, childId: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} /></SelectTrigger>
                    <SelectContent>{children?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div>
                <Label>{isAr ? "المزاج" : "Mood"}</Label>
                <Select value={form.mood} onValueChange={v => setForm(f => ({ ...f, mood: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="happy">{isAr ? "سعيد" : "Happy"}</SelectItem>
                    <SelectItem value="calm">{isAr ? "هادئ" : "Calm"}</SelectItem>
                    <SelectItem value="tired">{isAr ? "متعب" : "Tired"}</SelectItem>
                    <SelectItem value="upset">{isAr ? "منزعج" : "Upset"}</SelectItem>
                    <SelectItem value="excited">{isAr ? "متحمس" : "Excited"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Allergy Warning */}
              {form.childId > 0 && (() => {
                const selectedChild = children?.find((c: any) => c.id === form.childId);
                return selectedChild?.allergies ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">{isAr ? "تنبيه حساسية!" : "Allergy Alert!"}</p>
                      <p className="text-xs text-red-700 mt-0.5">{isAr ? "هذا الطفل لديه حساسية من:" : "This child has allergies to:"} <span className="font-medium">{selectedChild.allergies}</span></p>
                      <p className="text-xs text-red-600 mt-1">{isAr ? "يرجى التأكد من مكونات الوجبات قبل التقديم" : "Please verify meal ingredients before serving"}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="space-y-2">
                <Label className="font-semibold">{isAr ? "الوجبات" : "Meals"}</Label>
                <Input placeholder={isAr ? "الإفطار" : "Breakfast"} value={form.meals.breakfast} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, breakfast: e.target.value } }))} />
                <Input placeholder={isAr ? "الغداء" : "Lunch"} value={form.meals.lunch} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, lunch: e.target.value } }))} />
                <Input placeholder={isAr ? "وجبة خفيفة" : "Snack"} value={form.meals.snack} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, snack: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? "النوم من" : "Sleep from"}</Label><Input type="time" value={form.sleep.from} onChange={e => setForm(f => ({ ...f, sleep: { ...f.sleep, from: e.target.value } }))} /></div>
                <div><Label>{isAr ? "النوم إلى" : "Sleep to"}</Label><Input type="time" value={form.sleep.to} onChange={e => setForm(f => ({ ...f, sleep: { ...f.sleep, to: e.target.value } }))} /></div>
              </div>
              <div><Label>{isAr ? "الأنشطة" : "Activities"}</Label><Textarea value={form.activities} onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} placeholder="وصف الأنشطة التي قام بها الطفل اليوم" /></div>
              <div><Label>{isAr ? "ملاحظات المعلمة" : "Teacher\'s Notes"}</Label><Textarea value={form.teacherNotes} onChange={e => setForm(f => ({ ...f, teacherNotes: e.target.value }))} placeholder="ملاحظات إضافية لولي الأمر" /></div>

              {/* Photo Upload Section */}
              <div className="space-y-2">
                <Label className="font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {isAr ? "صور الأنشطة" : "Activity Photos"}
                  <span className="text-xs text-muted-foreground font-normal">{isAr ? "(اختياري - حد أقصى 5 صور)" : "(Optional - max 5 photos)"}</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border">
                        <img src={photo.preview} alt="" className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed"
                  >
                    <Camera className="h-4 w-4 ml-2" />
                    {isAr ? "إضافة صور" : "Add Photos"}
                  </Button>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createReport.isPending || uploading}>
                {uploading ? (isAr ? "جارٍ رفع الصور..." : "Uploading photos...") : createReport.isPending ? (isAr ? "جارٍ الإنشاء..." : "Creating...") : (isAr ? "إنشاء التقرير" : "Create Report")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {reportsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports?.map(report => {
            const reportPhotos = getReportPhotos(report);
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{getChildName(report.childId)}</CardTitle>
                    <Badge className={moodColors[report.mood ?? "happy"]}>{moodLabels[report.mood ?? "happy"]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(report.date).toLocaleDateString('ar-SA')}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                      {reportPhotos.slice(0, 3).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" className="w-full h-16 object-cover" />
                      ))}
                      {reportPhotos.length > 3 && (
                        <div className="flex items-center justify-center bg-muted text-muted-foreground text-xs">
                          +{reportPhotos.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  {report.activities && <p className="text-sm"><span className="font-medium">{isAr ? "الأنشطة:" : "Activities:"}</span> {report.activities}</p>}
                  {report.teacherNotes && <p className="text-sm"><span className="font-medium">{isAr ? "ملاحظات:" : "Notes:"}</span> {report.teacherNotes}</p>}
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant={report.isPublished ? "default" : "secondary"}>{report.isPublished ? (isAr ? "منشور" : "Published") : (isAr ? "مسودة" : "Draft")}</Badge>
                    {reportPhotos.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 ml-1" />
                        {reportPhotos.length} صور
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!reports || reports.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>{isAr ? "لا توجد تقارير يومية بعد" : "No daily reports yet"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
