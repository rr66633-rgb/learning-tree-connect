import { useBranding, type OrgType } from "@/contexts/BrandingContext";

/**
 * Returns localized labels based on organization type.
 * nursery: أطفال, فصول, حضانة
 * school: طلاب, صفوف, مدرسة
 * independent_teacher: طلاب, فصول, فصلي
 */
export interface OrgLabels {
  orgType: OrgType;
  // Children/Students
  child: string;
  children: string;
  childPlural: string;
  // Classes
  class_: string;
  classes: string;
  // Organization name
  orgName: string;
  orgNamePlural: string;
  // Staff
  staff: string;
  staffPlural: string;
  // Parent
  parent: string;
  parents: string;
  // Attendance
  childAttendance: string;
  // Daily report
  dailyReport: string;
  // Enrollment
  enrollment: string;
  // Dashboard subtitle
  dashboardSubtitle: string;
}

const nurseryLabels: OrgLabels = {
  orgType: "nursery",
  child: "طفل",
  children: "الأطفال",
  childPlural: "أطفال",
  class_: "فصل",
  classes: "الفصول",
  orgName: "الحضانة",
  orgNamePlural: "حضانات",
  staff: "موظف",
  staffPlural: "الموظفين",
  parent: "ولي أمر",
  parents: "أولياء الأمور",
  childAttendance: "حضور الأطفال",
  dailyReport: "التقرير اليومي",
  enrollment: "التسجيل",
  dashboardSubtitle: "إدارة الحضانة",
};

const schoolLabels: OrgLabels = {
  orgType: "school",
  child: "طالب",
  children: "الطلاب",
  childPlural: "طلاب",
  class_: "صف",
  classes: "الصفوف",
  orgName: "المدرسة",
  orgNamePlural: "مدارس",
  staff: "موظف",
  staffPlural: "الموظفين",
  parent: "ولي أمر",
  parents: "أولياء الأمور",
  childAttendance: "حضور الطلاب",
  dailyReport: "التقرير اليومي",
  enrollment: "التسجيل",
  dashboardSubtitle: "إدارة المدرسة",
};

const independentTeacherLabels: OrgLabels = {
  orgType: "independent_teacher",
  child: "طالب",
  children: "الطلاب",
  childPlural: "طلاب",
  class_: "فصل",
  classes: "الفصول",
  orgName: "فصلي",
  orgNamePlural: "فصول",
  staff: "معلمة",
  staffPlural: "المعلمات",
  parent: "ولي أمر",
  parents: "أولياء الأمور",
  childAttendance: "حضور الطلاب",
  dailyReport: "التقرير اليومي",
  enrollment: "إضافة طالب",
  dashboardSubtitle: "إدارة الفصل",
};

export function useOrgLabels(): OrgLabels {
  const { branding } = useBranding();

  switch (branding.orgType) {
    case "school":
      return schoolLabels;
    case "independent_teacher":
      return independentTeacherLabels;
    case "nursery":
    default:
      return nurseryLabels;
  }
}

export function getOrgLabels(orgType: OrgType): OrgLabels {
  switch (orgType) {
    case "school":
      return schoolLabels;
    case "independent_teacher":
      return independentTeacherLabels;
    case "nursery":
    default:
      return nurseryLabels;
  }
}
