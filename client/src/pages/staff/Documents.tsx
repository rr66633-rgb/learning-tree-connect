import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Download, FileCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function StaffDocuments() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
    const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("policy");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [requiresSignature, setRequiresSignature] = useState(false);

  const create = trpc.documents.create.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      setOpen(false);
      setName(""); setType("policy"); setUrl(""); setAudience("all"); setRequiresSignature(false);
      toast.success(isAr ? "تم إضافة المستند" : "Document added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success(isAr ? "تم حذف المستند" : "Document deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const typeLabels: Record<string, string> = { policy: t("documentTypes.policy"), form: t("documentTypes.form"), report: t("documentTypes.report"), certificate: t("documentTypes.certificate"), consent: t("documentTypes.consent"), other: t("documentTypes.other") };
  const audienceLabels: Record<string, string> = { all: t("common.all"), parents: t("common.parents") || "Parents", staff: t("common.staff") || "Staff" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المستندات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />إضافة مستند</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مستند جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>اسم المستند</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم المستند" /></div>
              <div>
                <Label>النوع</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">سياسة</SelectItem>
                    <SelectItem value="form">نموذج</SelectItem>
                    <SelectItem value="report">تقرير</SelectItem>
                    <SelectItem value="certificate">شهادة</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>رابط المستند</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." dir="ltr" /></div>
              <div>
                <Label>الجمهور</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الجميع</SelectItem>
                    <SelectItem value="parents">أولياء الأمور</SelectItem>
                    <SelectItem value="staff">الموظفون</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sig" checked={requiresSignature} onChange={e => setRequiresSignature(e.target.checked)} className="rounded" />
                <Label htmlFor="sig">يتطلب توقيع ولي الأمر</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate({ name, type: type as any, url, audience: audience as any, requiresSignature })} disabled={!name || !url || create.isPending}>
                {create.isPending ? "جاري..." : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستند</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الجمهور</TableHead>
                <TableHead>التوقيع</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
              documents?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مستندات</TableCell></TableRow> :
              documents?.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{typeLabels[d.type] || d.type}</Badge></TableCell>
                  <TableCell>{audienceLabels[d.audience] || d.audience || "الجميع"}</TableCell>
                  <TableCell>
                    {d.requiresSignature ? (
                      <Badge className="bg-amber-100 text-amber-700 gap-1">
                        <FileCheck className="h-3 w-3" />يتطلب توقيع
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {d.url && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteDoc.mutate({ id: d.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
