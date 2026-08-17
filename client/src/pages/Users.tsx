import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Trash2, UserPlus, Users, GraduationCap, UserCheck, UserX, Link2, Unlink, Download, FileSpreadsheet, FileText, KeyRound, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { saveOrShareFile } from "@/lib/fileExport";

type UserRole = "admin" | "principal" | "teacher" | "parent" | "assistant" | "accountant" | "receptionist";
type UserForm = { name: string; email: string; phone: string; role: UserRole; password: string };
const emptyForm: UserForm = { name: "", email: "", phone: "", role: "teacher", password: "" };

export default function UsersPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);

  const { data: users, isLoading } = trpc.users.list.useQuery({ role: roleFilter, search: search || undefined });
  const { data: unlinkedChildren } = trpc.users.getUnlinkedChildren.useQuery(undefined, { enabled: linkOpen });
  const { data: linkedChildren } = trpc.users.getChildren.useQuery(
    { parentId: selectedUser?.id ?? 0 },
    { enabled: linkOpen && selectedUser?.role === 'parent' }
  );

  const utils = trpc.useUtils();

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success(isAr ? "تم إنشاء الحساب بنجاح" : "Account created successfully"); setCreateOpen(false); setForm(emptyForm); },
    onError: (err) => toast.error(err.message || isAr ? "حدث خطأ أثناء الإنشاء" : "An error occurred during creation"),
  });
  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success(isAr ? "تم تحديث البيانات بنجاح" : "Data updated successfully"); setEditOpen(false); setSelectedUser(null); },
    onError: (err) => toast.error(err.message || isAr ? "حدث خطأ أثناء التحديث" : "An error occurred during update"),
  });
  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success(isAr ? "تم حذف الحساب بنجاح" : "Account deleted successfully"); setDeleteOpen(false); setSelectedUser(null); },
    onError: (err) => toast.error(err.message || isAr ? "حدث خطأ أثناء الحذف" : "An error occurred during deletion"),
  });
  const linkChild = trpc.users.linkChild.useMutation({
    onSuccess: () => { utils.users.getChildren.invalidate(); utils.users.getUnlinkedChildren.invalidate(); toast.success(isAr ? "تم ربط الطفل بنجاح" : "Child linked successfully"); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء الربط" : "Error while linking"),
  });
  const unlinkChild = trpc.users.unlinkChild.useMutation({
    onSuccess: () => { utils.users.getChildren.invalidate(); utils.users.getUnlinkedChildren.invalidate(); toast.success(isAr ? "تم إلغاء الربط" : "Unlinked"); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إلغاء الربط" : "Error while unlinking"),
  });

  const toggleActive = trpc.users.update.useMutation({
    onSuccess: (_, vars) => {
      utils.users.list.invalidate();
      toast.success(vars.isActive ? isAr ? "تم تفعيل الحساب" : "Account Activated" : isAr ? "تم تعطيل الحساب" : "Account disabled");
    },
    onError: (err) => toast.error(err.message),
  });
  const resendInvitation = trpc.users.resendInvitation.useMutation({
    onSuccess: () => toast.success(isAr ? "تم إرسال الدعوة بنجاح ✉️" : "Invitation sent successfully"),
    onError: (err: any) => toast.error(err.message || (isAr ? "فشل إرسال الدعوة" : "Failed to send invitation")),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean email from whitespace and invisible RTL/LTR characters
    const cleanEmail = form.email.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\s]/g, '').trim();
    const cleanPhone = form.phone.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
    createUser.mutate({ ...form, email: cleanEmail, phone: cleanPhone || undefined, password: form.password || undefined });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const cleanEmail = editForm.email.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\s]/g, '').trim();
    const cleanPhone = editForm.phone.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
    updateUser.mutate({
      id: selectedUser.id,
      ...editForm,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      password: editForm.password || undefined,
    });
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setEditForm({ name: user.name || "", email: user.email || "", phone: user.phone || "", role: user.role, password: "" });
    setEditOpen(true);
  };

  const openDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const openLink = (user: any) => {
    setSelectedUser(user);
    setLinkOpen(true);
  };

  const stats = useMemo(() => {
    if (!users) return { total: 0, teachers: 0, parents: 0 };
    return {
      total: users.length,
      teachers: users.filter((u: any) => u.role === 'teacher').length,
      parents: users.filter((u: any) => u.role === 'parent').length,
    };
  }, [users]);

    const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': case 'super_admin': return <Badge className="bg-red-100 text-red-800 border-red-200">{isAr ? "مدير" : "Manager"}</Badge>;
      case 'principal': return <Badge className="bg-purple-100 text-purple-800 border-purple-200">{isAr ? "مدير/ة" : "Manager"}</Badge>;
      case 'teacher': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{isAr ? "معلم/ة" : "Teacher"}</Badge>;
      case 'assistant': return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">{isAr ? "مساعد/ة" : "Assistant"}</Badge>;
      case 'parent': return <Badge className="bg-green-100 text-green-800 border-green-200">{isAr ? "ولي أمر" : "Parent"}</Badge>;
      case 'accountant': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">{isAr ? "محاسب/ة" : "Accountant"}</Badge>;
      case 'receptionist': return <Badge className="bg-teal-100 text-teal-800 border-teal-200">{isAr ? "استقبال" : "Reception"}</Badge>;
      case 'user': return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">{isAr ? "بانتظار التعيين" : "Awaiting Assignment"}</Badge>;
      default: return <Badge variant="outline">{isAr ? "مستخدم" : "User"}</Badge>;
    }
  };
  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': case 'super_admin': return isAr ? 'مدير' : 'Manager';
      case 'principal': return isAr ? 'مدير/ة' : 'Manager';
      case 'teacher': return isAr ? 'معلم/ة' : 'Teacher';
      case 'assistant': return isAr ? 'مساعد/ة' : 'Assistant';
      case 'parent': return isAr ? 'ولي أمر' : 'Parent/Guardian';
      case 'accountant': return isAr ? 'محاسب/ة' : 'Accountant';
      case 'receptionist': return isAr ? 'استقبال' : 'Reception';
      case 'user': return isAr ? 'بانتظار التعيين' : 'Awaiting Assignment';
      default: return isAr ? 'مستخدم' : 'User';
    }
  };

  const getExportData = useCallback(() => {
    if (!users || users.length === 0) return [];
    return users.map((user: any) => ({
      [isAr ? 'الاسم' : 'Name']: user.name || '—',
      [isAr ? 'البريد الإلكتروني' : 'Email']: user.email || '—',
      [isAr ? 'رقم الهاتف' : 'Phone Number']: user.phone || '—',
      [isAr ? 'الدور' : 'Role']: getRoleText(user.role),
      [isAr ? 'تاريخ الإنشاء' : 'Creation Date']: new Date(user.createdAt).toLocaleDateString('ar-SA'),
    }));
  }, [users]);

  const exportToExcel = useCallback(async () => {
    const data = getExportData();
    if (data.length === 0) { toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'المستخدمون' : 'Users');
    try {
      const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const result = await saveOrShareFile(
        bytes,
        `${isAr ? "قائمة" : "List"}_${isAr ? "المستخدمين" : "Users"}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isAr ? 'قائمة المستخدمين' : 'Users list',
      );
      if (result !== 'cancelled') toast.success(isAr ? 'تم تجهيز الملف للحفظ' : 'File ready to save');
    } catch {
      toast.error(isAr ? 'تعذّر تصدير الملف' : 'Could not export the file');
    }
  }, [getExportData, isAr]);

  const exportToCSV = useCallback(async () => {
    const data = getExportData();
    if (data.length === 0) { toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const bom = '\uFEFF';
    try {
      const result = await saveOrShareFile(
        bom + csv,
        `${isAr ? "قائمة" : "List"}_${isAr ? "المستخدمين" : "Users"}_${new Date().toISOString().slice(0, 10)}.csv`,
        'text/csv;charset=utf-8',
        isAr ? 'قائمة المستخدمين' : 'Users list',
      );
      if (result !== 'cancelled') toast.success(isAr ? 'تم تجهيز الملف للحفظ' : 'File ready to save');
    } catch {
      toast.error(isAr ? 'تعذّر تصدير الملف' : 'Could not export the file');
    }
  }, [getExportData, isAr]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "إدارة المستخدمين" : "User Management"}</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {isAr ? "تصدير" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                تصدير Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                تصدير CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {isAr ? "إضافة مستخدم" : "Add User"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي المستخدمين" : "Total Users"}</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "المعلمات" : "Teachers"}</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stats.teachers}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "أولياء الأمور" : "Parents"}</p>
                <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stats.parents}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAr ? "بحث بالاسم أو البريد أو الهاتف..." : "Search by Name, Email, or Phone..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isAr ? "جميع الأدوار" : "All Roles"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "جميع الأدوار" : "All Roles"}</SelectItem>
                <SelectItem value="admin">{isAr ? "المشرفون" : "Supervisors"}</SelectItem>
                <SelectItem value="principal">{isAr ? "المديرون" : "Managers"}</SelectItem>
                <SelectItem value="teacher">{isAr ? "المعلمات" : "Teachers"}</SelectItem>
                <SelectItem value="assistant">{isAr ? "المساعدات" : "Assistance"}</SelectItem>
                <SelectItem value="parent">{isAr ? "أولياء الأمور" : "Parents"}</SelectItem>
                <SelectItem value="accountant">{isAr ? "المحاسبين" : "Accountants"}</SelectItem>
                <SelectItem value="receptionist">{isAr ? "الاستقبال" : "Reception"}</SelectItem>
                <SelectItem value="user">{isAr ? "بانتظار التعيين" : "Awaiting Assignment"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{isAr ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="text-right">{isAr ? "البريد الإلكتروني" : "Email"}</TableHead>
                  <TableHead className="text-right">{isAr ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead className="text-right">{isAr ? "الدور" : "Role"}</TableHead>
                  <TableHead className="text-right">{isAr ? "تاريخ الإنشاء" : "Creation Date"}</TableHead>
                  <TableHead className="text-right">{isAr ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{user.name || "—"}</span>
                        {!user.hasPassword && (
                          <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            {isAr ? "بحاجة كلمة مرور" : "Password needed"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{user.phone || "—"}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title={isAr ? "تعديل" : "Edit"}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.role === 'parent' && (
                          <Button variant="ghost" size="icon" onClick={() => openLink(user)} title={isAr ? "ربط الأطفال" : "Link Children"}>
                            <Link2 className="h-4 w-4" />
                          </Button>
                        )}
                        {user.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => resendInvitation.mutate({ userId: user.id })}
                            disabled={resendInvitation.isPending}
                            title={isAr ? "إعادة إرسال الدعوة" : "Resend Invitation"}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                            title={user.isActive !== false ? isAr ? "تعطيل" : "Disable" : isAr ? "تفعيل" : "Activate"}
                            className={user.isActive !== false ? "text-orange-500 hover:text-orange-700" : "text-green-500 hover:text-green-700"}
                          >
                            {user.isActive !== false ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        )}
                        {user.role !== 'admin' && (
                          <Button variant="ghost" size="icon" onClick={() => openDelete(user)} title={isAr ? "حذف" : "Delete"} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{isAr ? "لا يوجد مستخدمون" : "No users"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة مستخدم جديد" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "الاسم الكامل" : "Full Name"}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "رقم الهاتف" : "Phone Number"}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+966xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الدور" : "Role"}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{isAr ? "مشرف/ة" : "Supervisor"}</SelectItem>
                  <SelectItem value="principal">{isAr ? "مدير/ة" : "Manager"}</SelectItem>
                  <SelectItem value="teacher">{isAr ? "معلم/ة" : "Teacher"}</SelectItem>
                  <SelectItem value="assistant">{isAr ? "مساعد/ة" : "Assistant"}</SelectItem>
                  <SelectItem value="parent">{isAr ? "ولي أمر" : "Parent"}</SelectItem>
                  <SelectItem value="accountant">{isAr ? "محاسب/ة" : "Accountant"}</SelectItem>
                  <SelectItem value="receptionist">{isAr ? "موظف/ة استقبال" : "Receptionist"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "كلمة المرور" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" placeholder={isAr ? "أدخل كلمة المرور" : "Enter Password"} />
              <p className="text-xs text-muted-foreground">{isAr ? "إذا لم تُدخل كلمة مرور، سيتم إرسال رابط تفعيل بالبريد" : "If no password is entered, an activation link will be sent by email"}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? (isAr ? "جاري الإنشاء..." : "Creating...") : "إنشاء الحساب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل بيانات المستخدم" : "Edit User Data"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "الاسم الكامل" : "Full Name"}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "رقم الهاتف" : "Phone Number"}</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" placeholder="+966xxxxxxxxx" />
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#009E93]" />
                {selectedUser?.hasPassword
                  ? isAr ? "تعيين كلمة مرور جديدة (اختياري)" : "Set a new password (optional)"
                  : isAr ? "تعيين كلمة مرور للحساب" : "Set an account password"}
              </Label>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                dir="ltr"
                placeholder={isAr ? "6 أحرف على الأقل" : "At least 6 characters"}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {isAr
                  ? "اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية. عند إدخال قيمة جديدة ستُحفظ مشفرة ولن تظهر مرة أخرى."
                  : "Leave blank to keep the current password. A new value is securely hashed and will not be shown again."}
              </p>
            </div>
            {selectedUser?.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label>{isAr ? "الدور" : "Role"}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{isAr ? "مشرف/ة" : "Supervisor"}</SelectItem>
                    <SelectItem value="principal">{isAr ? "مدير/ة" : "Manager"}</SelectItem>
                    <SelectItem value="teacher">{isAr ? "معلم/ة" : "Teacher"}</SelectItem>
                    <SelectItem value="assistant">{isAr ? "مساعد/ة" : "Assistant"}</SelectItem>
                    <SelectItem value="parent">{isAr ? "ولي أمر" : "Parent"}</SelectItem>
                    <SelectItem value="accountant">{isAr ? "محاسب/ة" : "Accountant"}</SelectItem>
                    <SelectItem value="receptionist">{isAr ? "موظف/ة استقبال" : "Receptionist"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? isAr ? "جاري التحديث..." : "Updating..." : isAr ? "حفظ التعديلات" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{isAr ? "تأكيد الحذف" : "Confirm Deletion"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            هل أنت متأكد من حذف حساب <span className="font-bold text-foreground">{selectedUser?.name}</span>؟
            {isAr ? "سيتم إلغاء ربط جميع الأطفال المرتبطين بهذا الحساب." : "All children linked to this account will be unlinked."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => selectedUser && deleteUser.mutate({ id: selectedUser.id })} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "حذف الحساب" : "Delete Account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Children Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAr ? "ربط الأطفال -" : "Link Children -"} {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Currently linked children */}
            {linkedChildren && linkedChildren.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{isAr ? "الأطفال المرتبطون حالياً" : "Currently Linked Children"}</Label>
                <div className="space-y-2">
                  {linkedChildren.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="font-medium">{child.firstName} {child.lastName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkChild.mutate({ parentId: selectedUser!.id, childId: child.id })}
                        className="text-red-500 hover:text-red-700 gap-1"
                      >
                        <Unlink className="h-3 w-3" />
                        {isAr ? "إلغاء الربط" : "Unlink"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available children to link */}
            {unlinkedChildren && unlinkedChildren.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{isAr ? "أطفال غير مرتبطين (اضغط للربط)" : "Unlinked Children (Click to Link)"}</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {unlinkedChildren.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <span>{child.firstName} {child.lastName}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedUser && linkChild.mutate({ parentId: selectedUser.id, childId: child.id })}
                        className="gap-1"
                      >
                        <Link2 className="h-3 w-3" />
                        {isAr ? "ربط" : "Link"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا يوجد أطفال غير مرتبطين" : "No unlinked children"}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>{isAr ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { Mail } from "lucide-react";
