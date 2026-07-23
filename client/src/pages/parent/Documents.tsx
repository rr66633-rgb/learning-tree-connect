import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, PenLine, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ParentDocuments() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();

  const signDoc = trpc.documents.sign.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success(isAr ? "تم التوقيع بنجاح" : "Signed successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const typeLabels: Record<string, string> = { policy: t("documentTypes.policy"), form: t("documentTypes.form"), report: t("documentTypes.report"), certificate: t("documentTypes.certificate"), consent: t("documentTypes.consent"), other: t("documentTypes.other") };

  if (isLoading) return <PageSkeleton variant="list" count={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAr ? "المستندات" : "Documents"}</h1>
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
                        <CheckCircle2 className="h-3 w-3" />{isAr ? "تم التوقيع" : "Signed"}
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => signDoc.mutate({ documentId: d.id })} disabled={signDoc.isPending}>
                        <PenLine className="h-3 w-3" />
                        {signDoc.isPending ? isAr ? "جاري..." : "Processing..." : isAr ? "توقيع" : "Signature"}
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
        {(!documents || documents.length === 0) && <EmptyState variant="documents" />}
      </div>
    </div>
  );
}
