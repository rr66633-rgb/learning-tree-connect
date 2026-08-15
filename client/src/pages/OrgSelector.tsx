import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Building2, ChevronLeft, Users, GraduationCap } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Organization Selector Page
 * Shown when a user (owner) has access to multiple organizations.
 * After login, if user has multiple orgs via organizationMembers, they choose which one to enter.
 */
export default function OrgSelector() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: orgs, isLoading } = trpc.auth.myOrganizations.useQuery(undefined, {
    enabled: !!user,
  });
  const switchMutation = trpc.auth.switchOrganization.useMutation({
    onSuccess: () => {
      // Reload the page to get fresh context with new org
      window.location.href = "/staff";
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد حضانات مرتبطة بحسابك</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If only one org, redirect directly
  if (orgs.length === 1) {
    switchMutation.mutate({ organizationId: orgs[0].id });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">اختر الحضانة</h1>
          <p className="text-muted-foreground">لديك صلاحية الوصول لأكثر من حضانة. اختر أي واحدة تريد الدخول إليها.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer hover:border-[#00C9B7] hover:shadow-md transition-all group"
              onClick={() => switchMutation.mutate({ organizationId: org.id })}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center shrink-0">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.nameAr} className="w-10 h-10 rounded-lg object-contain" />
                  ) : (
                    <Building2 className="w-7 h-7 text-[#00C9B7]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{org.nameAr || org.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {org.city && <span>{org.city}</span>}
                    <span className="capitalize">{org.role === "owner" ? "مالك" : org.role === "principal" ? "مدير" : org.role}</span>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-[#00C9B7] transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
