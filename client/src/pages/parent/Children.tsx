import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Baby, Heart, Phone, AlertTriangle, User } from "lucide-react";

function ChildEmergencyContacts({ childId }: { childId: number }) {
  const { data: contacts, isLoading } = trpc.emergencyContacts.list.useQuery({ childId });
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!contacts || contacts.length === 0) return <p className="text-sm text-muted-foreground">لا توجد جهات اتصال طارئة مسجلة</p>;
  return (
    <div className="space-y-2">
      {contacts.map((ec: any) => (
        <div key={ec.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{ec.name} ({ec.relationship})</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{ec.phone}</p>
          </div>
          {ec.isAuthorizedPickup && <Badge variant="secondary" className="text-xs mr-auto">مصرح بالاستلام</Badge>}
        </div>
      ))}
    </div>
  );
}

export default function ParentChildren() {
  const { data: children, isLoading } = trpc.children.list.useQuery();

  if (isLoading) return <div className="space-y-4">{Array.from({length:2}).map((_,i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">أطفالي</h1>
      {children?.map((child: any) => (
        <Card key={child.id}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Baby className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{child.firstName} {child.lastName}</CardTitle>
                <p className="text-sm text-muted-foreground">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('ar-SA') : ""}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList><TabsTrigger value="info">المعلومات</TabsTrigger><TabsTrigger value="medical">الطبية</TabsTrigger><TabsTrigger value="emergency">الطوارئ</TabsTrigger></TabsList>
              <TabsContent value="info" className="space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">الجنس:</span> <span>{child.gender === "male" ? "ذكر" : "أنثى"}</span></div>
                  <div><span className="text-muted-foreground">فصيلة الدم:</span> <span>{child.bloodType || "-"}</span></div>
                  <div><span className="text-muted-foreground">الفصل:</span> <span>{child.classId || "غير محدد"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="medical" className="mt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" /><span>الحالات الصحية: {child.medicalNotes || "لا يوجد"}</span></div>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span>الحساسية: {child.allergies || "لا يوجد"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="emergency" className="mt-4">
                <ChildEmergencyContacts childId={child.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
