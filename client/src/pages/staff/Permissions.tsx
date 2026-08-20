import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Users, FileText, CreditCard, Baby, MessageSquare, ClipboardList, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const PERMISSION_GROUPS = [
  {
    key: "attendance",
    labelAr: "الحضور والانصراف",
    labelEn: "Attendance",
    icon: ClipboardList,
    color: "text-emerald-600",
    permissions: [
      { key: "attendanceAll" as const, labelAr: "تسجيل حضور/انصراف جميع الأطفال", labelEn: "Record attendance for all children" },
    ],
  },
  {
    key: "reports",
    labelAr: "التقارير والخطط",
    labelEn: "Reports & Plans",
    icon: FileText,
    color: "text-blue-600",
    permissions: [
      { key: "reportsAll" as const, labelAr: "إرسال تقارير يومية لجميع الأطفال", labelEn: "Send daily reports for all children" },
      { key: "weeklyPlans" as const, labelAr: "إنشاء خطط أسبوعية", labelEn: "Create weekly plans" },
    ],
  },
  {
    key: "finance",
    labelAr: "المالية",
    labelEn: "Finance",
    icon: CreditCard,
    color: "text-amber-600",
    permissions: [
      { key: "viewInvoices" as const, labelAr: "عرض الفواتير", labelEn: "View invoices" },
      { key: "createInvoices" as const, labelAr: "إنشاء فواتير جديدة", labelEn: "Create new invoices" },
    ],
  },
  {
    key: "children",
    labelAr: "الأطفال",
    labelEn: "Children",
    icon: Baby,
    color: "text-purple-600",
    permissions: [
      { key: "manageChildren" as const, labelAr: "إضافة/تعديل بيانات الأطفال", labelEn: "Add/edit children data" },
      { key: "viewAllChildren" as const, labelAr: "عرض جميع الأطفال", labelEn: "View all children" },
    ],
  },
  {
    key: "communication",
    labelAr: "التواصل",
    labelEn: "Communication",
    icon: MessageSquare,
    color: "text-pink-600",
    permissions: [
      { key: "sendMessages" as const, labelAr: "إرسال رسائل لأولياء الأمور", labelEn: "Send messages to parents" },
    ],
  },
];

const roleLabelsAr: Record<string, string> = {
  admin: "مدير",
  principal: "مدير حضانة",
  teacher: "معلمة",
  assistant: "مساعدة",
  accountant: "محاسبة",
  receptionist: "استقبال",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  principal: "bg-blue-100 text-blue-800",
  teacher: "bg-green-100 text-green-800",
  assistant: "bg-teal-100 text-teal-800",
  accountant: "bg-orange-100 text-orange-800",
  receptionist: "bg-pink-100 text-pink-800",
};

export default function Permissions() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const utils = trpc.useUtils();

  const { data: staffList, isLoading } = trpc.permissions.listStaffPermissions.useQuery();

  const updatePermission = trpc.permissions.updatePermission.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الصلاحية" : "Permission updated");
      utils.permissions.listStaffPermissions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#7C3AED]" />
          {isAr ? "إدارة الصلاحيات" : "Permissions Management"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? "تحكمي بصلاحيات كل موظفة — فعّلي أو عطّلي أي صلاحية حسب الحاجة" : "Control each staff member's permissions — enable or disable as needed"}
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-blue-700">
            {isAr
              ? "💡 المديرة والمدير لديهم جميع الصلاحيات تلقائياً. هنا تقدرين تتحكمين بصلاحيات المعلمات والموظفات."
              : "💡 Admins and principals have all permissions by default. Here you can control teacher and staff permissions."}
          </p>
        </CardContent>
      </Card>

      {/* Staff List */}
      {(!staffList || staffList.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">{isAr ? "لا يوجد موظفات لإدارة صلاحياتهن" : "No staff members to manage"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {staffList.map((staff) => (
            <Card key={staff.userId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {staff.userName?.charAt(0) || "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">{staff.userName || "—"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{staff.userEmail || ""}</p>
                  </div>
                  <Badge variant="secondary" className={roleColors[staff.role] || "bg-gray-100"}>
                    {isAr ? (roleLabelsAr[staff.role] || staff.role) : staff.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.key} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <group.icon className={`w-4 h-4 ${group.color}`} />
                        <span className="text-sm font-semibold">{isAr ? group.labelAr : group.labelEn}</span>
                      </div>
                      {group.permissions.map((perm) => (
                        <div key={perm.key} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground leading-tight">
                            {isAr ? perm.labelAr : perm.labelEn}
                          </span>
                          <Switch
                            checked={staff.permissions[perm.key]}
                            onCheckedChange={(checked) => {
                              updatePermission.mutate({
                                userId: staff.userId,
                                permission: perm.key,
                                enabled: checked,
                              });
                            }}
                            disabled={updatePermission.isPending}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
