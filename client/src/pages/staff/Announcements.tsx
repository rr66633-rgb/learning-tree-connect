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
import { Plus, Megaphone, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function StaffAnnouncements() {
  const { user } = useAuth();
  const { data: announcements, isLoading } = trpc.announcements.list.useQuery();
  const utils = trpc.useUtils();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createAudience, setCreateAudience] = useState("all");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editAudience, setEditAudience] = useState("all");

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "principal" || user?.role === "super_admin";

  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      setCreateOpen(false);
      setCreateTitle("");
      setCreateContent("");
      setCreateAudience("all");
      toast.success("تم نشر الإعلان");
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

  const openEditDialog = (announcement: any) => {
    setEditId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditAudience(announcement.audience);
    setEditOpen(true);
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
            <DialogContent>
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
                <div><Label>المحتوى</Label><Textarea value={createContent} onChange={e => setCreateContent(e.target.value)} rows={4} /></div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate({ title: createTitle, content: createContent, audience: createAudience as "all" | "parents" | "staff" })}
                  disabled={!createTitle || !createContent || create.isPending}
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
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Megaphone className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant="secondary">{audienceLabels[a.audience] || a.audience}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
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
            <div><Label>المحتوى</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                if (editId) {
                  update.mutate({ id: editId, title: editTitle, content: editContent, audience: editAudience as "all" | "parents" | "staff" });
                }
              }}
              disabled={!editTitle || !editContent || update.isPending}
            >
              {update.isPending ? "جاري..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
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
