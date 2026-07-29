import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Building2, Plus, Search, CheckCircle2, Clock, AlertCircle, Ban,
  ArrowUpRight, Edit, Power, PowerOff, Eye, MoreHorizontal,
  MapPin, Phone, Mail, Users, GraduationCap, CreditCard, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function OrganizationsList() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialog, setEditDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ id: number; name: string; newStatus: "active" | "suspended" } | null>(null);

  const utils = trpc.useUtils();

  const { data: orgsData, isLoading } = trpc.superAdmin.listOrganizations.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const updateMutation = trpc.superAdmin.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success(t("common.success"));
      utils.superAdmin.listOrganizations.invalidate();
      setEditDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleStatusMutation = trpc.superAdmin.toggleOrganizationStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.superAdmin.listOrganizations.invalidate();
      setStatusDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteOrgMutation = trpc.superAdmin.deleteOrganization.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.superAdmin.listOrganizations.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: t("superadmin.active"), color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    trial: { label: t("superadmin.trial"), color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
    pending: { label: t("common.loading"), color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
    suspended: { label: t("superadmin.suspended"), color: "bg-red-100 text-red-700 border-red-200", icon: Ban },
  };

  const editionLabels: Record<string, string> = {
    learning_tree: i18n.language === "ar" ? isAr ? "شجرة التعلم" : "Learning Tree" : "Learning Tree",
    nashaa: i18n.language === "ar" ? isAr ? "نشأة" : "Nashaa" : "Nashaa",
  };

  function openEditDialog(org: any) {
    setEditingOrg(org);
    setEditForm({
      name: org.name || "",
      nameAr: org.nameAr || "",
      phone: org.phone || "",
      email: org.email || "",
      city: org.city || "",
      address: org.address || "",
      maxChildren: org.maxChildren || 50,
      maxStaff: org.maxStaff || 20,
      licenseNumber: org.licenseNumber || "",
    });
    setEditDialog(true);
  }

  function handleEditSubmit() {
    if (!editingOrg) return;
    updateMutation.mutate({ id: editingOrg.id, ...editForm });
  }

  function openStatusDialog(org: any) {
    const newStatus = org.status === "suspended" ? "active" : "suspended";
    setStatusTarget({ id: org.id, name: org.nameAr || org.name, newStatus });
    setStatusDialog(true);
  }

  function handleStatusToggle() {
    if (!statusTarget) return;
    toggleStatusMutation.mutate({ id: statusTarget.id, status: statusTarget.newStatus });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("superadmin.manageOrganizations")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {i18n.language === "ar" ? isAr ? "عرض وإدارة جميع الحضانات والمنظمات المسجلة على المنصة" : "View & Manage All Nurseries & Organizations Registered on the Platform" : "View and manage all registered nurseries and organizations"}
          </p>
        </div>
        <Button onClick={() => navigate("/super-admin/organizations/new")} className="rounded-xl shadow-sm">
          <Plus className="w-4 h-4 ml-2" />
          {t("superadmin.createOrganization")}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("superadmin.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl">
                <SelectValue placeholder={t("superadmin.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("superadmin.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("superadmin.active")}</SelectItem>
                <SelectItem value="trial">{t("superadmin.trial")}</SelectItem>
                <SelectItem value="pending">{i18n.language === "ar" ? isAr ? "قيد المراجعة" : "Under Review" : "Pending"}</SelectItem>
                <SelectItem value="suspended">{t("superadmin.suspended")}</SelectItem>
              </SelectContent>
            </Select>
            {orgsData && (
              <div className="text-sm text-muted-foreground">
                {orgsData.total} {t("superadmin.organizations")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#7B61FF]" />
            {t("superadmin.organizations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : orgsData?.organizations && orgsData.organizations.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{t("superadmin.organization")}</TableHead>
                      <TableHead className="text-right">{i18n.language === "ar" ? isAr ? "النوع" : "Type" : "Type"}</TableHead>
                      <TableHead className="text-right">{t("superadmin.edition")}</TableHead>
                      <TableHead className="text-right">{i18n.language === "ar" ? isAr ? "المدينة" : "City" : "City"}</TableHead>
                      <TableHead className="text-right">{t("superadmin.status")}</TableHead>
                      <TableHead className="text-right">{i18n.language === "ar" ? isAr ? "الحد الأقصى" : "Maximum" : "Capacity"}</TableHead>
                      <TableHead className="text-right">{t("superadmin.created")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgsData.organizations.map((org) => {
                      const status = statusConfig[org.status] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={org.id} className="cursor-pointer hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-[#7B61FF]/10 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-[#7B61FF]" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-sm">{org.nameAr}</p>
                                <p className="text-xs text-muted-foreground">{org.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs rounded-lg">
                              {i18n.language === "ar" ? isAr ? "حضانة / روضة" : "Nursery / Kindergarten" : "Nursery"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs rounded-lg">
                              {editionLabels[org.edition] || org.edition}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{org.city || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs rounded-lg ${status.color}`}>
                              <StatusIcon className="w-3 h-3 ml-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {org.maxChildren}
                              <Users className="w-3.5 h-3.5 mr-2" />
                              {org.maxStaff}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {org.createdAt ? new Date(org.createdAt).toLocaleDateString(locale) : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => navigate(`/super-admin/organizations/${org.id}`)}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  {t("superadmin.viewDetails")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(org)}>
                                  <Edit className="w-4 h-4 ml-2" />
                                  {t("common.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openStatusDialog(org)}>
                                  {org.status === "suspended" ? (
                                    <>
                                      <Power className="w-4 h-4 ml-2 text-emerald-600" />
                                      <span className="text-emerald-600">{t("superadmin.activate")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <PowerOff className="w-4 h-4 ml-2 text-red-600" />
                                      <span className="text-red-600">{t("superadmin.suspend")}</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm(isAr ? `هل أنت متأكد من حذف "${org.nameAr}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to permanently delete "${org.name}"? This cannot be undone.`)) {
                                      deleteOrgMutation.mutate({ id: org.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 ml-2 text-red-600" />
                                  <span className="text-red-600">{isAr ? "حذف نهائي" : "Delete"}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {orgsData.organizations.map((org) => {
                  const status = statusConfig[org.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div key={org.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-[#7B61FF]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{org.nameAr}</h3>
                            <p className="text-xs text-muted-foreground">{org.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs rounded-lg ${status.color}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {org.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {org.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" /> {org.maxChildren} {t("superadmin.childrenCount")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {org.maxStaff} {t("superadmin.staffCount")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs h-8" onClick={() => navigate(`/super-admin/organizations/${org.id}`)}>
                          <Eye className="w-3.5 h-3.5 ml-1" />
                          {t("superadmin.viewDetails")}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs h-8" onClick={() => openEditDialog(org)}>
                          <Edit className="w-3.5 h-3.5 ml-1" />
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className={`rounded-lg text-xs h-8 ${org.status === "suspended" ? "text-emerald-600 border-emerald-200" : "text-red-600 border-red-200"}`}
                          onClick={() => openStatusDialog(org)}
                        >
                          {org.status === "suspended" ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination info */}
              {orgsData.totalPages > 1 && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                  {i18n.language === "ar" ? `${isAr ? "صفحة " : "Page"}${orgsData.page} ${isAr ? "من " : "From"}${orgsData.totalPages} (${orgsData.total} منظمة)` : `Page ${orgsData.page} of ${orgsData.totalPages} (${orgsData.total} organizations)`}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">{i18n.language === "ar" ? isAr ? "لا توجد منظمات" : "No organizations" : "No organizations"}</p>
              <p className="text-sm">{i18n.language === "ar" ? isAr ? "لم يتم العثور على منظمات تطابق معايير البحث" : "No organizations matching search criteria found" : "No organizations match the search criteria"}</p>
              <Button className="mt-4 rounded-xl" onClick={() => navigate("/super-admin/organizations/new")}>
                <Plus className="w-4 h-4 ml-2" />
                {t("superadmin.createOrganization")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{i18n.language === "ar" ? isAr ? "تعديل المنظمة" : "Edit Organization" : "Edit Organization"}</DialogTitle>
            <DialogDescription>{i18n.language === "ar" ? isAr ? "تعديل بيانات المنظمة الأساسية" : "Edit Basic Organization Data" : "Edit basic organization data"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("superadmin.organizationNameAr")}</Label>
                <Input value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>{t("superadmin.organizationName")}</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="rounded-lg" type="email" />
              </div>
              <div className="space-y-2">
                <Label>{t("common.phone")}</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{i18n.language === "ar" ? isAr ? "المدينة" : "City" : "City"}</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>{i18n.language === "ar" ? isAr ? "رقم الترخيص" : "License Number" : "License Number"}</Label>
                <Input value={editForm.licenseNumber} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{i18n.language === "ar" ? isAr ? "العنوان" : "Address" : "Address"}</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{i18n.language === "ar" ? isAr ? "الحد الأقصى للأطفال" : "Max Children" : "Max Children"}</Label>
                <Input value={editForm.maxChildren} onChange={(e) => setEditForm({ ...editForm, maxChildren: parseInt(e.target.value) || 0 })} className="rounded-lg" type="number" />
              </div>
              <div className="space-y-2">
                <Label>{i18n.language === "ar" ? isAr ? "الحد الأقصى للموظفين" : "Max Employees" : "Max Staff"}</Label>
                <Input value={editForm.maxStaff} onChange={(e) => setEditForm({ ...editForm, maxStaff: parseInt(e.target.value) || 0 })} className="rounded-lg" type="number" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-lg">{t("common.cancel")}</Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} className="rounded-lg">
              {updateMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.newStatus === "active" ? t("superadmin.activate") : t("superadmin.suspend")}
            </DialogTitle>
            <DialogDescription>
              {statusTarget?.newStatus === "active"
                ? (i18n.language === "ar" ? `${isAr ? "هل أنت متأكد من تفعيل " : "Are you sure you want to activate"}"${statusTarget?.name}"؟` : `Are you sure you want to activate "${statusTarget?.name}"?`)
                : (i18n.language === "ar" ? `${isAr ? "هل أنت متأكد من تعليق " : "Are you sure you want to suspend"}"${statusTarget?.name}"؟` : `Are you sure you want to suspend "${statusTarget?.name}"?`)
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)} className="rounded-lg">{t("common.cancel")}</Button>
            <Button
              onClick={handleStatusToggle}
              disabled={toggleStatusMutation.isPending}
              className={`rounded-lg ${statusTarget?.newStatus === "suspended" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {toggleStatusMutation.isPending ? t("common.loading") : statusTarget?.newStatus === "active" ? t("superadmin.activate") : t("superadmin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
