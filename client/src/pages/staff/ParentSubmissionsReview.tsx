import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Camera, AlertTriangle, Clock, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function ParentSubmissionsReview() {
  const [activeTab, setActiveTab] = useState("journals");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reviewType, setReviewType] = useState<"journal" | "observation">("journal");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: pendingJournals, isLoading: journalsLoading, refetch: refetchJournals } =
    trpc.engagement.journal.pendingReviews.useQuery();
  const { data: pendingObservations, isLoading: obsLoading, refetch: refetchObs } =
    trpc.engagement.observations.pendingReview.useQuery();

  const journalReviewMutation = trpc.engagement.journal.review.useMutation({
    onSuccess: () => {
      toast.success("تمت المراجعة بنجاح");
      setReviewDialogOpen(false);
      refetchJournals();
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const observationReviewMutation = trpc.engagement.observations.review.useMutation({
    onSuccess: () => {
      toast.success("تمت المراجعة بنجاح");
      setReviewDialogOpen(false);
      refetchObs();
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const openReviewDialog = (item: any, type: "journal" | "observation") => {
    setSelectedItem(item);
    setReviewType(type);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (reviewType === "journal") {
      journalReviewMutation.mutate({
        entryId: selectedItem.id,
        status: "approved",
        reviewNotes: reviewNotes || undefined,
      });
    } else {
      observationReviewMutation.mutate({
        observationId: selectedItem.id,
        status: "reviewed",
        teacherNotes: reviewNotes || undefined,
      });
    }
  };

  const handleReject = () => {
    if (reviewType === "journal") {
      journalReviewMutation.mutate({
        entryId: selectedItem.id,
        status: "rejected",
        reviewNotes: reviewNotes || undefined,
      });
    } else {
      observationReviewMutation.mutate({
        observationId: selectedItem.id,
        status: "flagged",
        teacherNotes: reviewNotes || undefined,
      });
    }
  };

  const handleLinkToAssessment = () => {
    if (reviewType === "observation") {
      observationReviewMutation.mutate({
        observationId: selectedItem.id,
        status: "linked_to_assessment",
        teacherNotes: reviewNotes || undefined,
      });
    }
  };

  const totalPending = (pendingJournals?.length || 0) + (pendingObservations?.length || 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-teal-500" />
            مراجعة مشاركات الأهالي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            راجع يوميات الإنجاز وملاحظات الأهالي
          </p>
        </div>
        {totalPending > 0 && (
          <Badge className="bg-amber-500 text-lg px-3 py-1">{totalPending} بانتظار المراجعة</Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="journals" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            يوميات الإنجاز
            {pendingJournals && pendingJournals.length > 0 && (
              <Badge variant="secondary" className="text-[10px] mr-1">{pendingJournals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="observations" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            ملاحظات الأهالي
            {pendingObservations && pendingObservations.length > 0 && (
              <Badge variant="secondary" className="text-[10px] mr-1">{pendingObservations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Journals Tab */}
        <TabsContent value="journals" className="space-y-3 mt-4">
          {journalsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : !pendingJournals || pendingJournals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold">لا توجد يوميات بانتظار المراجعة</h3>
                <p className="text-sm text-muted-foreground">جميع اليوميات تمت مراجعتها</p>
              </CardContent>
            </Card>
          ) : (
            pendingJournals.map((entry: any) => (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">{entry.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Clock className="h-3 w-3 ml-1" />
                      {new Date(entry.createdAt).toLocaleDateString("ar-SA")}
                    </Badge>
                  </div>
                  {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                    <div className="flex gap-2">
                      {entry.mediaUrls.slice(0, 3).map((url: string, idx: number) => (
                        <div key={idx} className="h-16 w-16 rounded-lg bg-muted overflow-hidden">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => openReviewDialog(entry, "journal")}
                    >
                      <CheckCircle className="h-3 w-3 ml-1" />
                      مراجعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations" className="space-y-3 mt-4">
          {obsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : !pendingObservations || pendingObservations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold">لا توجد ملاحظات بانتظار المراجعة</h3>
                <p className="text-sm text-muted-foreground">جميع الملاحظات تمت مراجعتها</p>
              </CardContent>
            </Card>
          ) : (
            pendingObservations.map((obs: any) => (
              <Card key={obs.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">{obs.observationText}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{obs.context}</Badge>
                        {obs.significance && obs.significance !== "routine" && (
                          <Badge className={`text-[10px] ${obs.significance === "milestone" ? "bg-purple-600" : obs.significance === "concern" ? "bg-red-600" : "bg-blue-600"}`}>
                            {obs.significance === "milestone" ? "إنجاز" : obs.significance === "concern" ? "قلق" : "تقدم"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(obs.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  {obs.aiAnalysis && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        تحليل AI
                      </p>
                      <p className="text-xs mt-1">
                        {typeof obs.aiAnalysis === "string" ? obs.aiAnalysis : obs.aiAnalysis?.summary || ""}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => openReviewDialog(obs, "observation")}
                    >
                      <CheckCircle className="h-3 w-3 ml-1" />
                      مراجعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewType === "journal" ? "مراجعة يومية الإنجاز" : "مراجعة ملاحظة ولي الأمر"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewType === "journal" ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm">{selectedItem?.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedItem?.description}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">{selectedItem?.observationText}</p>
                <Badge variant="outline" className="text-[10px]">{selectedItem?.context}</Badge>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات المراجعة (اختياري)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="أضف ملاحظاتك..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleReject} className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="h-4 w-4 ml-1" />
              {reviewType === "journal" ? "رفض" : "تمييز"}
            </Button>
            {reviewType === "observation" && (
              <Button variant="outline" onClick={handleLinkToAssessment} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                <Link2 className="h-4 w-4 ml-1" />
                ربط بتقييم
              </Button>
            )}
            <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 ml-1" />
              موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
