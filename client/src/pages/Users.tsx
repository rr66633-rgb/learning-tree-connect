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
import { Plus, Search, Pencil, Trash2, UserPlus, Users, GraduationCap, UserCheck, UserX, Link2, Unlink, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء الإنشاء"),
  });
  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success(isAr ? "تم تحديث البيانات بنجاح" : "Data updated successfully"); setEditOpen(false); setSelectedUser(null); },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء التحديث"),
  });
  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success(isAr ? "تم حذف الحساب بنجاح" : "Account deleted successfully"); setDeleteOpen(false); setSelectedUser(null); },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء الحذف"),
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
      toast.success(vars.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    },
    onError: (err) => toast.error(err.message),
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
    updateUser.mutate({ id: selectedUser.id, ...editForm, email: cleanEmail, phone: cleanPhone || undefined });
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
      case 'admin': case 'super_admin': return <Badge className="bg-red-100 text-red-800 border-red-200">مدير</Badge>;
      case 'principal': return <Badge className="bg-purple-100 text-purple-800 border-purple-200">مدير/ة</Badge>;
      case 'teacher': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">معلم/ة</Badge>;
      case 'assistant': return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">مساعد/ة</Badge>;
      case 'parent': return <Badge className="bg-green-100 text-green-800 border-green-200">ولي أمر</Badge>;
      case 'accountant': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">محاسب/ة</Badge>;
      case 'receptionist': return <Badge className="bg-teal-100 text-teal-800 border-teal-200">استقبال</Badge>;
      case 'user': return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">بانتظار التعيين</Badge>;
      default: return <Badge variant="outline">مستخدم</Badge>;
    }
  };
  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': case 'super_admin': return 'مدير';
      case 'principal': return 'مدير/ة';
      case 'teacher': return 'معلم/ة';
      case 'assistant': return 'مساعد/ة';
      case 'parent': return 'ولي أمر';
      case 'accountant': return 'محاسب/ة';
      case 'receptionist': return 'استقبال';
      case 'user': return 'بانتظار التعيين';
      default: return 'مستخدم';
    }
  };

  const getExportData = useCallback(() => {
    if (!users || users.length === 0) return [];
    return users.map((user: any) => ({
      'الاسم': user.name || '—',
      'البريد الإلكتروني': user.email || '—',
      'رقم الهاتف': user.phone || '—',
      'الدور': getRoleText(user.role),
      'تاريخ الإنشاء': new Date(user.createdAt).toLocaleDateString('ar-SA'),
    }));
  }, [users]);

  const exportToExcel = useCallback(() => {
    const data = getExportData();
    if (data.length === 0) { toast.error('لا توجد بيانات للتصدير'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستخدمون');
    XLSX.writeFile(wb, `قائمة_المستخدمين_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('تم تصدير الملف بنجاح');
  }, [getExportData]);

  const exportToCSV = useCallback(() => {
    const data = getExportData();
    if (data.length === 0) { toast.error('لا توجد بيانات للتصدير'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قائمة_المستخدمين_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير الملف بنجاح');
  }, [getExportData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير
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
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
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
                <p className="text-sm text-muted-foreground">المعلمات</p>
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
                <p className="text-sm text-muted-foreground">أولياء الأمور</p>
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
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="جميع الأدوار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="admin">المشرفون</SelectItem>
                <SelectItem value="principal">المديرون</SelectItem>
                <SelectItem value="teacher">المعلمات</SelectItem>
                <SelectItem value="assistant">المساعدات</SelectItem>
                <SelectItem value="parent">أولياء الأمور</SelectItem>
                <SelectItem value="accountant">المحاسبين</SelectItem>
                <SelectItem value="receptionist">الاستقبال</SelectItem>
                <SelectItem value="user">بانتظار التعيين</SelectItem>
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
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{user.phone || "—"}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="تعديل">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.role === 'parent' && (
                          <Button variant="ghost" size="icon" onClick={() => openLink(user)} title="ربط الأطفال">
                            <Link2 className="h-4 w-4" />
                          </Button>
                        )}
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                            title={user.isActive !== false ? "تعطيل" : "تفعيل"}
                            className={user.isActive !== false ? "text-orange-500 hover:text-orange-700" : "text-green-500 hover:text-green-700"}
                          >
                            {user.isActive !== false ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        )}
                        {user.role !== 'admin' && (
                          <Button variant="ghost" size="icon" onClick={() => openDelete(user)} title="حذف" className="text-red-500 hover:text-red-700">
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
              <p>لا يوجد مستخدمون</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+966xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مشرف/ة</SelectItem>
                  <SelectItem value="principal">مدير/ة</SelectItem>
                  <SelectItem value="teacher">معلم/ة</SelectItem>
                  <SelectItem value="assistant">مساعد/ة</SelectItem>
                  <SelectItem value="parent">ولي أمر</SelectItem>
                  <SelectItem value="accountant">محاسب/ة</SelectItem>
                  <SelectItem value="receptionist">موظف/ة استقبال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" placeholder="أدخل كلمة المرور" />
              <p className="text-xs text-muted-foreground">إذا لم تُدخل كلمة مرور، سيتم إرسال رابط تفعيل بالبريد</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" placeholder="+966xxxxxxxxx" />
            </div>
            {selectedUser?.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مشرف/ة</SelectItem>
                    <SelectItem value="principal">مدير/ة</SelectItem>
                    <SelectItem value="teacher">معلم/ة</SelectItem>
                    <SelectItem value="assistant">مساعد/ة</SelectItem>
                    <SelectItem value="parent">ولي أمر</SelectItem>
                    <SelectItem value="accountant">محاسب/ة</SelectItem>
                    <SelectItem value="receptionist">موظف/ة استقبال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? "جاري التحديث..." : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            هل أنت متأكد من حذف حساب <span className="font-bold text-foreground">{selectedUser?.name}</span>؟
            سيتم إلغاء ربط جميع الأطفال المرتبطين بهذا الحساب.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => selectedUser && deleteUser.mutate({ id: selectedUser.id })} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? "جاري الحذف..." : "حذف الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Children Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>ربط الأطفال - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Currently linked children */}
            {linkedChildren && linkedChildren.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">الأطفال المرتبطون حالياً</Label>
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
                        إلغاء الربط
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available children to link */}
            {unlinkedChildren && unlinkedChildren.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">أطفال غير مرتبطين (اضغط للربط)</Label>
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
                        ربط
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أطفال غير مرتبطين</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
