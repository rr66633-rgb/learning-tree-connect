import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Target, Plus, CheckCircle, Clock, AlertTriangle, TrendingUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const categoryLabels: Record<string, string> = {
  professional: "مهني",
  personal: "شخصي",
  training: "تدريبي",
  project: "مشروع",
};

const categoryColors: Record<string, string> = {
  professional: "bg-blue-100 text-blue-700",
  personal: "bg-purple-100 text-purple-700",
  training: "bg-amber-100 text-amber-700",
  project: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
  overdue: "متأخر",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
  overdue: "destructive",
};

export default function PerformanceGoals() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("professional");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const staffQuery = trpc.staffManagement.list.useQuery({ page: 1, limit: 100 });
  const goalsQuery = trpc.goals.list.useQuery({ userId: selectedUser !== "all" ? Number(selectedUser) : undefined });
  const summaryQuery = trpc.goals.summary.useQuery({ userId: selectedUser !== "all" ? Number(selectedUser) : undefined });
  const utils = trpc.useUtils();

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إضافة الهدف بنجاح" : "Goal added successfully");
      setDialogOpen(false);
      resetForm();
      utils.goals.list.invalidate();
      utils.goals.summary.invalidate();
    },
    onError: () => toast.error(isAr ? "فشل إضافة الهدف" : "Failed to add goal"),
  });

  const updateProgress = trpc.goals.updateProgress.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث التقدم" : "Progress updated");
      utils.goals.list.invalidate();
      utils.goals.summary.invalidate();
    },
  });

  const updateStatus = trpc.goals.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
      utils.goals.list.invalidate();
      utils.goals.summary.invalidate();
    },
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حذف الهدف" : "Goal deleted");
      utils.goals.list.invalidate();
      utils.goals.summary.invalidate();
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("professional");
    setFormTargetDate("");
    setFormUserId("");
    setFormNotes("");
  };

  const handleSave = () => {
    if (!formTitle || !formUserId) {
      toast.error(isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    createGoal.mutate({
      userId: Number(formUserId),
      title: formTitle,
      description: formDescription || undefined,
      category: formCategory as any,
      targetDate: formTargetDate || undefined,
      notes: formNotes || undefined,
    });
  };

  const staff = staffQuery.data?.items || [];
  const goals = goalsQuery.data || [];
  const summary = summaryQuery.data;

  if (goalsQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "أهداف الأداء" : "Performance Goals"}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "إضافة هدف" : "Add Goal"}
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={isAr ? "جميع الموظفين" : "All Employees"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع الموظفين" : "All Employees"}</SelectItem>
            {staff.map((s: any) => (
              <SelectItem key={s.userId} value={String(s.userId)}>
                {s.fullNameAr || s.fullNameEn || `موظف #${s.userId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الأهداف" : "Total Goals"}</p>
                  <p className="text-xl font-bold">{summary.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "نشط" : "Active"}</p>
                  <p className="text-xl font-bold">{summary.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "مكتمل" : "Completed"}</p>
                  <p className="text-xl font-bold">{summary.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "متأخر" : "Overdue"}</p>
                  <p className="text-xl font-bold">{summary.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "متوسط الإنجاز" : "Avg Progress"}</p>
                  <p className="text-xl font-bold">{summary.avgProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isAr ? "لا توجد أهداف مسجلة" : "No goals recorded"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal: any) => {
            const staffMember = staff.find((s: any) => s.userId === goal.userId);
            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{goal.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[goal.category]}`}>
                          {categoryLabels[goal.category]}
                        </span>
                        <Badge variant={statusColors[goal.status]}>
                          {statusLabels[goal.status]}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{isAr ? "الموظف:" : "Employee:"} {staffMember?.fullNameAr || staffMember?.fullNameEn || `#${goal.userId}`}</span>
                        {goal.targetDate && (
                          <span>{isAr ? "الموعد:" : "Due:"} {new Date(goal.targetDate).toLocaleDateString("ar-SA")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={goal.progress} className="flex-1 h-2" />
                        <span className="text-sm font-medium w-12 text-left">{goal.progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {goal.status === "active" && (
                        <>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20"
                            placeholder="%"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = Number((e.target as HTMLInputElement).value);
                                if (val >= 0 && val <= 100) {
                                  updateProgress.mutate({ id: goal.id, progress: val });
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: goal.id, status: "completed" })}
                            title={isAr ? "إكمال" : "Complete"}
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(isAr ? "هل تريد حذف هذا الهدف؟" : "Delete this goal?")) {
                            deleteGoal.mutate({ id: goal.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة هدف جديد" : "Add New Goal"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "الموظف" : "Employee"} *</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر الموظف" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s: any) => (
                    <SelectItem key={s.userId} value={String(s.userId)}>
                      {s.fullNameAr || s.fullNameEn || `موظف #${s.userId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "عنوان الهدف" : "Goal Title"} *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={isAr ? "مثال: إكمال دورة تدريبية" : "e.g. Complete training course"} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={isAr ? "تفاصيل الهدف..." : "Goal details..."} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "التصنيف" : "Category"}</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">{isAr ? "مهني" : "Professional"}</SelectItem>
                    <SelectItem value="personal">{isAr ? "شخصي" : "Personal"}</SelectItem>
                    <SelectItem value="training">{isAr ? "تدريبي" : "Training"}</SelectItem>
                    <SelectItem value="project">{isAr ? "مشروع" : "Project"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الموعد المستهدف" : "Target Date"}</Label>
                <Input type="date" value={formTargetDate} onChange={(e) => setFormTargetDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={isAr ? "ملاحظات إضافية..." : "Additional notes..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={createGoal.isPending}>{isAr ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
