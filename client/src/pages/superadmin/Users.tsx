import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { Users as UsersIcon, Search, Plus, MoreHorizontal, UserMinus, Power, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";


const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800",
  admin: "bg-purple-100 text-purple-800",
  principal: "bg-blue-100 text-blue-800",
  teacher: "bg-green-100 text-green-800",
  assistant: "bg-teal-100 text-teal-800",
  accountant: "bg-orange-100 text-orange-800",
  receptionist: "bg-pink-100 text-pink-800",
  parent: "bg-cyan-100 text-cyan-800",
  user: "bg-gray-100 text-gray-800",
};

export default function SuperAdminUsers() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const roleLabels: Record<string, string> = {
    super_admin: isAr ? "مدير عام" : "Super Admin",
    admin: isAr ? "مدير" : "Admin",
    principal: isAr ? "مدير حضانة" : "Principal",
    teacher: isAr ? "معلمة" : "Teacher",
    assistant: isAr ? "مساعدة" : "Assistant",
    accountant: isAr ? "محاسب" : "Accountant",
    receptionist: isAr ? "استقبال" : "Receptionist",
    parent: isAr ? "ولي أمر" : "Parent",
    user: isAr ? "مستخدم" : "User",
  };

  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const utils = trpc.useUtils();
  const { data: orgs, isLoading: orgsLoading } = trpc.superAdmin.listOrganizations.useQuery({});
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "teacher" as "admin" | "principal" | "teacher" | "assistant" | "accountant" | "receptionist" | "parent",
    password: "",
  });

  const { data: members, isLoading: membersLoading } = trpc.superAdmin.listMembers.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const addMemberMutation = trpc.superAdmin.addMember.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.superAdmin.listMembers.invalidate({ organizationId: selectedOrgId! });
      setAddDialog(false);
      setAddForm({ name: "", email: "", phone: "", role: "teacher", password: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.superAdmin.removeMember.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.superAdmin.listMembers.invalidate({ organizationId: selectedOrgId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleStatusMutation = trpc.superAdmin.toggleMemberStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.superAdmin.listMembers.invalidate({ organizationId: selectedOrgId! });
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-select first org
  useMemo(() => {
    if (orgs?.organizations?.length && !selectedOrgId) {
      setSelectedOrgId(orgs.organizations[0].id);
    }
  }, [orgs, selectedOrgId]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!search) return members;
    const s = search.toLowerCase();
    return members.filter(
      (m: any) =>
        m.userName?.toLowerCase().includes(s) ||
        m.userEmail?.toLowerCase().includes(s) ||
        m.userPhone?.includes(s)
    );
  }, [members, search]);

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    if (!addForm.name.trim()) {
      toast.error(isAr ? "يرجى إدخال الاسم" : "Please enter name");
      return;
    }
    addMemberMutation.mutate({
      organizationId: selectedOrgId,
      name: addForm.name,
      email: addForm.email || undefined,
      phone: addForm.phone || undefined,
      role: addForm.role,
      password: addForm.password || undefined,
    });
  }

  if (orgsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-[#7C3AED]" />
            {isAr ? "المستخدمون" : "Users"}
          </h1>
          <p className="text-muted-foreground mt-1">{isAr ? "إدارة مستخدمي المنظمات" : "Manage Organization Users"}</p>
        </div>
        {selectedOrgId && (
          <Button onClick={() => setAddDialog(true)} className="rounded-xl shadow-sm">
            <Plus className="w-4 h-4 ml-2" />
            {isAr ? "إضافة عضو" : "Add Member"}
          </Button>
        )}
      </div>

      {/* Organization Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={selectedOrgId?.toString() || ""}
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر منظمة..." : "Select Organization..."} />
                </SelectTrigger>
                <SelectContent>
                  {orgs?.organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.nameAr || org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isAr ? "بحث بالاسم أو البريد..." : "Search by Name or Email..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      {selectedOrgId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isAr ? "أعضاء المنظمة" : "Organization Members"} ({filteredMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{isAr ? "لا يوجد أعضاء" : "No members"}</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddDialog(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  {isAr ? "إضافة أول عضو" : "Add First Member"}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{isAr ? "المستخدم" : "User"}</TableHead>
                      <TableHead className="text-right">{isAr ? "البريد الإلكتروني" : "Email"}</TableHead>
                      <TableHead className="text-right">{isAr ? "الهاتف" : "Phone"}</TableHead>
                      <TableHead className="text-right">{isAr ? "الدور" : "Role"}</TableHead>
                      <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-right">{isAr ? "تاريخ الانضمام" : "Join Date"}</TableHead>
                      <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member: any) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {member.userName?.charAt(0) || "؟"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.userName || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {member.userEmail || "—"}
                        </TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {member.userPhone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[member.role] || "bg-gray-100"}>
                            {roleLabels[member.role] || member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? "default" : "destructive"}>
                            {member.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Disabled")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.joinedAt
                            ? new Date(member.joinedAt).toLocaleDateString(locale)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate({
                                  membershipId: member.id,
                                  isActive: !member.isActive,
                                })}
                              >
                                {member.isActive ? (
                                  <>
                                    <PowerOff className="w-4 h-4 ml-2 text-amber-600" />
                                    <span className="text-amber-600">{isAr ? "تعطيل" : "Disable"}</span>
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-4 h-4 ml-2 text-emerald-600" />
                                    <span className="text-emerald-600">{isAr ? "تفعيل" : "Activate"}</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(isAr ? "هل أنت متأكد من إزالة هذا العضو؟" : "Are you sure you want to remove this member?")) {
                                    removeMemberMutation.mutate({ membershipId: member.id });
                                  }
                                }}
                              >
                                <UserMinus className="w-4 h-4 ml-2 text-red-600" />
                                <span className="text-red-600">{isAr ? "إزالة" : "Remove"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة عضو جديد" : "Add New Member"}</DialogTitle>
            <DialogDescription>
              {isAr ? "أضف مستخدم جديد للمنظمة المحددة. إذا كان المستخدم موجود مسبقاً سيتم ربطه بالمنظمة." : "Add a new user to the selected organization. If the user already exists, they will be linked."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <Label>{isAr ? "الاسم *" : "Name *"}</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1.5"
                placeholder={isAr ? "اسم المستخدم" : "User name"}
              />
            </div>
            <div>
              <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                className="mt-1.5"
                placeholder="user@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <Label>{isAr ? "رقم الجوال" : "Phone"}</Label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                className="mt-1.5"
                placeholder="+966..."
                dir="ltr"
              />
            </div>
            <div>
              <Label>{isAr ? "الدور" : "Role"}</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((p) => ({ ...p, role: v as any }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{isAr ? "مدير" : "Admin"}</SelectItem>
                  <SelectItem value="principal">{isAr ? "مدير حضانة" : "Principal"}</SelectItem>
                  <SelectItem value="teacher">{isAr ? "معلمة" : "Teacher"}</SelectItem>
                  <SelectItem value="assistant">{isAr ? "مساعدة" : "Assistant"}</SelectItem>
                  <SelectItem value="accountant">{isAr ? "محاسب" : "Accountant"}</SelectItem>
                  <SelectItem value="receptionist">{isAr ? "استقبال" : "Receptionist"}</SelectItem>
                  <SelectItem value="parent">{isAr ? "ولي أمر" : "Parent"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? "كلمة المرور" : "Password"}</Label>
              <Input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                className="mt-1.5"
                placeholder={isAr ? "اتركه فارغ للافتراضي (1234)" : "Leave empty for default (1234)"}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "كلمة المرور الافتراضية: 1234" : "Default password: 1234"}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialog(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? (isAr ? "جاري الإضافة..." : "Adding...") : (isAr ? "إضافة العضو" : "Add Member")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
