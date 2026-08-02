import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowLeft, Users, GraduationCap, Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ClassDetail() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const params = useParams<{ id: string }>();
  const classId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const { data: classInfo, isLoading: classLoading } = trpc.classes.getById.useQuery({ id: classId });
  const { data: children, isLoading: childrenLoading } = trpc.classes.children.useQuery({ classId });

  if (classLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="text-6xl">📚</div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          {isAr ? "الفصل غير موجود" : "Class not found"}
        </h2>
        <Button variant="outline" onClick={() => navigate("/staff/classes")}>
          {isAr ? (
            <>العودة للفصول <ArrowLeft className="h-4 w-4 mr-2" /></>
          ) : (
            <><ArrowRight className="h-4 w-4 ml-2" /> Back to Classes</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/staff/classes")}>
          {isAr ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{classInfo.name}</h1>
          {classInfo.nameAr && <p className="text-muted-foreground">{classInfo.nameAr}</p>}
        </div>
      </div>

      {/* Class Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "عدد الأطفال" : "Children"}</p>
              <p className="text-2xl font-bold">{children?.length || 0} / {classInfo.capacity}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "الفئة العمرية" : "Age Group"}</p>
              <p className="text-2xl font-bold">{classInfo.ageGroup || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "المعلمة" : "Teacher"}</p>
              <p className="text-lg font-semibold">{(classInfo as any).teacherName || (isAr ? "غير محدد" : "Unassigned")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isAr ? "أطفال الفصل" : "Class Children"}
            <Badge variant="secondary" className="mr-2">{children?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {childrenLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !children || children.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-4">👶</div>
              <p className="text-muted-foreground">
                {isAr ? "لا يوجد أطفال مسجلين في هذا الفصل" : "No children enrolled in this class"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child: any) => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/staff/children/${child.id}`)}
                >
                  <Avatar className="h-10 w-10">
                    {child.photo ? (
                      <AvatarImage src={child.photo} alt={child.firstName} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(child.firstName?.[0] || "").toUpperCase()}{(child.lastName?.[0] || "").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {child.arabicName || `${child.firstName} ${child.lastName}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {child.gender === "male" ? (isAr ? "ذكر" : "Male") : (isAr ? "أنثى" : "Female")}
                      {child.dateOfBirth && ` • ${new Date(child.dateOfBirth).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={child.status === "active" ? "default" : "secondary"}>
                      {child.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                    </Badge>
                    {isAr ? <ArrowLeft className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
