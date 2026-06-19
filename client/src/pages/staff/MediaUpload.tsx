import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Camera, Video, Upload, X, Image as ImageIcon, Film, Plus,
  Trash2, Eye, Users, Loader2, CheckCircle2
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadBatch = trpc.media.uploadBatch.useMutation({
    onSuccess: () => {
      toast.success("تم رفع الوسائط بنجاح");
      setFiles([]);
      setSelectedChildren([]);
      setShowUploadDialog(false);
      utils.media.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الملف");
      utils.media.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error(`الملف ${file.name} غير مدعوم`);
        continue;
      }

      // Check file size
      if (isVideo && file.size > 50 * 1024 * 1024) {
        toast.error(`الفيديو ${file.name} أكبر من 50 ميجابايت`);
        continue;
      }
      if (isImage && file.size > 10 * 1024 * 1024) {
        toast.error(`الصورة ${file.name} أكبر من 10 ميجابايت`);
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'photo',
        caption: '',
        uploading: false,
        uploaded: false,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    // Reset input
    e.target.value = '';
  }, []);

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

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error("يرجى اختيار ملفات أولاً");
      return;
    }
    if (visibility === 'specific' && selectedChildren.length === 0) {
      toast.error("يرجى اختيار الأطفال الظاهرين في الصور");
      return;
    }

    setIsUploading(true);

    try {
      // Upload files to storage first
      const uploadedItems: { type: 'photo' | 'video'; url: string; caption?: string; mimeType?: string; fileSize?: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], uploading: true };
          return newFiles;
        });

        const formData = new FormData();
        formData.append('file', files[i].file);

        const response = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'فشل رفع الملف');
        }

        const result = await response.json();
        uploadedItems.push({
          type: files[i].type,
          url: result.url,
          caption: files[i].caption || undefined,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
        });

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], uploading: false, uploaded: true, url: result.url };
          return newFiles;
        });
      }

      // Save to database
      await uploadBatch.mutateAsync({
        items: uploadedItems,
        classId: selectedClass ? parseInt(selectedClass) : undefined,
        visibility,
        childIds: selectedChildren.length > 0 ? selectedChildren : undefined,
      });
    } catch (error: any) {
      toast.error(error.message || "فشل رفع الملفات");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">الصور والفيديو</h1>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2" size="default">
          <Plus className="h-4 w-4" />
          رفع وسائط جديدة
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>رفع صور وفيديو</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Selection Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                اختيار ملفات
              </Button>
              <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                <Camera className="h-4 w-4" />
                التقاط صورة
              </Button>
              <Button variant="outline" onClick={() => videoInputRef.current?.click()} className="gap-2">
                <Video className="h-4 w-4" />
                تسجيل فيديو
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
                  <Label className="text-sm font-medium">الملفات المختارة ({files.length})</Label>
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-destructive">
                    حذف الكل
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
                        <div className="absolute top-1 left-1">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Caption input */}
                      <Input
                        placeholder="وصف..."
                        value={f.caption}
                        onChange={(e) => updateCaption(idx, e.target.value)}
                        className="border-0 border-t rounded-none text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Class Selection */}
            <div className="space-y-2">
              <Label>الفصل</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفصل (اختياري)" />
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
              <Label>من يمكنه رؤية هذه الوسائط؟</Label>
              <Select value={visibility} onValueChange={(v: "class" | "specific") => setVisibility(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">جميع أولياء أمور الفصل</SelectItem>
                  <SelectItem value="specific">أولياء أمور أطفال محددين فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Child Selection */}
            <div className="space-y-2">
              <Label>الأطفال الظاهرون في الصور/الفيديو</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                {children?.map((child: any) => (
                  <label key={child.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <Checkbox
                      checked={selectedChildren.includes(child.id)}
                      onCheckedChange={() => toggleChild(child.id)}
                    />
                    <span className="text-sm">{child.firstName} {child.lastName}</span>
                  </label>
                ))}
              </div>
              {selectedChildren.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  تم اختيار {selectedChildren.length} طفل
                </p>
              )}
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
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  رفع {files.length} ملف
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Gallery */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="photos">الصور</TabsTrigger>
          <TabsTrigger value="videos">الفيديو</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <MediaGrid items={mediaList} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <MediaGrid items={mediaList?.filter((m: any) => m.type === 'photo')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} />
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <MediaGrid items={mediaList?.filter((m: any) => m.type === 'video')} onDelete={(id) => deleteMedia.mutate({ id })} onPreview={setShowPreview} />
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

function MediaGrid({ items, onDelete, onPreview }: { items: any[] | undefined; onDelete: (id: number) => void; onPreview: (url: string) => void }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>لا توجد وسائط بعد</p>
        <p className="text-sm">ابدأ برفع صور وفيديو للأطفال</p>
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
                <Badge className="absolute bottom-2 right-2" variant="secondary">فيديو</Badge>
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
            className="absolute top-2 left-2 bg-red-500/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-white/80 text-xs">
              {new Date(item.createdAt).toLocaleDateString('ar-SA')}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
