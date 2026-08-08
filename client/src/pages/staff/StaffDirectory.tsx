import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import {
  Search, Plus, Users, UserCheck, UserX, Clock, LayoutGrid, List,
  Briefcase, MapPin, Phone, Mail, ChevronLeft, ChevronRight, Filter, Download
} from "lucide-react";
import { toast } from "sonner";
import { saveOrShareFile } from "@/lib/fileExport";

export default function StaffDirectory() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const limit = 12;

  const JOB_TITLES: Record<string, string> = {
    teacher: isAr ? "معلم/ة" : "Teacher",
    supervisor: isAr ? "مشرف/ة" : "Supervisor",
    principal: isAr ? "مدير/ة" : "Principal",
    assistant: isAr ? "مساعد/ة" : "Assistant",
    admin_staff: isAr ? "إداري/ة" : "Admin Staff",
    specialist: isAr ? "أخصائي/ة" : "Specialist",
    accountant: isAr ? "محاسب/ة" : "Accountant",
    receptionist: isAr ? "موظف/ة استقبال" : "Receptionist",
    driver: isAr ? "سائق" : "Driver",
    other: isAr ? "أخرى" : "Other",
  };

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    active: { label: isAr ? "نشط" : "Active", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    inactive: { label: isAr ? "غير نشط" : "Inactive", color: "bg-gray-100 text-gray-800 border-gray-200" },
    on_leave: { label: isAr ? "في إجازة" : "On Leave", color: "bg-amber-100 text-amber-800 border-amber-200" },
    terminated: { label: isAr ? "منتهي" : "Terminated", color: "bg-red-100 text-red-800 border-red-200" },
    resigned: { label: isAr ? "مستقيل" : "Resigned", color: "bg-orange-100 text-orange-800 border-orange-200" },
  };

  const { data, isLoading } = trpc.staffManagement.list.useQuery({
    search: search || undefined,
    jobTitle: jobFilter !== "all" ? jobFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    department: departmentFilter !== "all" ? departmentFilter : undefined,
    page,
    limit,
  });

  const { data: stats } = trpc.staffManagement.getStats.useQuery();
  const { data: departments } = trpc.staffManagement.getDepartments.useQuery();

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? "دليل الموظفين" : "Staff Directory"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "إدارة شاملة لبيانات الموظفين والكادر التعليمي" : "Comprehensive staff and teaching team management"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              const params = new URLSearchParams();
              if (jobFilter !== 'all') params.set('jobTitle', jobFilter);
              if (statusFilter !== 'all') params.set('status', statusFilter);
              if (departmentFilter !== 'all') params.set('department', departmentFilter);
              const url = `/api/export-staff${params.toString() ? '?' + params.toString() : ''}`;
              toast.info(isAr ? 'جاري تحميل ملف التصدير...' : 'Downloading export file...');
              try {
                const response = await fetch(url, { credentials: 'include' });
                if (!response.ok) throw new Error(isAr ? 'فشل التصدير' : 'Export failed');
                const result = await saveOrShareFile(
                  await response.blob(),
                  `staff_export_${new Date().toISOString().split('T')[0]}.xlsx`,
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  isAr ? 'بيانات الموظفين' : 'Staff data',
                );
                if (result !== 'cancelled') toast.success(isAr ? 'تم تجهيز الملف للحفظ' : 'File ready to save');
              } catch {
                toast.error(isAr ? 'حدث خطأ أثناء التصدير' : 'Export error');
              }
            }}
          >
            <Download className="h-4 w-4" />
            {isAr ? "تصدير Excel" : "Export Excel"}
          </Button>
          <Button onClick={() => navigate("/staff/staff-management/add")} className="gap-2 bg-[#7C3AED] hover:bg-[#6D28D9]">
            <Plus className="h-4 w-4" />
            {isAr ? "إضافة موظف" : "Add Staff"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-[#00C9B7]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00C9B7]/10">
                <Users className="h-5 w-5 text-[#00C9B7]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الموظفين" : "Total Staff"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active ?? 0}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "نشط" : "Active"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.onLeave ?? 0}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "في إجازة" : "On Leave"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-r-4 border-r-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inactive ?? 0}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "غير نشط" : "Inactive"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAr ? "بحث بالاسم، رقم الهوية، الجوال..." : "Search by name, ID, phone..."}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Select value={jobFilter} onValueChange={(v) => { setJobFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "المسمى الوظيفي" : "Job Title"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                  {Object.entries(JOB_TITLES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={isAr ? "الحالة" : "Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                  {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments && departments.length > 0 && (
                <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={isAr ? "القسم" : "Department"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{isAr ? "لا يوجد موظفين" : "No staff found"}</h3>
            <p className="text-muted-foreground mb-4">{isAr ? "ابدأ بإضافة موظفين جدد للمنظمة" : "Start by adding new staff members"}</p>
            <Button onClick={() => navigate("/staff/staff-management/add")} className="gap-2">
              <Plus className="h-4 w-4" />
              {isAr ? "إضافة موظف" : "Add Staff"}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map((staff: any) => (
            <Card
              key={staff.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-[#7C3AED]/30"
              onClick={() => navigate(`/staff/staff-management/${staff.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-[#7C3AED]/20">
                    {staff.photo ? (
                      <img src={staff.photo} alt={staff.fullNameAr} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <AvatarFallback className="bg-[#7C3AED]/10 text-[#7C3AED] text-lg font-bold">
                        {staff.fullNameAr?.charAt(0) || (isAr ? "م" : "S")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{staff.fullNameAr}</h3>
                    <p className="text-sm text-muted-foreground">{JOB_TITLES[staff.jobTitle] || staff.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={STATUS_MAP[staff.status]?.color || "bg-gray-100"}>
                        {STATUS_MAP[staff.status]?.label || staff.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t space-y-2">
                  {staff.department && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="truncate">{staff.department}</span>
                    </div>
                  )}
                  {staff.branch && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{staff.branch}</span>
                    </div>
                  )}
                  {staff.mobile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span dir="ltr">{staff.mobile}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right p-3 font-medium text-sm">{isAr ? "الموظف" : "Staff"}</th>
                    <th className="text-right p-3 font-medium text-sm hidden md:table-cell">{isAr ? "المسمى الوظيفي" : "Job Title"}</th>
                    <th className="text-right p-3 font-medium text-sm hidden lg:table-cell">{isAr ? "القسم" : "Department"}</th>
                    <th className="text-right p-3 font-medium text-sm hidden lg:table-cell">{isAr ? "الفرع" : "Branch"}</th>
                    <th className="text-right p-3 font-medium text-sm">{isAr ? "الجوال" : "Phone"}</th>
                    <th className="text-right p-3 font-medium text-sm">{isAr ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((staff: any) => (
                    <tr
                      key={staff.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/staff/staff-management/${staff.id}`)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {staff.photo ? (
                              <img src={staff.photo} alt="" className="h-full w-full object-cover rounded-full" />
                            ) : (
                              <AvatarFallback className="bg-[#7C3AED]/10 text-[#7C3AED] text-sm">
                                {staff.fullNameAr?.charAt(0) || (isAr ? "م" : "S")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{staff.fullNameAr}</p>
                            <p className="text-xs text-muted-foreground">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-sm">{JOB_TITLES[staff.jobTitle]}</td>
                      <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">{staff.department || "—"}</td>
                      <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">{staff.branch || "—"}</td>
                      <td className="p-3 text-sm" dir="ltr">{staff.mobile || "—"}</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${STATUS_MAP[staff.status]?.color || "bg-gray-100"}`}>
                          {STATUS_MAP[staff.status]?.label || staff.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
