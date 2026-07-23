import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Heart, AlertTriangle, Pill, Phone, Plus, Stethoscope, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function ChildMedicalCard({ child }: { child: any }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: medicalInfo, isLoading: medLoading } = trpc.medicalInfo.get.useQuery({ childId: child.id });
  const { data: emergencyContacts, isLoading: ecLoading } = trpc.emergencyContacts.list.useQuery({ childId: child.id });
  const utils = trpc.useUtils();

  const [ecOpen, setEcOpen] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPickup, setEcPickup] = useState(false);

  const createContact = trpc.emergencyContacts.create.useMutation({
    onSuccess: () => {
      utils.emergencyContacts.list.invalidate({ childId: child.id });
      setEcOpen(false);
      setEcName(""); setEcPhone(""); setEcRelationship(""); setEcPickup(false);
      toast.success(isAr ? "تمت إضافة جهة الاتصال" : "Contact added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteContact = trpc.emergencyContacts.delete.useMutation({
    onSuccess: () => {
      utils.emergencyContacts.list.invalidate({ childId: child.id });
      toast.success(isAr ? "تم حذف جهة الاتصال" : "Contact deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {child.photo ? (
            <img src={child.photo} alt={`${child.firstName} ${child.lastName}`} className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
          )}
          {child.firstName} {child.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Medical Information */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            {isAr ? "المعلومات الطبية" : "Medical Information"}
          </h3>
          {medLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Heart className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{isAr ? "الحالات الصحية" : "Medical Conditions"}</p>
                  <p className="text-sm text-muted-foreground">{medicalInfo?.conditions || child.medicalNotes || (isAr ? "لا يوجد" : "None")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{isAr ? "الحساسية" : "Allergies"}</p>
                  <p className="text-sm text-muted-foreground">{medicalInfo?.allergies || child.allergies || (isAr ? "لا يوجد" : "None")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Pill className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{isAr ? "الأدوية" : "Medications"}</p>
                  <p className="text-sm text-muted-foreground">{medicalInfo?.medications || (isAr ? "لا يوجد" : "None")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{isAr ? "التأمين الصحي" : "Health Insurance"}</p>
                  <p className="text-sm text-muted-foreground">{medicalInfo?.insuranceInfo || (isAr ? "غير محدد" : "Not Specified")}</p>
                </div>
              </div>
              {child.bloodType && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Heart className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{isAr ? "فصيلة الدم" : "Blood Type"}</p>
                    <p className="text-sm text-muted-foreground">{child.bloodType}</p>
                  </div>
                </div>
              )}
              {medicalInfo?.doctorName && (
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{isAr ? "الطبيب المعالج" : "Attending Physician"}</p>
                    <p className="text-sm text-muted-foreground">{medicalInfo.doctorName} {medicalInfo.doctorPhone ? `- ${medicalInfo.doctorPhone}` : ""}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-red-500" />
              {isAr ? "جهات الاتصال الطارئة" : "Emergency Contacts"}
            </h3>
            <Dialog open={ecOpen} onOpenChange={setEcOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" />{isAr ? "إضافة" : "Add"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isAr ? "إضافة جهة اتصال طارئة" : "Add Emergency Contact"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>{isAr ? "الاسم" : "Name"}</Label><Input value={ecName} onChange={e => setEcName(e.target.value)} placeholder="اسم جهة الاتصال" /></div>
                  <div><Label>{isAr ? "رقم الهاتف" : "Phone Number"}</Label><Input value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" /></div>
                  <div><Label>{isAr ? "صلة القرابة" : "Relationship"}</Label><Input value={ecRelationship} onChange={e => setEcRelationship(e.target.value)} placeholder="مثال: جد، خالة، عم" /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pickup" checked={ecPickup} onChange={e => setEcPickup(e.target.checked)} className="rounded" />
                    <Label htmlFor="pickup">{isAr ? "مصرح باستلام الطفل" : "Authorized to Pick Up Child"}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createContact.mutate({ childId: child.id, name: ecName, phone: ecPhone, relationship: ecRelationship, isAuthorizedPickup: ecPickup })} disabled={!ecName || !ecPhone || !ecRelationship || createContact.isPending}>
                    {createContact.isPending ? isAr ? "جاري..." : "Processing..." : t("common.add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {ecLoading ? <Skeleton className="h-16 w-full" /> : (
            <div className="space-y-2">
              {emergencyContacts?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد جهات اتصال طارئة مسجلة" : "No emergency contacts registered"}</p>
              ) : emergencyContacts?.map((ec: any) => (
                <div key={ec.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{ec.name}</p>
                      <p className="text-xs text-muted-foreground">{ec.relationship} - <span dir="ltr">{ec.phone}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ec.isAuthorizedPickup && <Badge variant="secondary" className="text-xs">{isAr ? "مصرح بالاستلام" : "Authorized for Pickup"}</Badge>}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteContact.mutate({ id: ec.id })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentMedical() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { i18n: _i18n } = useTranslation();
  const isAr = _i18n.language === 'ar';

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAr ? "المعلومات الطبية وجهات الطوارئ" : "Medical & Emergency Contacts"}</h1>
      {children?.map((child: any) => (
        <ChildMedicalCard key={child.id} child={child} />
      ))}
      {(!children || children.length === 0) && (
        <p className="text-center text-muted-foreground py-8">{isAr ? "لا يوجد أطفال مسجلون" : "No children registered"}</p>
      )}
    </div>
  );
}
