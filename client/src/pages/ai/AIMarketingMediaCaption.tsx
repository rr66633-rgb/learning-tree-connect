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
import { fetchWithCsrf } from "@/lib/csrf";
import { useTranslation } from "react-i18next";

export default function AIMarketingMediaCaption() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({
    context: "",
    platform: "instagram" as "instagram" | "tiktok" | "snapchat" | "whatsapp",
    language: "both" as "ar" | "en" | "both" });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateMutation = trpc.aiMarketing.generateMediaCaption.useMutation({
    onSuccess: (data) => {
      // The backend returns { content: { instagram: {...}, tiktok: {...}, ... } }
      // or { content: { raw: "..." } } if JSON parsing failed
      const content = data.content;
      if (content) {
        setResult(content);
        toast.success(isAr ? "تم إنشاء الكابشن بنجاح!" : "Caption created successfully!");
      } else {
        toast.error(isAr ? "لم يتم إنشاء محتوى" : "No content generated");
      }
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? "حدث خطأ" : "An error occurred"));
    } });

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
    setResult(null);
    try {
      let mediaUrl = "";
      let mediaType: "photo" | "video" = "photo";
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("files", files[0]);
        const res = await fetchWithCsrf(apiUrl('/api/upload-media'), { method: "POST", body: formData });
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
        language: form.language });
    } catch {
      toast.error(isAr ? "فشل رفع الملفات" : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${isAr ? "تم نسخ " : "Copied "}${label}`);
  };

  // Extract caption text from the result based on selected platform
  const getDisplayContent = () => {
    if (!result) return null;

    // If it's a raw string response (JSON parse failed on backend)
    if (result.raw) {
      return { caption: result.raw, hashtags: [] };
    }

    // The result structure is: { instagram: { caption, hashtags }, tiktok: { caption, hashtags }, ... }
    const platformData = result[form.platform];
    if (platformData) {
      return {
        caption: platformData.caption || "",
        hashtags: platformData.hashtags || [] };
    }

    // Fallback: try to get any available platform data
    const platforms = ["instagram", "tiktok", "snapchat", "whatsapp"];
    for (const p of platforms) {
      if (result[p]?.caption) {
        return {
          caption: result[p].caption,
          hashtags: result[p].hashtags || [] };
      }
    }

    // Last fallback: if result has captionAr/captionEn structure (old format)
    if (result.captionAr || result.captionEn) {
      return {
        caption: result.captionAr || result.captionEn || "",
        hashtags: result.hashtags || [] };
    }

    return null;
  };

  // Get all platforms content for "copy all"
  const getAllContent = () => {
    if (!result) return "";
    const parts: string[] = [];
    const platforms = ["instagram", "tiktok", "snapchat", "whatsapp"];
    const platformNames: Record<string, string> = {
      instagram: "انستقرام",
      tiktok: "تيك توك",
      snapchat: "سناب شات",
      whatsapp: "واتساب" };
    for (const p of platforms) {
      if (result[p]?.caption) {
        parts.push(`📱 ${platformNames[p]}:\n${result[p].caption}`);
        if (result[p].hashtags?.length) {
          parts.push(result[p].hashtags.join(" "));
        }
        parts.push("");
      }
    }
    return parts.join("\n");
  };

  const platformNames: Record<string, string> = {
    instagram: "انستقرام",
    tiktok: "تيك توك",
    snapchat: "سناب شات",
    whatsapp: "واتساب" };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai/marketing">
          <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isAr ? "كابشن من الصور/الفيديو" : "Caption from Photos/Video"}</h1>
          <p className="text-sm text-gray-500">{isAr ? "ارفع صورة أو فيديو وسيتم كتابة الكابشن تلقائياً" : "Upload a photo or video and the caption will be written automatically"}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>{isAr ? "الصور / الفيديو" : "Photos / Video"}</Label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">{isAr ? "اضغط لرفع صور أو فيديو" : "Click to upload photos or video"}</p>
              <p className="text-xs text-gray-400 mt-1">{isAr ? "الحد الأقصى: 5 ملفات" : "Max: 5 Files"}</p>
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
            <Label>{isAr ? "سياق إضافي" : "Additional Context"}</Label>
            <Input placeholder={isAr ? "مثال: صور من رحلة حديقة الحيوان مع أطفال KG1" : "Example: Photos from zoo trip with KG1 kids"} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? "المنصة" : "Platform"}</Label>
              <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">{isAr ? "انستقرام" : "Instagram"}</SelectItem>
                  <SelectItem value="tiktok">{isAr ? "تيك توك" : "TikTok"}</SelectItem>
                  <SelectItem value="snapchat">{isAr ? "سناب شات" : "Snapchat"}</SelectItem>
                  <SelectItem value="whatsapp">{isAr ? "واتساب" : "WhatsApp"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اللغة" : "Language"}</Label>
              <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "عربي" : "Arabic"}</SelectItem>
                  <SelectItem value="en">{isAr ? "إنجليزي" : "English"}</SelectItem>
                  <SelectItem value="both">{isAr ? "عربي وإنجليزي" : "Arabic and English"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending || isUploading} className="w-full bg-orange-600 hover:bg-orange-700">
            {(generateMutation.isPending || isUploading) ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />{isAr ? "جاري الإنشاء..." : "Creating..."}</> : <><Sparkles className="h-4 w-4 ml-2" />{isAr ? "إنشاء الكابشن" : "Generate Caption"}</>}
          </Button>
        </CardContent>
      </Card>

      {/* Display Results */}
      {result && (
        <div className="space-y-4">
          {/* Show all platforms content */}
          {["instagram", "tiktok", "snapchat", "whatsapp"].map((platform) => {
            const platformContent = result[platform];
            if (!platformContent?.caption) return null;
            return (
              <Card key={platform} className={platform === form.platform ? "ring-2 ring-emerald-500" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-lg">
                        {platform === "instagram" ? "📸" : platform === "tiktok" ? "🎬" : platform === "snapchat" ? "👻" : "💬"}
                      </span>
                      {platformNames[platform]}
                      {platform === form.platform && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{isAr ? "المختار" : "Selected"}</span>
                      )}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(
                      platformContent.caption + (platformContent.hashtags?.length ? "\n\n" + platformContent.hashtags.join(" ") : ""),
                      platformNames[platform]
                    )}>
                      <Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{platformContent.caption}</p>
                  {platformContent.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {platformContent.hashtags.map((h: string, i: number) => (
                        <span key={i} className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{h}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Fallback: raw content if no platform structure */}
          {result.raw && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{isAr ? "الكابشن" : "Caption"}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.raw, isAr ? "الكابشن" : "Caption")}>
                    <Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{result.raw}</p>
              </CardContent>
            </Card>
          )}

          {/* Copy all button */}
          <Button onClick={() => copyToClipboard(getAllContent() || result.raw || "", isAr ? "كل المحتوى" : "All Content")} variant="outline" className="w-full">
            <Copy className="h-4 w-4 ml-2" />{isAr ? "نسخ كل المحتوى" : "Copy All Content"}
          </Button>
        </div>
      )}
    </div>
  );
}
