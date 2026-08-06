import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCsrfToken, invalidateCsrfToken } from "@/lib/csrf";
import { FileText, Trash2, Upload, BookOpen, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";
import { uploadWithProgress, compressImage } from "@/lib/uploadWithProgress";
import { useTranslation } from "react-i18next";

const getLEVEL_LABELS = (isAr: boolean): Record<string, string>  => ({
  nursery: (isAr ? "حضانة" : "Nursery"),
  kg1: (isAr ? "تمهيدي أول" : "Preschool 1"),
  kg2: (isAr ? "تمهيدي ثاني" : "Preschool 2"),
  kg3: (isAr ? "تمهيدي ثالث" : "Preschool 3"),
  all: (isAr ? "جميع المستويات" : "All Levels") });

export default function CurriculumManagement() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("all_filter");

  const utils = trpc.useUtils();
  const { data: curricula, isLoading } = trpc.curriculum.list.useQuery(
    filterLevel !== "all_filter" ? { level: filterLevel as any } : undefined
  );
  const createMutation = trpc.curriculum.create.useMutation({
    onSuccess: () => {
      utils.curriculum.list.invalidate();
      toast.success(isAr ? "تم إضافة المنهج بنجاح" : "Curriculum added successfully");
      resetForm();
    },
    onError: (err) => toast.error(err.message) });
  const deleteMutation = trpc.curriculum.delete.useMutation({
    onSuccess: () => {
      utils.curriculum.list.invalidate();
      toast.success(isAr ? "تم حذف المنهج بنجاح" : "Curriculum deleted successfully");
    },
    onError: (err) => toast.error(err.message) });

  function resetForm() {
    setTitle("");
    setDescription("");
    setLevel("");
    setCategory("");
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !level) {
      toast.error(isAr ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    setUploading(true);
    try {
      // Upload file first. Curriculum files are documents (PDF/Word), so they
      // are sent byte-exact -- no client-side re-encoding.
      // The hand-rolled 403/CSRF retry that used to live here is now built into
      // uploadWithProgress, so it is no longer duplicated per page.
      const formData = new FormData();
      formData.append("file", file);
      const { fileUrl, fileKey, fileName, fileSize } = await uploadWithProgress<{
        fileUrl: string; fileKey: string; fileName: string; fileSize: number;
      }>(apiUrl('/api/upload-curriculum'), formData);

      // Create curriculum record
      await createMutation.mutateAsync({
        title,
        description: description || undefined,
        level: level as any,
        category: category || undefined,
        fileUrl,
        fileKey,
        fileName,
        fileSize });
    } catch (err: any) {
      toast.error(err.message || (isAr ? "حدث خطأ أثناء الرفع" : "An error occurred during upload"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-800">{isAr ? "مكتبة المناهج" : "Curriculum Library"}</h1>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {isAr ? "إضافة منهج جديد" : "Add New Curriculum"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان المنهج *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? "مثال: منهج الحروف العربية" : "Example: Arabic Letters Curriculum"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>المستوى *</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر المستوى" : "Select Level"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery">{isAr ? "حضانة" : "Nursery"}</SelectItem>
                    <SelectItem value="kg1">{isAr ? "تمهيدي أول" : "Preschool 1"}</SelectItem>
                    <SelectItem value="kg2">{isAr ? "تمهيدي ثاني" : "Preschool 2"}</SelectItem>
                    <SelectItem value="kg3">{isAr ? "تمهيدي ثالث" : "Preschool 3"}</SelectItem>
                    <SelectItem value="all">{isAr ? "جميع المستويات" : "All Levels"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "التصنيف" : "Category"}</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={isAr ? "مثال: لغة عربية، رياضيات، علوم" : "Example: Arabic, Math, Science"}
                />
              </div>
              <div className="space-y-2">
                <Label>ملف المنهج (PDF) *</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "وصف المنهج" : "Curriculum Description"}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "وصف مختصر للمنهج..." : "Brief Curriculum Description..."}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-2" />
                  {isAr ? "رفع المنهج" : "Upload Curriculum"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter & List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{isAr ? "المناهج المرفوعة" : "Uploaded Curricula"}</CardTitle>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={isAr ? "تصفية حسب المستوى" : "Filter by Level"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_filter">{isAr ? "جميع المستويات" : "All Levels"}</SelectItem>
                <SelectItem value="nursery">{isAr ? "حضانة" : "Nursery"}</SelectItem>
                <SelectItem value="kg1">{isAr ? "تمهيدي أول" : "Preschool 1"}</SelectItem>
                <SelectItem value="kg2">{isAr ? "تمهيدي ثاني" : "Preschool 2"}</SelectItem>
                <SelectItem value="kg3">{isAr ? "تمهيدي ثالث" : "Preschool 3"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : !curricula || curricula.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{isAr ? "لا توجد مناهج مرفوعة حتى الآن" : "No curricula uploaded yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {curricula.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-2 rounded-lg">
                      <FileText className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">
                          {getLEVEL_LABELS(isAr)[item.level] || item.level}
                        </span>
                        {item.category && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                            {item.category}
                          </span>
                        )}
                        {item.fileSize && (
                          <span className="text-xs text-gray-400">
                            {(item.fileSize / 1024 / 1024).toFixed(1)} ميجابايت
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      {isAr ? "عرض" : "View"}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm((isAr ? "هل أنت متأكد من حذف هذا المنهج؟" : "Are you sure you want to delete this curriculum?"))) {
                          deleteMutation.mutate({ id: item.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
