import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, PenLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ParentDocuments() {
  const { data: documents } = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();

  const signDoc = trpc.documents.sign.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("تم التوقيع بنجاح");
    },
    onError: (e) => toast.error(e.message),
  });

  const typeLabels: Record<string, string> = { policy: "سياسة", form: "نموذج", report: "تقرير", certificate: "شهادة", consent: "موافقة", other: "أخرى" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المستندات</h1>
      <div className="space-y-3">
        {documents?.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[d.type] || d.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.requiresSignature && (
                    d.signed ? (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle2 className="h-3 w-3" />تم التوقيع
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => signDoc.mutate({ documentId: d.id })} disabled={signDoc.isPending}>
                        <PenLine className="h-3 w-3" />
                        {signDoc.isPending ? "جاري..." : "توقيع"}
                      </Button>
                    )
                  )}
                  {d.url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={d.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!documents || documents.length === 0) && <p className="text-center text-muted-foreground py-8">لا توجد مستندات</p>}
      </div>
    </div>
  );
}
