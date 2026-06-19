import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, UserPlus, Unlink, Calendar, Phone, Heart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ChildProfileProps {
  params: { id: string };
}

export default function ChildProfile({ params }: ChildProfileProps) {
  const childId = parseInt(params.id);
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationship, setRelationship] = useState("parent");

  const { data: child, isLoading, refetch } = trpc.children.getById.useQuery({ id: childId });
  const { data: parents, refetch: refetchParents } = trpc.children.getParents.useQuery({ childId });
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: medicalData } = trpc.medicalInfo.get.useQuery({ childId });

  const updateChild = trpc.children.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات الطفل بنجاح");
      setEditing(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const linkParent = trpc.users.linkChild.useMutation({
    onSuccess: () => {
      toast.success("تم ربط ولي الأمر بنجاح");
      setLinkDialogOpen(false);
      setSelectedParentId("");
      refetchParents();
    },
    onError: (err) => toast.error(err.message),
  });

  const unlinkParent = trpc.users.unlinkChild.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء ربط ولي الأمر");
      refetchParents();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    arabicName: "",
    dateOfBirth: "",
    gender: "" as "" | "male" | "female",
    classId: "",
    allergies: "",
    medicalNotes: "",
  });

  const startEditing = () => {
    if (child) {
      setForm({
        firstName: child.firstName || "",
        lastName: child.lastName || "",
        arabicName: (child as any).arabicName || "",
        dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split("T")[0] : "",
        gender: child.gender || "",
        classId: child.classId?.toString() || "",
        allergies: child.allergies || "",
        medicalNotes: child.medicalNotes || "",
      });
      setEditing(true);
    }
  };

  const handleSave = () => {
    updateChild.mutate({
      id: childId,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      arabicName: form.arabicName || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      classId: form.classId ? parseInt(form.classId) : undefined,
      allergies: form.allergies || undefined,
      medicalNotes: form.medicalNotes || undefined,
    });
  };

  const parentUsers = allUsers?.filter((u: any) => u.role === "parent") || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-destructive">الطفل غير موجود</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/staff/children")}>
          <ArrowRight className="ml-2 h-4 w-4" /> العودة للقائمة
        </Button>
      </div>
    );
  }

  const childName = `${child.firstName} ${child.lastName}`;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/children")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{childName}</h1>
            {(child as any).arabicName && (
              <p className="text-muted-foreground">{(child as any).arabicName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startEditing}>
            <Edit className="ml-2 h-4 w-4" /> تعديل
          </Button>
          <Button onClick={() => setLinkDialogOpen(true)}>
            <UserPlus className="ml-2 h-4 w-4" /> ربط ولي أمر
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
          <TabsTrigger value="parents">أولياء الأمور</TabsTrigger>
          <TabsTrigger value="medical">المعلومات الطبية</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> البيانات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>الاسم الأول</Label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <Label>اسم العائلة</Label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div>
                    <Label>الاسم بالعربي</Label>
                    <Input value={form.arabicName} onChange={(e) => setForm({ ...form, arabicName: e.target.value })} />
                  </div>
                  <div>
                    <Label>تاريخ الميلاد</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                  </div>
                  <div>
                    <Label>الجنس</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "male" | "female" })}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الحساسية</Label>
                    <Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
                  </div>
                  <div>
                    <Label>ملاحظات طبية</Label>
                    <Textarea value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
                  </div>
                  <div className="col-span-full flex gap-2">
                    <Button onClick={handleSave} disabled={updateChild.isPending}>
                      {updateChild.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="الاسم الأول" value={child.firstName} />
                  <InfoRow label="اسم العائلة" value={child.lastName} />
                  <InfoRow label="الاسم بالعربي" value={(child as any).arabicName || "\u2014"} />
                  <InfoRow label="تاريخ الميلاد" value={child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString("ar-SA") : "\u2014"} />
                  <InfoRow label="الجنس" value={child.gender === "male" ? "ذكر" : child.gender === "female" ? "أنثى" : "\u2014"} />
                  <InfoRow label="الحساسية" value={child.allergies || "لا يوجد"} />
                  <InfoRow label="الحالة" value={child.status === "active" ? "نشط" : "مؤرشف"} />
                  <InfoRow label="ملاحظات طبية" value={child.medicalNotes || "\u2014"} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parents Tab */}
        <TabsContent value="parents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> أولياء الأمور المرتبطين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parents && parents.length > 0 ? (
                <div className="space-y-3">
                  {parents.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.email}</p>
                        {p.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</p>}
                        <Badge variant="outline" className="mt-1">
                          {p.relationship === "father" ? "أب" : p.relationship === "mother" ? "أم" : "ولي أمر"}
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => unlinkParent.mutate({ parentId: p.id, childId })}
                      >
                        <Unlink className="ml-1 h-3 w-3" /> إلغاء الربط
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">لا يوجد أولياء أمور مرتبطين بهذا الطفل</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" /> المعلومات الطبية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicalData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="فصيلة الدم" value={(medicalData as any).bloodType || "\u2014"} />
                  <InfoRow label="الحساسية" value={child.allergies || "لا يوجد"} />
                  <InfoRow label="الأدوية" value={(medicalData as any).medications || "لا يوجد"} />
                  <InfoRow label="الحالات المزمنة" value={(medicalData as any).conditions || "لا يوجد"} />
                  <InfoRow label="طبيب الطفل" value={(medicalData as any).doctorName || "\u2014"} />
                  <InfoRow label="هاتف الطبيب" value={(medicalData as any).doctorPhone || "\u2014"} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">لا توجد معلومات طبية مسجلة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link Parent Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ربط ولي أمر بالطفل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ولي الأمر</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger><SelectValue placeholder="اختر ولي الأمر" /></SelectTrigger>
                <SelectContent>
                  {parentUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name} - {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>صلة القرابة</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">أب</SelectItem>
                  <SelectItem value="mother">أم</SelectItem>
                  <SelectItem value="guardian">ولي أمر</SelectItem>
                  <SelectItem value="parent">ولي أمر (عام)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                if (selectedParentId) {
                  linkParent.mutate({ parentId: parseInt(selectedParentId), childId, relationship });
                }
              }}
              disabled={!selectedParentId || linkParent.isPending}
            >
              {linkParent.isPending ? "جاري الربط..." : "ربط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
