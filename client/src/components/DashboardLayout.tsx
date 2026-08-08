import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { LOGIN_PATH } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, CalendarCheck, FileText,
  MessageCircle, CreditCard, Bell, Settings, UserCog, GraduationCap,
  Clock, ClipboardList, Megaphone, FileArchive, Heart, UserPlus, Calendar,
  Camera, User, UserCheck, MapPin, BookOpen, Shield, Sparkles, CalendarDays,
  Building2, Palette, Crown, Brain, HandHeart, FileSpreadsheet, TreePine, Library, ClipboardCheck, Receipt, ShoppingBag, BarChart3, Wallet, Award, Target
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { PushNotificationRequired } from "@/components/PushNotificationRequired";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import { OperationalAlert } from "@/components/OperationalAlert";
import { DutyToggle } from "@/components/DutyToggle";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useBranding } from "@/contexts/BrandingContext";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { toast } from "sonner";

type MenuItem = { icon: any; label: string; labelEn: string; path: string; color?: string };

/**
 * Parent Portal Navigation Items
 * Includes: My Children, Attendance, Daily Reports, Photos & Activities,
 * Messages, Notifications, Invoices & Payments, Documents, Medical, Profile Settings
 */
const parentMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "الرئيسية", labelEn: "Home", path: "", color: "#00C9B7" },
  { icon: Users, label: "أطفالي", labelEn: "My Children", path: "/children", color: "#7C3AED" },
  { icon: CalendarCheck, label: "الحضور", labelEn: "Attendance", path: "/attendance", color: "#00C9B7" },
  { icon: ClipboardList, label: "التقرير اليومي", labelEn: "Daily Report", path: "/daily-report", color: "#EC4899" },
  { icon: Camera, label: "الصور والأنشطة", labelEn: "Photos & Activities", path: "/photos", color: "#F97316" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages", color: "#00C9B7" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications", color: "#EC4899" },
  { icon: CreditCard, label: "الفواتير والمدفوعات", labelEn: "Invoices & Payments", path: "/finance", color: "#F97316" },
  { icon: FileArchive, label: "المستندات", labelEn: "Documents", path: "/documents", color: "#7C3AED" },
  { icon: Heart, label: "المعلومات الطبية", labelEn: "Medical Info", path: "/medical", color: "#EC4899" },
  { icon: MapPin, label: "طلب الاستلام", labelEn: "Pickup Request", path: "/pickup", color: "#7C3AED" },
  { icon: BookOpen, label: "الملاحظات والتقييمات", labelEn: "Observations", path: "/observations", color: "#F97316" },
  { icon: ClipboardCheck, label: "الاختبارات", labelEn: "Assessments", path: "/assessments", color: "#8B5CF6" },
  { icon: Brain, label: "نمو وتطور طفلي", labelEn: "My Child's Development", path: "/development", color: "#00C9B7" },
  { icon: HandHeart, label: "مشاركة الأسرة", labelEn: "Family Engagement", path: "/engagement", color: "#EC4899" },
  { icon: Calendar, label: "التقويم السنوي", labelEn: "Calendar", path: "/calendar", color: "#00C9B7" },
  { icon: Megaphone, label: "الإعلانات", labelEn: "Announcements", path: "/announcements", color: "#EC4899" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", labelEn: "Weekly Plan", path: "/weekly-plan", color: "#7C3AED" },
  { icon: Library, label: "مكتبة المناهج", labelEn: "Curriculum", path: "/curriculum", color: "#10B981" },
  { icon: ShoppingBag, label: "المتجر", labelEn: "Store", path: "/store", color: "#10B981" },
  { icon: Crown, label: "بطاقة الولاء", labelEn: "Loyalty Card", path: "/loyalty", color: "#F59E0B" },
  { icon: Sparkles, label: "المساعد الذكي", labelEn: "AI Assistant", path: "/ai/assistant", color: "#F97316" },
];

/**
 * Staff Portal Navigation Items (for teacher, assistant roles)
 * Includes: Dashboard, Children, Classes, Attendance, Reports, Activities, Messages
 */
const staffMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "", color: "#00C9B7" },
  { icon: Users, label: "الأطفال", labelEn: "Children", path: "/children", color: "#7C3AED" },
  { icon: GraduationCap, label: "الفصول", labelEn: "Classes", path: "/classes", color: "#F97316" },
  { icon: CalendarCheck, label: "حضور الأطفال", labelEn: "Child Attendance", path: "/attendance", color: "#00C9B7" },
  { icon: Clock, label: "تسجيل حضوري", labelEn: "My Attendance", path: "/staff-attendance", color: "#EC4899" },
  { icon: ClipboardList, label: "السجل اليومي", labelEn: "Daily Log", path: "/daily-log", color: "#EC4899" },
  { icon: FileText, label: "التقارير اليومية", labelEn: "Daily Reports", path: "/daily-reports", color: "#7C3AED" },
  { icon: Camera, label: "الصور والفيديو", labelEn: "Photos & Videos", path: "/media", color: "#F97316" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages", color: "#00C9B7" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications", color: "#EC4899" },
  { icon: MapPin, label: "الاستلام", labelEn: "Pickup", path: "/pickup", color: "#7C3AED" },
  { icon: BookOpen, label: "التقييمات", labelEn: "Assessments", path: "/assessments", color: "#F97316" },
  { icon: ClipboardCheck, label: "الاختبارات المخصصة", labelEn: "Custom Assessments", path: "/custom-assessments", color: "#8B5CF6" },
  { icon: TreePine, label: "مقياس الكشف المبكر", labelEn: "Early Detection", path: "/developmental-assessment", color: "#10B981" },
  { icon: Brain, label: "مركز النمو والتطور", labelEn: "Development Center", path: "/development", color: "#00C9B7" },
  { icon: HandHeart, label: "مشاركة الأسر", labelEn: "Family Engagement", path: "/engagement", color: "#EC4899" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", labelEn: "Weekly Plan", path: "/weekly-plan", color: "#7C3AED" },
  { icon: Library, label: "مكتبة المناهج", labelEn: "Curriculum", path: "/curriculum", color: "#10B981" },
  { icon: Sparkles, label: "المساعد الذكي", labelEn: "AI Assistant", path: "/ai", color: "#F97316" },
  { icon: Calendar, label: "التقويم السنوي", labelEn: "Calendar", path: "/calendar", color: "#00C9B7" },
  { icon: Megaphone, label: "الإعلانات", labelEn: "Announcements", path: "/announcements", color: "#EC4899" },
];

/**
 * Admin Portal Navigation Items (full system access)
 * Includes all staff items + User management, Staff attendance, Finance, 
 * Enrollment, Documents, Settings
 */
const adminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "", color: "#00C9B7" },
  { icon: Users, label: "الأطفال", labelEn: "Children", path: "/children", color: "#7C3AED" },
  { icon: FileSpreadsheet, label: "استيراد الأطفال", labelEn: "Import Children", path: "/import-children", color: "#EC4899" },
  { icon: GraduationCap, label: "الفصول", labelEn: "Classes", path: "/classes", color: "#F97316" },
  { icon: CalendarCheck, label: "حضور الأطفال", labelEn: "Child Attendance", path: "/attendance", color: "#00C9B7" },
  { icon: Clock, label: "حضور الموظفين", labelEn: "Staff Attendance", path: "/staff-attendance", color: "#EC4899" },
  { icon: UserCog, label: "إدارة الموظفين", labelEn: "Staff Management", path: "/staff-management", color: "#7C3AED" },
  { icon: FileSpreadsheet, label: "استيراد الموظفين", labelEn: "Import Staff", path: "/import-staff", color: "#00C9B7" },
  { icon: CalendarDays, label: "إدارة الإجازات", labelEn: "Leave Management", path: "/leave-management", color: "#F97316" },
  { icon: ClipboardList, label: "السجل اليومي", labelEn: "Daily Log", path: "/daily-log", color: "#EC4899" },
  { icon: FileText, label: "التقارير اليومية", labelEn: "Daily Reports", path: "/daily-reports", color: "#7C3AED" },
  { icon: Camera, label: "الصور والفيديو", labelEn: "Photos & Videos", path: "/media", color: "#F97316" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages", color: "#00C9B7" },
  { icon: CreditCard, label: "المالية والمدفوعات", labelEn: "Finance & Payments", path: "/finance", color: "#F97316" },
  { icon: UserPlus, label: "التسجيل", labelEn: "Enrollment", path: "/enrollment", color: "#7C3AED" },
  { icon: Calendar, label: "التقويم السنوي", labelEn: "Calendar", path: "/calendar", color: "#00C9B7" },
  { icon: Megaphone, label: "الإعلانات", labelEn: "Announcements", path: "/announcements", color: "#EC4899" },
  { icon: FileArchive, label: "المستندات", labelEn: "Documents", path: "/documents", color: "#F97316" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications", color: "#EC4899" },
  { icon: UserCog, label: "إدارة المستخدمين", labelEn: "User Management", path: "/users", color: "#7C3AED" },
  { icon: MapPin, label: "الاستلام", labelEn: "Pickup", path: "/pickup", color: "#7C3AED" },
  { icon: BookOpen, label: "التقييمات", labelEn: "Assessments", path: "/assessments", color: "#F97316" },
  { icon: ClipboardCheck, label: "الاختبارات المخصصة", labelEn: "Custom Assessments", path: "/custom-assessments", color: "#8B5CF6" },
  { icon: TreePine, label: "مقياس الكشف المبكر", labelEn: "Early Detection", path: "/developmental-assessment", color: "#10B981" },
  { icon: Brain, label: "مركز النمو والتطور", labelEn: "Development Center", path: "/development", color: "#00C9B7" },
  { icon: HandHeart, label: "مشاركة الأسر", labelEn: "Family Engagement", path: "/engagement", color: "#EC4899" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", labelEn: "Weekly Plan", path: "/weekly-plan", color: "#7C3AED" },
  { icon: Library, label: "مكتبة المناهج", labelEn: "Curriculum", path: "/curriculum", color: "#10B981" },
  { icon: Sparkles, label: "المساعد الذكي", labelEn: "AI Assistant", path: "/ai", color: "#F97316" },
  { icon: UserCheck, label: "طلبات الموافقة", labelEn: "Pending Approvals", path: "/pending-approvals", color: "#00C9B7" },
  { icon: Shield, label: "سجل المراجعة", labelEn: "Audit Log", path: "/audit-log", color: "#EC4899" },
  { icon: ShoppingBag, label: "المتجر", labelEn: "Store", path: "/store", color: "#10B981" },
  { icon: BarChart3, label: "تقرير المبيعات", labelEn: "Sales Report", path: "/store/reports", color: "#6366F1" },
  { icon: Crown, label: "برنامج الولاء", labelEn: "Loyalty Program", path: "/loyalty", color: "#F59E0B" },
  { icon: Wallet, label: "مسيّر الرواتب", labelEn: "Payroll", path: "/payroll", color: "#10B981" },
  { icon: Award, label: "تقييم الأداء", labelEn: "Performance Evaluation", path: "/performance-evaluation", color: "#6366F1" },
  { icon: BarChart3, label: "مقارنة الأداء", labelEn: "Performance Comparison", path: "/performance-comparison", color: "#8B5CF6" },
  { icon: Target, label: "أهداف الأداء", labelEn: "Performance Goals", path: "/performance-goals", color: "#EC4899" },
  { icon: BarChart3, label: "لوحة الموارد البشرية", labelEn: "HR Dashboard", path: "/hr-dashboard", color: "#0EA5E9" },
  { icon: Settings, label: "الإعدادات", labelEn: "Settings", path: "/settings", color: "#7C3AED" },
  { icon: Bell, label: "إعدادات الإشعارات", labelEn: "Notification Settings", path: "/notification-settings", color: "#00C9B7" },
  { icon: CreditCard, label: "إعدادات الدفع", labelEn: "Payment Settings", path: "/staff/payment-settings", color: "#F59E0B" },
];

/**
 * Principal role - similar to admin but without system settings
 */
const principalMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "" },
  { icon: Users, label: "الأطفال", labelEn: "Children", path: "/children" },
  { icon: FileSpreadsheet, label: "استيراد الأطفال", labelEn: "Import Children", path: "/import-children" },
  { icon: GraduationCap, label: "الفصول", labelEn: "Classes", path: "/classes" },
  { icon: CalendarCheck, label: "حضور الأطفال", labelEn: "Child Attendance", path: "/attendance" },
  { icon: Clock, label: "حضور الموظفين", labelEn: "Staff Attendance", path: "/staff-attendance" },
  { icon: UserCog, label: "إدارة الموظفين", labelEn: "Staff Management", path: "/staff-management" },
  { icon: FileSpreadsheet, label: "استيراد الموظفين", labelEn: "Import Staff", path: "/import-staff" },
  { icon: CalendarDays, label: "إدارة الإجازات", labelEn: "Leave Management", path: "/leave-management" },
  { icon: ClipboardList, label: "السجل اليومي", labelEn: "Daily Log", path: "/daily-log" },
  { icon: FileText, label: "التقارير اليومية", labelEn: "Daily Reports", path: "/daily-reports" },
  { icon: Camera, label: "الصور والفيديو", labelEn: "Photos & Videos", path: "/media" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages" },
  { icon: CreditCard, label: "المالية والمدفوعات", labelEn: "Finance & Payments", path: "/finance" },
  { icon: UserPlus, label: "التسجيل", labelEn: "Enrollment", path: "/enrollment" },
  { icon: Calendar, label: "التقويم السنوي", labelEn: "Calendar", path: "/calendar" },
  { icon: Megaphone, label: "الإعلانات", labelEn: "Announcements", path: "/announcements" },
  { icon: FileArchive, label: "المستندات", labelEn: "Documents", path: "/documents" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications" },
  { icon: UserCog, label: "إدارة المستخدمين", labelEn: "User Management", path: "/users" },
  { icon: BookOpen, label: "التقييمات", labelEn: "Assessments", path: "/assessments" },
  { icon: TreePine, label: "مقياس الكشف المبكر", labelEn: "Early Detection", path: "/developmental-assessment" },
  { icon: Brain, label: "مركز النمو والتطور", labelEn: "Development Center", path: "/development" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", labelEn: "Weekly Plan", path: "/weekly-plan" },
  { icon: Library, label: "مكتبة المناهج", labelEn: "Curriculum", path: "/curriculum" },
  { icon: Sparkles, label: "المساعد الذكي", labelEn: "AI Assistant", path: "/ai" },
  { icon: UserCheck, label: "طلبات الموافقة", labelEn: "Pending Approvals", path: "/pending-approvals" },
  { icon: Wallet, label: "مسيّر الرواتب", labelEn: "Payroll", path: "/payroll" },
  { icon: Award, label: "تقييم الأداء", labelEn: "Performance Evaluation", path: "/performance-evaluation" },
  { icon: BarChart3, label: "مقارنة الأداء", labelEn: "Performance Comparison", path: "/performance-comparison" },
  { icon: Target, label: "أهداف الأداء", labelEn: "Performance Goals", path: "/performance-goals" },
  { icon: BarChart3, label: "لوحة الموارد البشرية", labelEn: "HR Dashboard", path: "/hr-dashboard" },
  { icon: CreditCard, label: "إعدادات الدفع", labelEn: "Payment Settings", path: "/staff/payment-settings", color: "#F59E0B" },
];

/**
 * Accountant role - finance focused
 */
const accountantMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "" },
  { icon: CreditCard, label: "المالية والمدفوعات", labelEn: "Finance & Payments", path: "/finance" },
  { icon: Users, label: "الأطفال", labelEn: "Children", path: "/children" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages" },
];

/**
 * Receptionist role - enrollment and basic access
 */
const receptionistMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "" },
  { icon: UserPlus, label: "التسجيل", labelEn: "Enrollment", path: "/enrollment" },
  { icon: Users, label: "الأطفال", labelEn: "Children", path: "/children" },
  { icon: FileArchive, label: "المستندات", labelEn: "Documents", path: "/documents" },
  { icon: Bell, label: "الإشعارات", labelEn: "Notifications", path: "/notifications" },
  { icon: MessageCircle, label: "الرسائل", labelEn: "Messages", path: "/messages" },
];

const superAdminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", labelEn: "Dashboard", path: "", color: "#00C9B7" },
  { icon: Building2, label: "المنظمات", labelEn: "Organizations", path: "/organizations", color: "#7C3AED" },
  { icon: UserCheck, label: "طلبات التسجيل", labelEn: "Registrations", path: "/registrations", color: "#F59E0B" },
  { icon: Crown, label: "إدارة الاشتراكات", labelEn: "Subscriptions", path: "/plans", color: "#F97316" },
  { icon: Receipt, label: "تقرير المدفوعات", labelEn: "Payments Report", path: "/payments-report", color: "#10B981" },
  { icon: ShoppingBag, label: "المتجر", labelEn: "Store", path: "/store", color: "#10B981" },
  { icon: Palette, label: "الهوية البصرية", labelEn: "Branding", path: "/branding", color: "#EC4899" },
  { icon: Users, label: "المستخدمون", labelEn: "Users", path: "/users", color: "#7C3AED" },
  { icon: Settings, label: "الإعدادات", labelEn: "Settings", path: "/settings", color: "#00C9B7" },
  { icon: Bell, label: "إعدادات الإشعارات", labelEn: "Notification Settings", path: "/notification-settings", color: "#00C9B7" },
  { icon: CreditCard, label: "إعدادات الدفع", labelEn: "Payment Settings", path: "/staff/payment-settings", color: "#F59E0B" },
];


function getMenuItems(role?: string, basePath?: string): MenuItem[] {
  if (basePath === "/super-admin") return superAdminMenuItems;

  switch (role) {
    case "admin":
    case "super_admin":
    case "owner":
      return adminMenuItems;
    case "principal":
      return principalMenuItems;
    case "teacher":
    case "assistant":
      return staffMenuItems;
    case "accountant":
      return accountantMenuItems;
    case "receptionist":
      return receptionistMenuItems;
    case "parent":
      return parentMenuItems;
    default:
      return parentMenuItems;
  }
}

function getRoleDisplayName(role?: string, lang: string = 'ar'): string {
  if (lang === 'en') {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
      case "owner": return "Owner";
      case "principal": return "Principal";
      case "teacher": return "Teacher";
      case "assistant": return "Assistant";
      case "accountant": return "Accountant";
      case "receptionist": return "Receptionist";
      case "parent": return "Parent";
      default: return "User";
    }
  }
  switch (role) {
    case "super_admin": return "المدير العام";
    case "admin": return "مدير النظام";
    case "owner": return "المالك";
    case "principal": return "مدير/ة";
    case "teacher": return "معلم/ة";
    case "assistant": return "مساعد/ة";
    case "accountant": return "محاسب/ة";
    case "receptionist": return "موظف/ة استقبال";
    case "parent": return "ولي أمر";
    default: return "مستخدم";
  }
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
  basePath = "",
}: {
  children: React.ReactNode;
  basePath?: string;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-accent/30 to-primary/5 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-chart-3/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col items-center gap-10 p-8 max-w-md w-full relative z-10">
          <div className="flex flex-col items-center gap-6">
            <div className="w-28 h-28 rounded-3xl bg-white shadow-xl shadow-primary/10 flex items-center justify-center p-3 border border-border/50">
              <img
                src="/assets/logo.webp"
                alt="Nashaa"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-center text-foreground">
              {isAr ? 'نشأة' : 'Nashaa'} <span className="text-[#00C9B7]">{isAr ? '' : ''}</span>
            </h1>
            <p className="text-base text-muted-foreground text-center max-w-sm leading-relaxed">
              {isAr ? "منصة متكاملة لإدارة الحضانات ورياض الأطفال" : "Integrated Nursery and Kindergarten Management Platform"}
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = LOGIN_PATH;
            }}
            size="lg"
            className="w-full h-12 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold btn-press"
          >
            {isAr ? "تسجيل الدخول" : "Login"}
          </Button>
          <p className="text-xs text-muted-foreground/60 text-center">
            {isAr ? 'منصة آمنة ومشفرة لحماية بياناتك' : 'A secure and encrypted platform to protect your data'}
          </p>
        </div>
      </div>
    );
  }

  // On iPad/tablet (768-1024px), start with sidebar closed to avoid crowded interface
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1024;

  return (
    <SidebarProvider
      defaultOpen={!isTablet}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} basePath={basePath}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  basePath: string;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  basePath,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Initialize in-app notification sounds (plays sound on new notifications)
  useInAppNotifications();
  const { branding } = useBranding();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const currentLang = i18n.language || 'ar';
  const toggleLanguage = () => {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    toast.success(
      newLang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English',
      { duration: 2000 }
    );
  };
  const menuItems = getMenuItems(user?.role, basePath);
  const isMobile = useIsMobile();

  // Determine active item by matching location against basePath + item.path
  // Only /ai paths are absolute (top-level AI routes), all others are relative to basePath
  const activeMenuItem = menuItems.find((item: MenuItem) => {
    const fullPath = item.path.startsWith("/ai") ? item.path : basePath + item.path;
    return location === fullPath || location.startsWith(fullPath + "/") || (item.path === "" && location === basePath);
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 sidebar-premium"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label={isAr ? "تبديل القائمة" : "Toggle menu"}
              >
                <PanelLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {basePath === "/super-admin" ? (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B61FF] to-[#00C9B7] flex items-center justify-center shadow-sm">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold tracking-tight truncate text-foreground">
                        {isAr ? 'Nashaa - الإدارة' : 'Nashaa - Admin'}
                      </span>
                    </>
                  ) : (
                    <>
                      <img src="/assets/logo.webp" alt="Nashaa" className="w-8 h-8 object-contain rounded-lg" />
                      <span className="font-bold tracking-tight truncate text-foreground">
                        Nashaa
                      </span>
                    </>
                  )}
                </div>
              ) : (
                basePath === "/super-admin" ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B61FF] to-[#00C9B7] flex items-center justify-center shadow-sm">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <img src="/assets/logo.webp" alt="Nashaa" className="w-8 h-8 object-contain rounded-lg" />
                )
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-3 space-y-1">
              {menuItems.map((item: MenuItem) => {
                const fullPath = item.path.startsWith("/ai") ? item.path : basePath + item.path;
                const isActive = location === fullPath || (item.path === "" && location === basePath);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(fullPath)}
                      tooltip={currentLang === 'en' ? item.labelEn : item.label}
                      className={`h-11 md:h-12 rounded-xl transition-all duration-200 font-medium text-sm ${
                        isActive 
                          ? "shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }`}
                      style={isActive && item.color ? { backgroundColor: `${item.color}10`, color: item.color } : undefined}
                    >
                      <item.icon
                        className="h-5 w-5 transition-colors"
                        style={item.color ? { color: isActive ? item.color : undefined } : undefined}
                      />
                      <span>{currentLang === 'en' ? item.labelEn : item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="mb-3 flex justify-center">
              <DutyToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/60 transition-all duration-200 w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 shrink-0 shadow-sm">
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-1.5">
                      {getRoleDisplayName(user?.role, currentLang)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={() => setLocation(`${basePath}/account-settings`)}
                  className="cursor-pointer rounded-lg"
                >
                  <Settings className={`h-4 w-4 ${currentLang === 'en' ? 'mr-2' : 'ml-2'}`} />
                  <span>{currentLang === 'en' ? 'Account Settings' : 'إعدادات الحساب'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={toggleLanguage}
                  className="cursor-pointer rounded-lg"
                >
                  <Globe className={`h-4 w-4 ${currentLang === 'en' ? 'mr-2' : 'ml-2'}`} />
                  <span>{currentLang === 'en' ? (isAr ? "العربية" : "Arabic") : 'English'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                >
                  <LogOut className={`h-4 w-4 ${currentLang === 'en' ? 'mr-2' : 'ml-2'}`} />
                  <span>{currentLang === 'en' ? 'Logout' : 'تسجيل الخروج'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0 overflow-x-hidden overflow-y-auto bg-background">
        {/* Desktop top bar */}
        {!isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/80 px-5 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center hover:bg-accent/60 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={isAr ? "تبديل القائمة" : "Toggle menu"}
              >
                <PanelLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <span className="font-semibold text-foreground text-base">
                {activeMenuItem ? (currentLang === 'en' ? activeMenuItem.labelEn : activeMenuItem.label) : (currentLang === 'en' ? 'Menu' : (isAr ? "القائمة" : "Menu"))}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>
          </div>
        )}
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/80 px-3 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-accent/50" />
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground text-sm">
                  {activeMenuItem ? (currentLang === 'en' ? activeMenuItem.labelEn : activeMenuItem.label) : (currentLang === 'en' ? 'Menu' : (isAr ? "القائمة" : "Menu"))}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        )}
        <PushNotificationRequired />
        <PushNotificationBanner />
        <OperationalAlert />
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 page-enter">{children}</main>
      </SidebarInset>
    </>
  );
}
