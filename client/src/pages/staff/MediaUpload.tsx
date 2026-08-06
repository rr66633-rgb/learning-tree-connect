import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useCallback, useDeferredValue, useMemo } from "react";
import { toast } from "sonner";
import { compressImage, uploadDirectToSignedUrl } from "@/lib/uploadWithProgress";
import {
  X, Image as ImageIcon, Film, Plus, Trash2,
  Eye, Loader2, CheckCircle2, Sparkles, Wand2, UserCheck, CloudUpload,
  Images, Play, CalendarDays, ShieldCheck, HardDriveUpload,
  FolderOpen, Maximize2, Link2, Camera, Video, Search
} from "lucide-react";

interface UploadedFile {
  file: File;
  preview: string;
  type: 'photo' | 'video';
  caption: string;
  uploading: boolean;
  uploaded: boolean;
  fileKey?: string;
  storageUrl?: string;
  viewUrl?: string;
  error?: string;
  /** 0-100 while bytes are in flight; null until the size is known. */
  progress?: number | null;
}

function formatFileSize(bytes: number, locale: "ar" | "en") {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ${locale === "ar" ? "ك.ب" : "KB"}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${locale === "ar" ? "م.ب" : "MB"}`;
}

function childDisplayName(child: any): string {
  return child.arabicName || [child.firstName, child.lastName].filter(Boolean).join(' ');
}

function normalizeChildSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default function StaffMediaUpload() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const { data: children } = trpc.children.list.useQuery(undefined, { staleTime: 15 * 60 * 1000 });
  const { data: classesList } = trpc.classes.list.useQuery(undefined, { staleTime: 15 * 60 * 1000 });
  const { data: mediaList, isLoading: mediaLoading } = trpc.media.list.useQuery();
  const utils = trpc.useUtils();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<number[]>([]);
  const [childSearch, setChildSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [visibility, setVisibility] = useState<"class" | "specific">("class");
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState<any | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState<number | null>(null);
  const [aiChildrenLoading, setAiChildrenLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const createUploadUrl = trpc.media.createUploadUrl.useMutation();

  const uploadBatch = trpc.media.uploadBatch.useMutation({
    onSuccess: () => {
      toast.success(t('mediaUpload.uploadSuccess'));
      setFiles(current => {
        current.forEach(item => URL.revokeObjectURL(item.preview));
        return [];
      });
      setSelectedChildren([]);
      setChildSearch('');
      setShowUploadDialog(false);
      utils.media.list.invalidate();
    },
    onError: (e) => toast.error(e.message || t('mediaUpload.uploadError')) });

  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success(t('mediaUpload.deleted'));
      utils.media.list.invalidate();
    },
    onError: (e) => toast.error(e.message || t('mediaUpload.deleteError')) });

  const aiCaption = trpc.media.aiCaption.useMutation();
  const aiSuggestChildren = trpc.media.aiSuggestChildren.useMutation();

  const addFiles = useCallback((selectedFiles: FileList | File[]) => {
    if (!selectedFiles.length) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error(t('mediaUpload.uploadError'));
        continue;
      }

      if (isVideo && file.size > 50 * 1024 * 1024) {
        toast.error(isEn ? `${file.name}: video limit is 50 MB` : `${file.name}: الحد الأقصى للفيديو 50 ميجابايت`);
        continue;
      }
      if (isImage && file.size > 10 * 1024 * 1024) {
        toast.error(isEn ? `${file.name}: image limit is 10 MB` : `${file.name}: الحد الأقصى للصورة 10 ميجابايت`);
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'photo',
        caption: '',
        uploading: false,
        uploaded: false });
    }

    setFiles(prev => {
      const signatures = new Set(prev.map(item => `${item.file.name}-${item.file.size}-${item.file.lastModified}`));
      const unique = newFiles.filter(item => !signatures.has(`${item.file.name}-${item.file.size}-${item.file.lastModified}`));
      const available = Math.max(0, 20 - prev.length);
      if (unique.length > available) {
        toast.error(isEn ? 'You can upload up to 20 files at once' : 'يمكن رفع 20 ملفاً كحد أقصى في المرة الواحدة');
      }
      return [...prev, ...unique.slice(0, available)];
    });
  }, [isEn, t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const clearFiles = () => {
    setFiles(current => {
      current.forEach(item => URL.revokeObjectURL(item.preview));
      return [];
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], caption };
      return newFiles;
    });
  };

  const toggleChild = (childId: number) => {
    setSelectedChildren(prev =>
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  };

  type DirectUploadResult = {
    fileKey: string;
    storageUrl: string;
    viewUrl: string;
    uploadedFile: File;
  };

  // The file bytes go directly from the browser to R2. This server mutation
  // only returns a short-lived URL scoped to one key and content type.
  const uploadFileWithRetry = async (
    file: File,
    type: 'photo' | 'video',
    index: number,
    retries = 2,
  ): Promise<DirectUploadResult> => {
    const uploadedFile = type === 'photo' ? await compressImage(file) : file;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const signed = await createUploadUrl.mutateAsync({
          type,
          contentType: uploadedFile.type,
          fileSize: uploadedFile.size,
        });
        await uploadDirectToSignedUrl(signed.uploadUrl, uploadedFile, {
          onProgress: progress => {
            setFiles(current => {
              const next = [...current];
              if (!next[index]) return current;
              next[index] = {
                ...next[index],
                uploading: true,
                progress: progress.percent,
                error: undefined,
              };
              return next;
            });
          },
        });
        return {
          fileKey: signed.fileKey,
          storageUrl: signed.storageUrl,
          viewUrl: signed.viewUrl,
          uploadedFile,
        };
      } catch (err: any) {
        if (attempt === retries) {
          setFiles(current => {
            const next = [...current];
            if (!next[index]) return current;
            next[index] = {
              ...next[index],
              uploading: false,
              error: err instanceof Error ? err.message : t('mediaUpload.uploadError'),
            };
            return next;
          });
          throw err;
        }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error(t('mediaUpload.retryFailed'));
  };

  const handleAiCaption = async (index: number) => {
    const file = files[index];
    if (file.type !== 'photo') {
      toast.error(t('mediaUpload.uploadError'));
      return;
    }

    setAiCaptionLoading(index);
    try {
      let viewUrl = file.viewUrl;
      if (!viewUrl) {
        const uploaded = await uploadFileWithRetry(file.file, file.type, index);
        viewUrl = uploaded.viewUrl;
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = {
            ...newFiles[index],
            fileKey: uploaded.fileKey,
            storageUrl: uploaded.storageUrl,
            viewUrl: uploaded.viewUrl,
            uploading: false,
            uploaded: true,
            progress: 100,
          };
          return newFiles;
        });
      }

      const result = await aiCaption.mutateAsync({ imageUrl: viewUrl });
      if (result.caption) {
        updateCaption(index, result.caption);
        toast.success(t('mediaUpload.aiCaption'));
      } else {
        toast.error(t('mediaUpload.uploadError'));
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes('504') || msg.includes('500') || msg.includes('timeout')) {
        toast.error(t('mediaUpload.retryFailed'));
      } else {
        toast.error(msg || t('mediaUpload.uploadError'));
      }
    } finally {
      setAiCaptionLoading(null);
    }
  };

  // AI: Suggest children in photos
  const handleAiSuggestChildren = async () => {
    const firstPhoto = files.find(f => f.type === 'photo');
    if (!firstPhoto) {
      toast.error(t('mediaUpload.uploadError'));
      return;
    }

    setAiChildrenLoading(true);
    try {
      let imageUrl = firstPhoto.viewUrl;
      
      if (!imageUrl) {
        const idx = files.indexOf(firstPhoto);
        const uploaded = await uploadFileWithRetry(firstPhoto.file, firstPhoto.type, idx);
        imageUrl = uploaded.viewUrl;
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[idx] = {
            ...newFiles[idx],
            fileKey: uploaded.fileKey,
            storageUrl: uploaded.storageUrl,
            viewUrl: uploaded.viewUrl,
            uploading: false,
            uploaded: true,
            progress: 100,
          };
          return newFiles;
        });
      }

      const result = await aiSuggestChildren.mutateAsync({
        imageUrl: imageUrl!,
        classId: selectedClass ? parseInt(selectedClass) : undefined });

      if (result.suggestedChildIds && result.suggestedChildIds.length > 0) {
        setSelectedChildren(result.suggestedChildIds);
        toast.success(result.message || t('mediaUpload.uploadSuccess'));
      } else {
        toast(result.message || t('mediaUpload.uploadError'));
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes('504') || msg.includes('500') || msg.includes('timeout')) {
        toast.error(t('mediaUpload.retryFailed'));
      } else {
        toast.error(msg || t('mediaUpload.uploadError'));
      }
    } finally {
      setAiChildrenLoading(false);
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error(t('mediaUpload.uploadError'));
      return;
    }
    if (visibility === 'specific' && selectedChildren.length === 0) {
      toast.error(t('mediaUpload.selectChildren'));
      return;
    }

    setIsUploading(true);

    try {
      const uploadedItems: { type: 'photo' | 'video'; fileKey: string; caption?: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        if (files[i].fileKey) {
          uploadedItems.push({
            type: files[i].type,
            fileKey: files[i].fileKey!,
            caption: files[i].caption || undefined });
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { ...newFiles[i], uploaded: true };
            return newFiles;
          });
          continue;
        }

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], uploading: true };
          return newFiles;
        });

        const result = await uploadFileWithRetry(files[i].file, files[i].type, i);
        uploadedItems.push({
          type: files[i].type,
          fileKey: result.fileKey,
          caption: files[i].caption || undefined });

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = {
            ...newFiles[i],
            uploading: false,
            uploaded: true,
            fileKey: result.fileKey,
            storageUrl: result.storageUrl,
            viewUrl: result.viewUrl,
            progress: 100,
          };
          return newFiles;
        });
      }

      await uploadBatch.mutateAsync({
        items: uploadedItems,
        classId: selectedClass ? parseInt(selectedClass) : undefined,
        visibility,
        childIds: selectedChildren.length > 0 ? selectedChildren : undefined });
    } catch (error: any) {
      toast.error(error.message || t('mediaUpload.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const photoCount = files.filter(file => file.type === 'photo').length;
  const videoCount = files.length - photoCount;
  const totalSize = files.reduce((total, item) => total + item.file.size, 0);
  const deferredChildSearch = useDeferredValue(childSearch);
  const filteredChildren = useMemo(() => {
    const query = normalizeChildSearch(deferredChildSearch);
    const tokens = query.split(' ').filter(Boolean);

    return [...(children || [])]
      .map((child: any) => {
        const name = childDisplayName(child);
        const searchable = normalizeChildSearch([
          name,
          child.firstName,
          child.lastName,
        ].filter(Boolean).join(' '));
        if (tokens.length > 0 && !tokens.every(token => searchable.includes(token))) return null;
        const score = query.length === 0
          ? 3
          : searchable.startsWith(query)
            ? 0
            : searchable.split(' ').some(word => word.startsWith(query))
              ? 1
              : 2;
        return { child, name, score };
      })
      .filter((entry): entry is { child: any; name: string; score: number } => Boolean(entry))
      .sort((a, b) => {
        const aSelected = selectedChildren.includes(a.child.id) ? 0 : 1;
        const bSelected = selectedChildren.includes(b.child.id) ? 0 : 1;
        return aSelected - bSelected || a.score - b.score || a.name.localeCompare(b.name, isEn ? 'en' : 'ar');
      })
      .slice(0, 80);
  }, [children, deferredChildSearch, isEn, selectedChildren]);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#DDF2EF] bg-gradient-to-br from-[#F0FFFC] via-white to-[#F3F0FF] p-5 shadow-sm sm:p-7">
        <div className="absolute -end-20 -top-24 size-56 rounded-full bg-[#00C9B7]/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#008F83]">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white shadow-sm"><Images className="size-4" /></span>
              {isEn ? 'Nursery media library' : 'مكتبة وسائط المركز'}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#182033] sm:text-3xl">{t('mediaUpload.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657087]">{t('mediaUpload.subtitle')}</p>
          </div>
          <Button
            onClick={() => setShowUploadDialog(true)}
            size="lg"
            className="h-12 gap-2 rounded-2xl bg-gradient-to-r from-[#00B7A7] to-[#00998D] px-5 font-bold text-white shadow-[0_10px_24px_rgba(0,183,167,0.22)] hover:from-[#00A99A] hover:to-[#008F83]"
          >
            <Plus className="size-5" />
            {t('mediaUpload.uploadNew')}
          </Button>
        </div>
      </section>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent
          dir={isEn ? 'ltr' : 'rtl'}
          className={`max-h-[94vh] w-[calc(100%_-_1rem)] max-w-5xl gap-0 overflow-hidden rounded-3xl border-0 bg-[#F7F9FC] p-0 shadow-2xl sm:w-full sm:max-w-5xl ${isEn ? '' : '[&>button]:left-4 [&>button]:right-auto'}`}
        >
          <DialogHeader className="relative border-b border-[#E6EBF0] bg-gradient-to-r from-[#E9FFFC] via-white to-[#F1EDFF] px-5 py-5 pe-14 text-start sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#00A99A] shadow-sm ring-1 ring-[#00C9B7]/10">
                <CloudUpload className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-[#1A2235]">{t('mediaUpload.uploadNew')}</DialogTitle>
                <p className="mt-1 text-xs leading-5 text-[#68748A]">
                  {isEn ? 'Choose media, set who can see it, then publish.' : 'اختر الوسائط، حدّد من يراها، ثم انشرها بكل سهولة.'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(94vh-164px)] space-y-5 overflow-y-auto px-4 py-5 sm:px-7">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/heic,image/heif,image/webp,video/mp4,video/quicktime,video/webm"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragEnter={event => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={event => event.preventDefault()}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`rounded-3xl border-2 border-dashed p-4 transition-all sm:p-5 ${isDragging ? 'scale-[1.01] border-[#00B7A7] bg-[#E9FFFC] shadow-[0_12px_30px_rgba(0,183,167,0.12)]' : 'border-[#CBD5E1] bg-white'}`}
            >
              <div className="flex flex-col items-center gap-3 py-2 text-center sm:py-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8FFFC] to-[#F0EDFF] text-[#00A99A]">
                  <FolderOpen className="size-6" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#263247]">{t('mediaUpload.dragDrop')}</h3>
                  <p className="mt-1 text-xs text-[#7A8497]">{isEn ? 'Up to 20 files per batch' : 'حتى 20 ملفاً في المرة الواحدة'}</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-extrabold text-[#009E91] underline decoration-[#00B7A7]/30 underline-offset-4 hover:text-[#00877D]">
                  {isEn ? 'Browse all supported files' : 'تصفح جميع الملفات المدعومة'}
                </button>
                <div className="grid w-full max-w-lg grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#D8EFEA] bg-[#F4FFFD] px-3 text-xs font-bold text-[#087F75] transition hover:-translate-y-0.5 hover:border-[#00B7A7] hover:shadow-sm"
                  >
                    <Camera className="size-4" />
                    {isEn ? 'Take a photo' : 'التقاط صورة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#E5DFFC] bg-[#F8F6FF] px-3 text-xs font-bold text-[#6750C9] transition hover:-translate-y-0.5 hover:border-[#8A74E8] hover:shadow-sm"
                  >
                    <Video className="size-4" />
                    {isEn ? 'Record a video' : 'تسجيل فيديو'}
                  </button>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-[#8992A3]">
                  <ShieldCheck className="size-3.5 text-[#00A99A]" />
                  {isEn ? 'Direct encrypted upload to Cloudflare R2' : 'رفع مباشر ومشفّر إلى Cloudflare R2'}
                </p>
                <p className="text-[10px] text-[#9AA3B2]">{isEn ? 'Images up to 10 MB · Videos up to 50 MB' : 'الصور حتى 10 م.ب · الفيديو حتى 50 م.ب'}</p>
              </div>
            </div>

            {files.length > 0 && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#273248]">{isEn ? 'Selected media' : 'الوسائط المختارة'}</h3>
                    <Badge className="rounded-full bg-[#E8FFFC] text-[#008F83] hover:bg-[#E8FFFC]">{files.length}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFiles} disabled={isUploading} className="h-8 gap-1.5 rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="size-3.5" />
                    {isEn ? 'Clear all' : 'مسح الكل'}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((f, idx) => (
                    <article key={`${f.file.name}-${f.file.lastModified}`} className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="relative aspect-video overflow-hidden bg-[#E9EEF4]">
                        {f.type === 'photo' ? (
                          <img src={f.preview} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                        ) : (
                          <video src={f.preview} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute start-2 top-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                          {f.type === 'photo' ? <ImageIcon className="size-3" /> : <Film className="size-3" />}
                          {f.type === 'photo' ? (isEn ? 'Photo' : 'صورة') : (isEn ? 'Video' : 'فيديو')}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          disabled={f.uploading || isUploading}
                          aria-label={isEn ? 'Remove file' : 'إزالة الملف'}
                          className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="size-3.5" />
                        </button>

                        {f.uploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#172033]/72 px-5 text-white backdrop-blur-[2px]">
                            <CloudUpload className="size-7 animate-pulse" />
                            <div className="w-full">
                              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
                                <span>{isEn ? 'Uploading directly' : 'رفع مباشر'}</span>
                                <span className="tabular-nums">{f.progress ?? 0}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                                <div className="h-full rounded-full bg-[#32E0D0] transition-[width] duration-200" style={{ width: `${f.progress ?? 0}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                        {f.uploaded && !f.uploading && (
                          <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                            <CheckCircle2 className="size-3" />
                            {isEn ? 'Ready' : 'جاهز'}
                          </span>
                        )}
                        {f.error && !f.uploading && (
                          <span className="absolute bottom-2 start-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-red-600 px-2 py-1 text-[9px] font-bold text-white" title={f.error}>
                            {isEn ? 'Upload failed' : 'تعذّر الرفع'}
                          </span>
                        )}
                        {aiCaptionLoading === idx && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                            <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[#4B5568] shadow-lg">
                              <Sparkles className="size-4 animate-pulse text-amber-500" />
                              {t('mediaUpload.generating')}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#344054]" title={f.file.name}>{f.file.name}</p>
                            <p className="mt-1 text-[10px] text-[#8A94A6]">{formatFileSize(f.file.size, isEn ? 'en' : 'ar')}</p>
                          </div>
                          {f.type === 'photo' && (
                            <button
                              type="button"
                              onClick={() => void handleAiCaption(idx)}
                              disabled={aiCaptionLoading !== null || isUploading}
                              title={t('mediaUpload.aiCaption')}
                              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition hover:bg-amber-100 disabled:opacity-40"
                            >
                              <Wand2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <Input
                          placeholder={t('mediaUpload.captionPlaceholder')}
                          value={f.caption}
                          maxLength={1_000}
                          onChange={event => updateCaption(idx, event.target.value)}
                          className="h-9 rounded-xl border-[#E2E8F0] bg-[#FAFBFC] text-xs shadow-none focus-visible:ring-[#00B7A7]/20"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-[#F0EDFF] text-[#7159D8]"><UserCheck className="size-4" /></span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#263247]">{isEn ? 'Audience & organization' : 'التنظيم والمستفيدون'}</h3>
                  <p className="mt-0.5 text-[11px] text-[#8992A3]">{isEn ? 'Set the class and who receives these files.' : 'حدّد الفصل ومن سيصل إليهم المحتوى.'}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#4B566C]">{t('weeklyPlan.classOptional')}</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-11 rounded-xl border-[#E2E8F0] bg-[#FAFBFC] shadow-none">
                      <SelectValue placeholder={t('weeklyPlan.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList?.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id.toString()}>{classItem.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#4B566C]">{t('mediaUpload.shareWithParents')}</Label>
                  <Select value={visibility} onValueChange={(value: "class" | "specific") => setVisibility(value)}>
                    <SelectTrigger className="h-11 rounded-xl border-[#E2E8F0] bg-[#FAFBFC] shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">{isEn ? 'Everyone in the selected class' : 'جميع أولياء أمور الفصل'}</SelectItem>
                      <SelectItem value="specific">{isEn ? 'Specific children only' : 'أطفال محددون فقط'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-[#4B566C]">{t('mediaUpload.selectChildren')}</Label>
                    <p className="mt-1 text-[10px] text-[#8992A3]">
                      {visibility === 'specific'
                        ? (isEn ? 'Required when sharing with specific children.' : 'مطلوب عند المشاركة مع أطفال محددين.')
                        : (isEn ? 'Optional: select children to link them to this media.' : 'اختياري: حدّد الأطفال لربطهم بهذه الوسائط.')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    <UserCheck className="me-1 size-3" />
                    {selectedChildren.length} {isEn ? 'selected' : 'محدد'}
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#8B96A8]" />
                  <Input
                    value={childSearch}
                    onChange={event => setChildSearch(event.target.value)}
                    placeholder={isEn ? 'Type a child name…' : 'اكتب اسم الطفل للبحث السريع…'}
                    autoComplete="off"
                    className="h-11 rounded-xl border-[#DCE4EC] bg-white ps-10 text-sm shadow-none focus-visible:border-[#00B7A7] focus-visible:ring-[#00B7A7]/15"
                  />
                  {childSearch && (
                    <button
                      type="button"
                      onClick={() => setChildSearch('')}
                      aria-label={isEn ? 'Clear search' : 'مسح البحث'}
                      className="absolute end-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#8B96A8] hover:bg-[#EEF2F6] hover:text-[#344054]"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-2 sm:grid-cols-2">
                  {filteredChildren.map(({ child, name }) => (
                    <label key={child.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-[#465167] transition hover:bg-white">
                      <Checkbox checked={selectedChildren.includes(child.id)} onCheckedChange={() => toggleChild(child.id)} />
                      <span className="truncate">{name}</span>
                    </label>
                  ))}
                  {filteredChildren.length === 0 && (
                    <p className="col-span-full px-2.5 py-3 text-center text-xs text-[#8992A3]">
                      {childSearch
                        ? (isEn ? 'No child matches this name.' : 'لا يوجد طفل مطابق لهذا الاسم.')
                        : (isEn ? 'No children are available.' : 'لا يوجد أطفال متاحون.')}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {files.some(file => file.type === 'photo') && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm"><Sparkles className="size-4" /></span>
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">{isEn ? 'Smart photo tools' : 'أدوات ذكية للصور'}</p>
                    <p className="mt-0.5 text-[10px] text-amber-700">{isEn ? 'Create a caption or suggest children.' : 'أنشئ وصفاً أو اقترح الأطفال الظاهرين.'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const photoIndex = files.findIndex(file => file.type === 'photo' && !file.caption);
                      if (photoIndex >= 0) void handleAiCaption(photoIndex);
                      else toast(t('mediaUpload.uploadSuccess'));
                    }}
                    disabled={aiCaptionLoading !== null || isUploading || !files.some(file => file.type === 'photo')}
                    className="h-9 gap-2 rounded-xl border-amber-300 bg-white text-xs text-amber-800"
                  >
                    {aiCaptionLoading !== null ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                    {t('mediaUpload.aiCaption')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAiSuggestChildren} disabled={aiChildrenLoading || isUploading} className="h-9 gap-2 rounded-xl border-amber-300 bg-white text-xs text-amber-800">
                    {aiChildrenLoading ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                    {t('mediaUpload.selectChildren')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#E6EBF0] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#707B90]">
              <span className="rounded-full bg-[#E9FFFC] px-2.5 py-1 font-bold text-[#008F83]">{photoCount} {isEn ? 'photos' : 'صور'}</span>
              <span className="rounded-full bg-[#F0EDFF] px-2.5 py-1 font-bold text-[#6750C9]">{videoCount} {isEn ? 'videos' : 'فيديو'}</span>
              {files.length > 0 && <span>{formatFileSize(totalSize, isEn ? 'en' : 'ar')}</span>}
            </div>
            <Button
              onClick={handleUploadAll}
              disabled={files.length === 0 || isUploading || (visibility === 'specific' && selectedChildren.length === 0)}
              size="lg"
              className="h-11 min-w-44 gap-2 rounded-2xl bg-gradient-to-r from-[#00B7A7] to-[#00998D] font-bold text-white shadow-[0_7px_18px_rgba(0,183,167,0.2)]"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <HardDriveUpload className="size-4" />}
              {isUploading ? t('mediaUpload.uploading') : `${isEn ? 'Publish' : 'نشر'} (${files.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-black text-[#202A3D]">{t('mediaUpload.gallery')}</h2>
            <p className="mt-1 text-xs text-[#7B8699]">{isEn ? 'Browse and manage published photos and videos.' : 'استعرض الصور والفيديوهات المنشورة وأدرها بسهولة.'}</p>
          </div>
          <TabsList className="h-11 w-full rounded-2xl bg-[#EEF2F6] p-1 sm:w-auto">
            <TabsTrigger value="all" className="flex-1 rounded-xl px-4 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('mediaUpload.all')} <span className="ms-1 text-[10px] text-muted-foreground">{mediaList?.length || 0}</span></TabsTrigger>
            <TabsTrigger value="photos" className="flex-1 rounded-xl px-4 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('mediaUpload.photos')}</TabsTrigger>
            <TabsTrigger value="videos" className="flex-1 rounded-xl px-4 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('mediaUpload.videos')}</TabsTrigger>
          </TabsList>
        </div>

        {mediaLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-[#E9EDF2]" />)}
          </div>
        ) : (
          <>
            <TabsContent value="all" className="mt-0">
              <MediaGrid items={mediaList} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
            </TabsContent>
            <TabsContent value="photos" className="mt-0">
              <MediaGrid items={mediaList?.filter((media: any) => media.type === 'photo')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
            </TabsContent>
            <TabsContent value="videos" className="mt-0">
              <MediaGrid items={mediaList?.filter((media: any) => media.type === 'video')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {showPreview && (
        <Dialog open onOpenChange={() => setShowPreview(null)}>
          <DialogContent dir={isEn ? 'ltr' : 'rtl'} className="w-fit max-w-[96vw] gap-0 overflow-hidden rounded-3xl border-0 bg-[#111827] p-0 sm:max-w-[94vw]">
            <div className="relative flex max-h-[82vh] min-h-60 min-w-[min(90vw,320px)] items-center justify-center bg-black">
              {showPreview.type === 'video' ? (
                <video src={showPreview.url} controls autoPlay playsInline className="block max-h-[82vh] max-w-[92vw]" />
              ) : (
                <img src={showPreview.url} alt={showPreview.caption || ''} className="block max-h-[82vh] max-w-[92vw] object-contain" />
              )}
              <span className="absolute bottom-3 start-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                <Maximize2 className="size-3" />
                {showPreview.type === 'video' ? (isEn ? 'Video preview' : 'معاينة الفيديو') : (isEn ? 'Photo preview' : 'معاينة الصورة')}
              </span>
            </div>
            {(showPreview.caption || showPreview.createdAt) && (
              <div className="bg-white px-4 py-3 text-start">
                {showPreview.caption && <p className="text-sm font-medium leading-6 text-[#344054]">{showPreview.caption}</p>}
                {showPreview.createdAt && <p className="mt-1 text-[10px] text-[#8A94A6]">{new Date(showPreview.createdAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}</p>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MediaGrid({ items, onDelete, onPreview, t, isEn }: { items: any[] | undefined; onDelete: (id: number) => void; onPreview: (item: any) => void; t: any; isEn: boolean }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#CDD6E1] bg-gradient-to-br from-white to-[#F8FAFC] px-5 py-14 text-center">
        <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#EEF7F6] text-[#00A99A]"><ImageIcon className="size-6" /></span>
        <p className="text-sm font-extrabold text-[#3A455A]">{t('mediaUpload.noMedia')}</p>
        <p className="mt-1 text-xs text-[#8A94A6]">{t('mediaUpload.noMediaDesc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item: any) => (
        <article key={item.id} className="group overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(35,48,72,0.12)]">
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
            <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
              {item.type === 'video' ? <Film className="size-2.5" /> : <ImageIcon className="size-2.5" />}
              {item.type === 'video' ? (isEn ? 'Video' : 'فيديو') : (isEn ? 'Photo' : 'صورة')}
            </span>
          </button>

          <div className="flex min-h-[72px] flex-col justify-between gap-2 p-3">
            <p className={`text-xs leading-5 ${item.caption ? 'line-clamp-2 font-medium text-[#465167]' : 'text-[#A0A8B6]'}`}>
              {item.caption || (isEn ? 'No caption' : 'بدون وصف')}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[9px] text-[#8A94A6]"><CalendarDays className="size-3" />{new Date(item.createdAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(item.url);
                      toast.success(isEn ? 'Temporary viewing link copied' : 'تم نسخ رابط عرض مؤقت');
                    } catch {
                      toast.error(isEn ? 'Could not copy the link' : 'تعذّر نسخ الرابط');
                    }
                  }}
                  aria-label={isEn ? 'Copy temporary link' : 'نسخ رابط مؤقت'}
                  title={isEn ? 'Copy temporary link' : 'نسخ رابط مؤقت'}
                  className="flex size-7 items-center justify-center rounded-lg text-[#9AA3B2] transition hover:bg-[#E9FFFC] hover:text-[#008F83]"
                >
                  <Link2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(t('mediaUpload.deleteConfirm'));
                    if (confirmed) onDelete(item.id);
                  }}
                  aria-label={t('mediaUpload.delete')}
                  className="flex size-7 items-center justify-center rounded-lg text-[#9AA3B2] transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
