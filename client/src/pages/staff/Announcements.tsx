import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Pencil, Trash2, Pin, PinOff, ImagePlus, X, Clock, Users, Eye } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { apiUrl } from "@/lib/apiBase";

export default function StaffAnnouncements() {
  const { user } = useAuth();
  const { data: announcements, isLoading } = trpc.announcements.list.useQuery();
  const utils = trpc.useUtils();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createAudience, setCreateAudience] = useState("all");
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [createExpiresAt, setCreateExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editAudience, setEditAudience] = useState("all");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editUploading, setEditUploading] = useState(false);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Readers dialog state
  const [readersAnnouncementId, setReadersAnnouncementId] = useState<number | null>(null);

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin" || user?.role === "principal" || user?.role === "super_admin";

  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      setCreateOpen(false);
      setCreateTitle("");
      setCreateContent("");
      setCreateAudience("all");
      setCreateImageUrl(null);
      setCreateExpiresAt("");
      toast.success("تم نشر الإعلان وإرسال إشعار لأولياء الأمور");
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      setEditOpen(false);
      setEditId(null);
      toast.success("تم تحديث الإعلان");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      setDeleteId(null);
      toast.success("تم حذف الإعلان");
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePin = trpc.announcements.update.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      toast.success("تم تحديث حالة التثبيت");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUploadImage = async (file: File, isEdit = false) => {
    if (isEdit) setEditUploading(true);
    else setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-photo'), { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("فشل رفع الصورة");
      const data = await res.json();
      if (isEdit) setEditImageUrl(data.url);
      else setCreateImageUrl(data.url);
      toast.success("تم رفع الصورة");
    } catch (err: any) {
      toast.error(err.message || "فشل رفع الصورة");
    } finally {
      if (isEdit) setEditUploading(false);
      else setUploading(false);
    }
  };

  const openEditDialog = (announcement: any) => {
    setEditId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditAudience(announcement.audience);
    setEditImageUrl(announcement.imageUrl || null);
    setEditExpiresAt(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : "");
    setEditOpen(true);
  };

  const handleTogglePin = (announcement: any) => {
    togglePin.mutate({ id: announcement.id, isPinned: !announcement.isPinned });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const audienceLabels: Record<string, string> = { all: "الجميع", parents: "أولياء الأمور", staff: "الموظفون" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعلانات</h1>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-2" />إعلان جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>نشر إعلان</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>العنوان</Label><Input value={createTitle} onChange={e => setCreateTitle(e.target.value)} /></div>
                <div>
                  <Label>الجمهور</Label>
                  <Select value={createAudience} onValueChange={setCreateAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الجميع</SelectItem>
                      <SelectItem value="parents">أولياء الأمور</SelectItem>
                      <SelectItem value="staff">الموظفون</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>المحتوى</Label><Textarea value={createContent} onChange={e => setCreateContent(e.target.value)} rows={3} /></div>
                
                {/* Image upload */}
                <div>
                  <Label>صورة مرفقة (اختياري)</Label>
                  <div className="mt-1">
                    {createImageUrl ? (
                      <div className="relative inline-block">
                        <img src={createImageUrl} alt="مرفق" className="h-24 w-auto rounded-lg border object-cover" />
                        <button
                          onClick={() => setCreateImageUrl(null)}
                          className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <ImagePlus className="h-4 w-4 ml-2" />
                        {uploading ? "جاري الرفع..." : "إرفاق صورة"}
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* Expiry date */}
                <div>
                  <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />تاريخ انتهاء الصلاحية (اختياري)</Label>
                  <Input
                    type="datetime-local"
                    value={createExpiresAt}
                    onChange={e => setCreateExpiresAt(e.target.value)}
                    className="mt-1"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {createExpiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">سيختفي الإعلان تلقائياً بعد هذا التاريخ</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate({
                    title: createTitle,
                    content: createContent,
                    audience: createAudience as "all" | "parents" | "staff",
                    imageUrl: createImageUrl,
                    expiresAt: createExpiresAt || null,
                  })}
                  disabled={!createTitle || !createContent || create.isPending || uploading}
                >
                  {create.isPending ? "جاري..." : "نشر"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><div className="flex items-start gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/4" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : announcements?.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">لا توجد إعلانات حالياً</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements?.map((a: any) => (
            <Card key={a.id} className={`${a.isPinned ? "border-amber-300 bg-amber-50/50 shadow-sm" : ""} ${isExpired(a.expiresAt) ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${a.isPinned ? "bg-amber-200" : "bg-amber-100"}`}>
                    {a.isPinned ? (
                      <Pin className="h-5 w-5 text-amber-700" />
                    ) : (
                      <Megaphone className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant="secondary">{audienceLabels[a.audience] || a.audience}</Badge>
                      {a.isPinned && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                          <Pin className="h-3 w-3 ml-1" />مثبت
                        </Badge>
                      )}
                      {isExpired(a.expiresAt) && (
                        <Badge variant="destructive" className="text-xs">منتهي</Badge>
                      )}
                      {a.expiresAt && !isExpired(a.expiresAt) && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 ml-1" />
                          ينتهي {new Date(a.expiresAt).toLocaleDateString('ar-SA')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    {a.imageUrl && (
                      <img
                        src={a.imageUrl}
                        alt="مرفق"
                        className="mt-2 rounded-lg border max-h-48 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(a.imageUrl)}
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${a.isPinned ? "text-amber-600 hover:text-amber-800" : "text-gray-500 hover:text-amber-600"}`}
                        onClick={() => handleTogglePin(a)}
                        title={a.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                        disabled={togglePin.isPending}
                      >
                        {a.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-green-600"
                        onClick={() => setReadersAnnouncementId(a.id)}
                        title="من قرأ الإعلان"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        onClick={() => openEditDialog(a)}
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        onClick={() => setDeleteId(a.id)}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img src={previewImage} alt="معاينة" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تعديل الإعلان</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العنوان</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
            <div>
              <Label>الجمهور</Label>
              <Select value={editAudience} onValueChange={setEditAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجميع</SelectItem>
                  <SelectItem value="parents">أولياء الأمور</SelectItem>
                  <SelectItem value="staff">الموظفون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المحتوى</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} /></div>
            
            {/* Image upload for edit */}
            <div>
              <Label>صورة مرفقة</Label>
              <div className="mt-1">
                {editImageUrl ? (
                  <div className="relative inline-block">
                    <img src={editImageUrl} alt="مرفق" className="h-24 w-auto rounded-lg border object-cover" />
                    <button
                      onClick={() => setEditImageUrl(null)}
                      className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={editUploading}
                  >
                    <ImagePlus className="h-4 w-4 ml-2" />
                    {editUploading ? "جاري الرفع..." : "إرفاق صورة"}
                  </Button>
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file, true);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Expiry date for edit */}
            <div>
              <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />تاريخ انتهاء الصلاحية</Label>
              <Input
                type="datetime-local"
                value={editExpiresAt}
                onChange={e => setEditExpiresAt(e.target.value)}
                className="mt-1"
              />
              {editExpiresAt && (
                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1" onClick={() => setEditExpiresAt("")}>
                  إزالة تاريخ الانتهاء
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                if (editId) {
                  update.mutate({
                    id: editId,
                    title: editTitle,
                    content: editContent,
                    audience: editAudience as "all" | "parents" | "staff",
                    imageUrl: editImageUrl,
                    expiresAt: editExpiresAt || null,
                  });
                }
              }}
              disabled={!editTitle || !editContent || update.isPending || editUploading}
            >
              {update.isPending ? "جاري..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Readers Dialog */}
      <Dialog open={!!readersAnnouncementId} onOpenChange={(open) => !open && setReadersAnnouncementId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />من قرأ هذا الإعلان</DialogTitle></DialogHeader>
          {readersAnnouncementId && <ReadersListContent announcementId={readersAnnouncementId} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "جاري..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Readers list sub-component
function ReadersListContent({ announcementId }: { announcementId: number }) {
  const { data: readers, isLoading } = trpc.announcements.readers.useQuery({ announcementId });

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-2 w-16" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (!readers || readers.length === 0) {
    return (
      <div className="py-8 text-center">
        <Eye className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">لم يقم أحد بتأكيد قراءة هذا الإعلان بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      <p className="text-sm text-muted-foreground mb-3">عدد من قرأ: <span className="font-bold text-foreground">{readers.length}</span></p>
      {readers.map((reader: any) => (
        <div key={reader.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{reader.userName}</p>
            <p className="text-xs text-muted-foreground">{reader.userPhone}</p>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">{new Date(reader.readAt).toLocaleDateString('ar-SA')} - {new Date(reader.readAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ))}
    </div>
  );
}
