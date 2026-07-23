import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Users,
  GraduationCap,
  School,
  Plus,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  Activity,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = trpc.superAdmin.platformStats.useQuery();
  const { data: orgsData, isLoading: orgsLoading } = trpc.superAdmin.listOrganizations.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: t("superadmin.active"), color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    trial: { label: t("superadmin.trial"), color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
    pending: { label: isAr ? "قيد المراجعة" : "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
    suspended: { label: t("superadmin.suspended"), color: "bg-red-100 text-red-700 border-red-200", icon: Ban },
  };

  const editionLabels: Record<string, string> = {
    learning_tree: isAr ? "شجرة التعلم" : "Learning Tree",
    nashaa: isAr ? "نشأة" : "Nashaa",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? "لوحة تحكم المدير العام" : "General Manager Dashboard"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "إدارة جميع الحضانات والمنظمات على المنصة" : "Manage All Nurseries & Organizations on the Platform"}</p>
        </div>
        <Button
          onClick={() => navigate("/super-admin/organizations/new")}
          className="rounded-xl shadow-sm btn-press"
        >
          <Plus className="w-4 h-4 ml-2" />
          {isAr ? "إضافة حضانة جديدة" : "Add New Nursery"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#00C9B7]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isAr ? "إجمالي المنظمات" : "Total Organizations"}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{stats?.totalOrganizations || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#7B61FF]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isAr ? "المنظمات النشطة" : "Active Organizations"}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{stats?.activeOrganizations || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FF5CA8]/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#FF5CA8]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isAr ? "إجمالي الأطفال" : "Total Children"}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{stats?.totalChildren || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FFB020]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FFB020]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isAr ? "إجمالي المستخدمين" : "Total Users"}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center">
                <School className="w-5 h-5 text-[#00C9B7]" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isAr ? "إجمالي الفصول" : "Total Classes"}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{stats?.totalClasses || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {isAr ? "المنظمات والحضانات" : "Organizations & Nurseries"}
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isAr ? "بحث..." : "Search..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 w-48 rounded-xl"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 rounded-xl">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="active">{isAr ? "نشطة" : "Active"}</SelectItem>
                  <SelectItem value="trial">{isAr ? "تجريبية" : "Trial"}</SelectItem>
                  <SelectItem value="pending">{isAr ? "قيد المراجعة" : "Under Review"}</SelectItem>
                  <SelectItem value="suspended">{isAr ? "معلّقة" : "Pending"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : orgsData?.organizations && orgsData.organizations.length > 0 ? (
            <div className="space-y-2.5">
              {orgsData.organizations.map((org) => {
                const status = statusConfig[org.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={org.id}
                    className="group flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.nameAr}</h3>
                        <p className="text-sm text-muted-foreground">{org.name} {org.city ? `• ${org.city}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs rounded-lg">
                        {editionLabels[org.edition] || org.edition}
                      </Badge>
                      <Badge variant="outline" className={`text-xs rounded-lg ${status.color}`}>
                        <StatusIcon className="w-3 h-3 ml-1" />
                        {status.label}
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{isAr ? "لا توجد منظمات مسجلة" : "No organizations registered"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
