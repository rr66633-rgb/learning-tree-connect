import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, Sparkles, Upload, Video, X } from "lucide-react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { useTranslation } from "react-i18next";

export default function AIMarketingMediaCaption() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({
    context: "",
    platform: "instagram" as "instagram" | "tiktok" | "snapchat" | "whatsapp",
    language: "both" as "ar" | "en" | "both",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateMutation = trpc.aiMarketing.generateMediaCaption.useMutation({
    onSuccess: (data) => {
      setResult(data.content);
      toast.success(isAr ? "تم إنشاء الكابشن بنجاح!" : "Caption created successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast.error(isAr ? "الحد الأقصى 5 ملفات" : "Maximum 5 files");
      return;
    }
    setFiles([...files, ...selectedFiles]);
    const newPreviews = selectedFiles.map((f) => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (files.length === 0 && !form.context) {
      toast.error(isAr ? "يرجى رفع صورة/فيديو أو كتابة وصف" : "Please upload image/video or write description");
      return;
    }
    setIsUploading(true);
    try {
      let mediaUrl = "";
      let mediaType: "photo" | "video" = "photo";
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("files", files[0]);
        const res = await fetch(apiUrl('/api/upload-media'), { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          mediaUrl = data.urls?.[0] || data.url || "";
        }
        mediaType = files[0].type.startsWith("video") ? "video" : "photo";
      }
      generateMutation.mutate({
        mediaUrl: mediaUrl || "uploaded-media",
        mediaType,
        context: form.context,
        platform: form.platform,
        language: form.language,
      });
    } catch {
      toast.error(isAr ? "فشل رفع الملفات" : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai/marketing">
          <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">كابشن من الصور/الفيديو</h1>
          <p className="text-sm text-gray-500">ارفع صورة أو فيديو والذكاء الاصطناعي يكتب الكابشن</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>الصور / الفيديو</Label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">اضغط لرفع صور أو فيديو</p>
              <p className="text-xs text-gray-400 mt-1">الحد الأقصى: 5 ملفات</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative group">
                  {files[i]?.type.startsWith("video") ? (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center"><Video className="h-8 w-8 text-gray-400" /></div>
                  ) : (
                    <img src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  )}
                  <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>سياق إضافي</Label>
            <Input placeholder="مثال: صور من رحلة حديقة الحيوان مع أطفال KG1" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المنصة</Label>
              <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">انستقرام</SelectItem>
                  <SelectItem value="tiktok">تيك توك</SelectItem>
                  <SelectItem value="snapchat">سناب شات</SelectItem>
                  <SelectItem value="whatsapp">واتساب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اللغة" : "Language"}</Label>
              <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">عربي</SelectItem>
                  <SelectItem value="en">إنجليزي</SelectItem>
                  <SelectItem value="both">عربي وإنجليزي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending || isUploading} className="w-full bg-orange-600 hover:bg-orange-700">
            {(generateMutation.isPending || isUploading) ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</> : <><Sparkles className="h-4 w-4 ml-2" />إنشاء الكابشن</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.captionAr && (
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">الكابشن (عربي)</CardTitle><Button variant="outline" size="sm" onClick={() => copyToClipboard(result.captionAr, "الكابشن")}><Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}</Button></div></CardHeader>
              <CardContent><p className="whitespace-pre-wrap">{result.captionAr}</p></CardContent>
            </Card>
          )}
          {result.captionEn && (
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Caption (English)</CardTitle><Button variant="outline" size="sm" onClick={() => copyToClipboard(result.captionEn, "Caption")}><Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}</Button></div></CardHeader>
              <CardContent><p className="whitespace-pre-wrap" dir="ltr">{result.captionEn}</p></CardContent>
            </Card>
          )}
          {result.hashtags && (
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">الهاشتاقات</CardTitle><Button variant="outline" size="sm" onClick={() => copyToClipboard(result.hashtags.join(" "), "الهاشتاقات")}><Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}</Button></div></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.hashtags.map((h: string, i: number) => <span key={i} className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{h}</span>)}</div></CardContent>
            </Card>
          )}
          <Button onClick={() => copyToClipboard(`${result.captionAr || ""}\n\n${result.captionEn || ""}\n\n${result.hashtags?.join(" ") || ""}`, "كل المحتوى")} variant="outline" className="w-full">
            <Copy className="h-4 w-4 ml-2" />نسخ كل المحتوى
          </Button>
        </div>
      )}
    </div>
  );
}
