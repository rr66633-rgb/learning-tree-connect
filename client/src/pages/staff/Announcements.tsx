import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StaffAnnouncements() {
  const { data: announcements } = trpc.announcements.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("all");

  const create = trpc.announcements.create.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); setOpen(false); setTitle(""); setContent(""); toast.success("تم نشر الإعلان"); },
    onError: (e) => toast.error(e.message),
  });

  const audienceLabels: Record<string, string> = { all: "الجميع", parents: "أولياء الأمور", staff: "الموظفون" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعلانات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />إعلان جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نشر إعلان</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>العنوان</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>الجمهور</Label><Select value={audience} onValueChange={setAudience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">الجميع</SelectItem><SelectItem value="parents">أولياء الأمور</SelectItem><SelectItem value="staff">الموظفون</SelectItem></SelectContent></Select></div>
              <div><Label>المحتوى</Label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate({ title, content, audience: audience as "all" | "parents" | "staff" })} disabled={!title || !content || create.isPending}>{create.isPending ? "جاري..." : "نشر"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {announcements?.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Megaphone className="h-5 w-5 text-amber-600" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{a.title}</span>
                    <Badge variant="secondary">{audienceLabels[a.audience] || a.audience}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
