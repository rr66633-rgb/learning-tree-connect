import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useMemo } from "react";
import { Users as UsersIcon, Search } from "lucide-react";
import { useTranslation } from "react-i18next";


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
  super_admin: isAr ? "مدير عام" : "General Manager",
  admin: isAr ? "مدير" : "Manager",
  principal: isAr ? "مدير حضانة" : "Nursery Manager",
  teacher: isAr ? "معلمة" : "Teacher (female)",
  assistant: isAr ? "مساعدة" : "Help",
  accountant: isAr ? "محاسب" : "Accountant",
  receptionist: isAr ? "استقبال" : "Reception",
  parent: isAr ? "ولي أمر" : "Parent",
  user: isAr ? "مستخدم" : "User",
  };

  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: orgs, isLoading: orgsLoading } = trpc.superAdmin.listOrganizations.useQuery({});
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: members, isLoading: membersLoading } = trpc.superAdmin.listMembers.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-[#7C3AED]" />
          {isAr ? "المستخدمون" : "Users"}
        </h1>
        <p className="text-muted-foreground mt-1">{isAr ? "إدارة مستخدمي المنظمات" : "Manage Organization Users"}</p>
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
              أعضاء المنظمة ({filteredMembers.length})
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
                {isAr ? "لا يوجد أعضاء" : "No members"}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
