import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";
import {
  Camera, Video, Upload, X, Image as ImageIcon, Film, Plus,
  Trash2, Eye, Loader2, CheckCircle2, Sparkles, Wand2, UserCheck
} from "lucide-react";

interface UploadedFile {
  file: File;
  preview: string;
  type: 'photo' | 'video';
  caption: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

export default function StaffMediaUpload() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const { data: children } = trpc.children.list.useQuery();
  const { data: classesList } = trpc.classes.list.useQuery();
  const { data: mediaList, isLoading: mediaLoading } = trpc.media.list.useQuery();
  const utils = trpc.useUtils();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<number[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [visibility, setVisibility] = useState<"class" | "specific">("class");
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState<number | null>(null);
  const [aiChildrenLoading, setAiChildrenLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadBatch = trpc.media.uploadBatch.useMutation({
    onSuccess: () => {
      toast.success(t('mediaUpload.uploadSuccess'));
      setFiles([]);
      setSelectedChildren([]);
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

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
        toast.error(t('mediaUpload.maxSize'));
        continue;
      }
      if (isImage && file.size > 10 * 1024 * 1024) {
        toast.error(t('mediaUpload.maxSize'));
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

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }, [t]);

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

  // Helper: upload file with retry
  const uploadFileWithRetry = async (file: File, retries = 2): Promise<string> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetchWithCsrf(apiUrl('/api/upload-media'), {
          method: 'POST',
          body: formData,
          credentials: 'include' });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || t('mediaUpload.uploadError'));
        }
        const { url } = await uploadRes.json();
        return url;
      } catch (err: any) {
        if (attempt === retries) throw err;
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
      let url = file.url;
      if (!url) {
        url = await uploadFileWithRetry(file.file);
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = { ...newFiles[index], url };
          return newFiles;
        });
      }

      const result = await aiCaption.mutateAsync({ imageUrl: url });
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
      let imageUrl = firstPhoto.url;
      
      if (!imageUrl) {
        imageUrl = await uploadFileWithRetry(firstPhoto.file);
        const idx = files.indexOf(firstPhoto);
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[idx] = { ...newFiles[idx], url: imageUrl };
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
      const uploadedItems: { type: 'photo' | 'video'; url: string; caption?: string; mimeType?: string; fileSize?: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        if (files[i].url) {
          uploadedItems.push({
            type: files[i].type,
            url: files[i].url!,
            caption: files[i].caption || undefined,
            mimeType: files[i].file.type,
            fileSize: files[i].file.size });
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

        const formData = new FormData();
        formData.append('file', files[i].file);

        const response = await fetchWithCsrf(apiUrl('/api/upload-media'), {
          method: 'POST',
          body: formData,
          credentials: 'include' });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || t('mediaUpload.uploadError'));
        }

        const result = await response.json();
        uploadedItems.push({
          type: files[i].type,
          url: result.url,
          caption: files[i].caption || undefined,
          mimeType: result.mimeType,
          fileSize: result.fileSize });

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], uploading: false, uploaded: true, url: result.url };
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('mediaUpload.title')}</h1>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2" size="default">
          <Plus className="h-4 w-4" />
          {t('mediaUpload.uploadNew')}
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('mediaUpload.uploadNew')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                {t('mediaUpload.dragDrop')}
              </Button>
              <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                <Camera className="h-4 w-4" />
                {t('mediaUpload.photos')}
              </Button>
              <Button variant="outline" onClick={() => videoInputRef.current?.click()} className="gap-2">
                <Video className="h-4 w-4" />
                {t('mediaUpload.videos')}
              </Button>
            </div>

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime,video/webm"
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

            {/* File Preview Grid */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{files.length} {t('mediaUpload.photos')}</Label>
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-destructive">
                    {t('mediaUpload.delete')}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {files.map((f, idx) => (
                    <div key={idx} className="relative group border rounded-lg overflow-hidden">
                      {f.type === 'photo' ? (
                        <img src={f.preview} alt="" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {/* Status overlay */}
                      {f.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      {f.uploaded && (
                        <div className={`absolute top-1 ${isEn ? 'left-1' : 'left-1'}`}>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      {/* AI Caption Loading */}
                      {aiCaptionLoading === idx && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5">
                            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span className="text-xs font-medium">{t('mediaUpload.generating')}</span>
                          </div>
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={() => removeFile(idx)}
                        className={`absolute top-1 ${isEn ? 'right-1' : 'right-1'} bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* AI Caption button for photos */}
                      {f.type === 'photo' && (
                        <button
                          onClick={() => handleAiCaption(idx)}
                          disabled={aiCaptionLoading !== null}
                          className={`absolute bottom-9 ${isEn ? 'left-1' : 'left-1'} bg-amber-500/90 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50`}
                          title={t('mediaUpload.aiCaption')}
                        >
                          <Wand2 className="h-3 w-3" />
                        </button>
                      )}
                      {/* Caption input */}
                      <Input
                        placeholder={t('mediaUpload.captionPlaceholder')}
                        value={f.caption}
                        onChange={(e) => updateCaption(idx, e.target.value)}
                        className="border-0 border-t rounded-none text-xs h-8"
                      />
                    </div>
                  ))}
                </div>

                {/* AI Actions Bar */}
                <div className="flex flex-wrap gap-2 p-3 bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 w-full mb-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('mediaUpload.aiCaption')}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const photoIndex = files.findIndex(f => f.type === 'photo' && !f.caption);
                      if (photoIndex >= 0) handleAiCaption(photoIndex);
                      else toast(t('mediaUpload.uploadSuccess'));
                    }}
                    disabled={aiCaptionLoading !== null || !files.some(f => f.type === 'photo')}
                    className="gap-2 border-amber-300 dark:border-amber-700"
                  >
                    {aiCaptionLoading !== null ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {t('mediaUpload.aiCaption')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiSuggestChildren}
                    disabled={aiChildrenLoading || !files.some(f => f.type === 'photo')}
                    className="gap-2 border-amber-300 dark:border-amber-700"
                  >
                    {aiChildrenLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    {t('mediaUpload.selectChildren')}
                  </Button>
                </div>
              </div>
            )}

            {/* Class Selection */}
            <div className="space-y-2">
              <Label>{t('weeklyPlan.classOptional')}</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder={t('weeklyPlan.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classesList?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label>{t('mediaUpload.shareWithParents')}</Label>
              <Select value={visibility} onValueChange={(v: "class" | "specific") => setVisibility(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">{t('mediaUpload.shared')}</SelectItem>
                  <SelectItem value="specific">{t('mediaUpload.private')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Child Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('mediaUpload.selectChildren')}</Label>
                {selectedChildren.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <UserCheck className="h-3 w-3" />
                    {selectedChildren.length}
                  </Badge>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                {children?.map((child: any) => (
                  <label key={child.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <Checkbox
                      checked={selectedChildren.includes(child.id)}
                      onCheckedChange={() => toggleChild(child.id)}
                    />
                    <span className="text-sm">{child.arabicName || `${child.firstName} ${child.lastName}`}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUploadAll}
              disabled={files.length === 0 || isUploading}
              className="w-full gap-2"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('mediaUpload.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t('mediaUpload.upload')} ({files.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Gallery */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t('mediaUpload.all')}</TabsTrigger>
          <TabsTrigger value="photos">{t('mediaUpload.photos')}</TabsTrigger>
          <TabsTrigger value="videos">{t('mediaUpload.videos')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <MediaGrid items={mediaList} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <MediaGrid items={mediaList?.filter((m: any) => m.type === 'photo')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <MediaGrid items={mediaList?.filter((m: any) => m.type === 'video')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} t={t} isEn={isEn} />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {showPreview && (
        <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="max-w-4xl">
            {showPreview.includes('video') ? (
              <video src={showPreview} controls className="w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={showPreview} alt="" className="w-full max-h-[70vh] object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MediaGrid({ items, onDelete, onPreview, t, isEn }: { items: any[] | undefined; onDelete: (id: number) => void; onPreview: (url: string) => void; t: any; isEn: boolean }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t('mediaUpload.noMedia')}</p>
        <p className="text-sm">{t('mediaUpload.noMediaDesc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item: any) => (
        <Card key={item.id} className="overflow-hidden group relative">
          <div className="relative cursor-pointer" onClick={() => onPreview(item.url)}>
            {item.type === 'photo' ? (
              <img src={item.url} alt={item.caption || ''} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-muted flex items-center justify-center relative">
                <Film className="h-10 w-10 text-muted-foreground" />
                <Badge className={`absolute bottom-2 ${isEn ? 'right-2' : 'right-2'}`} variant="secondary">{t('mediaUpload.videos')}</Badge>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          {item.caption && (
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
            </CardContent>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className={`absolute top-2 ${isEn ? 'left-2' : 'left-2'} bg-red-500/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <div className={`absolute top-2 ${isEn ? 'right-2' : 'right-2'}`}>
            <Badge variant="outline" className="bg-white/80 text-xs">
              {new Date(item.createdAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
