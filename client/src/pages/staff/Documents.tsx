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
        <h1 className="text-2xl font-bold">{isAr ? "إدارة المستندات" : "Document Management"}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "إضافة مستند" : "Add Document"}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? "إضافة مستند جديد" : "Add New Document"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{isAr ? "اسم المستند" : "Document Name"}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={isAr ? "اسم المستند" : "Document Name"} /></div>
              <div>
                <Label>{isAr ? "النوع" : "Type"}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">{isAr ? "سياسة" : "Policy"}</SelectItem>
                    <SelectItem value="form">{isAr ? "نموذج" : "Template"}</SelectItem>
                    <SelectItem value="report">{isAr ? "تقرير" : "Report"}</SelectItem>
                    <SelectItem value="certificate">{isAr ? "شهادة" : "Certificate"}</SelectItem>
                    <SelectItem value="other">{isAr ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? "رابط المستند" : "Document Link"}</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." dir="ltr" /></div>
              <div>
                <Label>{isAr ? "الجمهور" : "Audience"}</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? "الجميع" : "All"}</SelectItem>
                    <SelectItem value="parents">{isAr ? "أولياء الأمور" : "Parents"}</SelectItem>
                    <SelectItem value="staff">{isAr ? "الموظفون" : "Staff"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sig" checked={requiresSignature} onChange={e => setRequiresSignature(e.target.checked)} className="rounded" />
                <Label htmlFor="sig">{isAr ? "يتطلب توقيع ولي الأمر" : "Requires Parent/Guardian Signature"}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate({ name, type: type as any, url, audience: audience as any, requiresSignature })} disabled={!name || !url || create.isPending}>
                {create.isPending ? "جاري..." : (isAr ? "إضافة" : "Add")}
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
                <TableHead>{isAr ? "المستند" : "Document"}</TableHead>
                <TableHead>{isAr ? "النوع" : "Type"}</TableHead>
                <TableHead>{isAr ? "الجمهور" : "Audience"}</TableHead>
                <TableHead>{isAr ? "التوقيع" : "Signature"}</TableHead>
                <TableHead>{isAr ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
              documents?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isAr ? "لا توجد مستندات" : "No documents"}</TableCell></TableRow> :
              documents?.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{typeLabels[d.type] || d.type}</Badge></TableCell>
                  <TableCell>{audienceLabels[d.audience] || d.audience || isAr ? "الجميع" : "All"}</TableCell>
                  <TableCell>
                    {d.requiresSignature ? (
                      <Badge className="bg-amber-100 text-amber-700 gap-1">
                        <FileCheck className="h-3 w-3" />{isAr ? "يتطلب توقيع" : "Requires Signature"}
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
