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
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, CalendarCheck, FileText,
  MessageCircle, CreditCard, Bell, Settings, UserCog, GraduationCap,
  Clock, ClipboardList, Megaphone, FileArchive, Heart, UserPlus, Calendar,
  Camera, User, UserCheck, MapPin, BookOpen, Shield, Sparkles, CalendarDays,
  Building2, Palette, Crown, Brain, HandHeart
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

type MenuItem = { icon: any; label: string; path: string };

/**
 * Parent Portal Navigation Items
 * Includes: My Children, Attendance, Daily Reports, Photos & Activities,
 * Messages, Notifications, Invoices & Payments, Documents, Medical, Profile Settings
 */
const parentMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "الرئيسية", path: "" },
  { icon: Users, label: "أطفالي", path: "/children" },
  { icon: CalendarCheck, label: "الحضور", path: "/attendance" },
  { icon: ClipboardList, label: "التقرير اليومي", path: "/timeline" },
  { icon: Camera, label: "الصور والأنشطة", path: "/photos" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: CreditCard, label: "الفواتير والمدفوعات", path: "/finance" },
  { icon: FileArchive, label: "المستندات", path: "/documents" },
  { icon: Heart, label: "المعلومات الطبية", path: "/medical" },
  { icon: MapPin, label: "طلب الاستلام", path: "/pickup" },
  { icon: BookOpen, label: "الملاحظات والتقييمات", path: "/observations" },
  { icon: Brain, label: "نمو وتطور طفلي", path: "/development" },
  { icon: HandHeart, label: "مشاركة الأسرة", path: "/engagement" },
  { icon: Calendar, label: "التقويم السنوي", path: "/calendar" },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", path: "/weekly-plan" },
  { icon: Sparkles, label: "المساعد الذكي", path: "/ai/assistant" },
];

/**
 * Staff Portal Navigation Items (for teacher, assistant roles)
 * Includes: Dashboard, Children, Classes, Attendance, Reports, Activities, Messages
 */
const staffMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: Users, label: "الأطفال", path: "/children" },
  { icon: GraduationCap, label: "الفصول", path: "/classes" },
  { icon: CalendarCheck, label: "حضور الأطفال", path: "/attendance" },
  { icon: ClipboardList, label: "السجل اليومي", path: "/daily-log" },
  { icon: FileText, label: "التقارير اليومية", path: "/daily-reports" },
  { icon: Camera, label: "الصور والفيديو", path: "/media" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: MapPin, label: "الاستلام", path: "/pickup" },
  { icon: BookOpen, label: "التقييمات", path: "/assessments" },
  { icon: Brain, label: "مركز النمو والتطور", path: "/development" },
  { icon: HandHeart, label: "مشاركة الأسر", path: "/engagement" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", path: "/weekly-plan" },
  { icon: Sparkles, label: "المساعد الذكي", path: "/ai" },
  { icon: Calendar, label: "التقويم السنوي", path: "/calendar" },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements" },
];

/**
 * Admin Portal Navigation Items (full system access)
 * Includes all staff items + User management, Staff attendance, Finance, 
 * Enrollment, Documents, Settings
 */
const adminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: Users, label: "الأطفال", path: "/children" },
  { icon: GraduationCap, label: "الفصول", path: "/classes" },
  { icon: CalendarCheck, label: "حضور الأطفال", path: "/attendance" },
  { icon: Clock, label: "حضور الموظفين", path: "/staff-attendance" },
  { icon: ClipboardList, label: "السجل اليومي", path: "/daily-log" },
  { icon: FileText, label: "التقارير اليومية", path: "/daily-reports" },
  { icon: Camera, label: "الصور والفيديو", path: "/media" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
  { icon: CreditCard, label: "المالية والمدفوعات", path: "/finance" },
  { icon: UserPlus, label: "التسجيل", path: "/enrollment" },
  { icon: Calendar, label: "التقويم السنوي", path: "/calendar" },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements" },
  { icon: FileArchive, label: "المستندات", path: "/documents" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: UserCog, label: "إدارة المستخدمين", path: "/users" },
  { icon: MapPin, label: "الاستلام", path: "/pickup" },
  { icon: BookOpen, label: "التقييمات", path: "/assessments" },
  { icon: Brain, label: "مركز النمو والتطور", path: "/development" },
  { icon: HandHeart, label: "مشاركة الأسر", path: "/engagement" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", path: "/weekly-plan" },
  { icon: Sparkles, label: "المساعد الذكي", path: "/ai" },
  { icon: UserCheck, label: "طلبات الموافقة", path: "/pending-approvals" },
  { icon: Shield, label: "سجل المراجعة", path: "/audit-log" },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

/**
 * Principal role - similar to admin but without system settings
 */
const principalMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: Users, label: "الأطفال", path: "/children" },
  { icon: GraduationCap, label: "الفصول", path: "/classes" },
  { icon: CalendarCheck, label: "حضور الأطفال", path: "/attendance" },
  { icon: Clock, label: "حضور الموظفين", path: "/staff-attendance" },
  { icon: ClipboardList, label: "السجل اليومي", path: "/daily-log" },
  { icon: FileText, label: "التقارير اليومية", path: "/daily-reports" },
  { icon: Camera, label: "الصور والفيديو", path: "/media" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
  { icon: CreditCard, label: "المالية والمدفوعات", path: "/finance" },
  { icon: UserPlus, label: "التسجيل", path: "/enrollment" },
  { icon: Calendar, label: "التقويم السنوي", path: "/calendar" },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements" },
  { icon: FileArchive, label: "المستندات", path: "/documents" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: UserCog, label: "إدارة المستخدمين", path: "/users" },
  { icon: BookOpen, label: "التقييمات", path: "/assessments" },
  { icon: Brain, label: "مركز النمو والتطور", path: "/development" },
  { icon: CalendarDays, label: "الخطة الأسبوعية", path: "/weekly-plan" },
  { icon: Sparkles, label: "المساعد الذكي", path: "/ai" },
  { icon: UserCheck, label: "طلبات الموافقة", path: "/pending-approvals" },
];

/**
 * Accountant role - finance focused
 */
const accountantMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: CreditCard, label: "المالية والمدفوعات", path: "/finance" },
  { icon: Users, label: "الأطفال", path: "/children" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
];

/**
 * Receptionist role - enrollment and basic access
 */
const receptionistMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: UserPlus, label: "التسجيل", path: "/enrollment" },
  { icon: Users, label: "الأطفال", path: "/children" },
  { icon: FileArchive, label: "المستندات", path: "/documents" },
  { icon: Bell, label: "الإشعارات", path: "/notifications" },
  { icon: MessageCircle, label: "الرسائل", path: "/messages" },
];

const superAdminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "" },
  { icon: Building2, label: "المنظمات", path: "/organizations" },
  { icon: Crown, label: "خطط الاشتراك", path: "/plans" },
  { icon: Palette, label: "الهوية البصرية", path: "/branding" },
  { icon: Users, label: "المستخدمون", path: "/users" },
  { icon: Settings, label: "الإعدادات", path: "/settings" },
];

function getMenuItems(role?: string, basePath?: string): MenuItem[] {
  if (basePath === "/super-admin") return superAdminMenuItems;
  switch (role) {
    case "admin":
    case "super_admin":
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
      // Fallback for 'user' or unknown roles - should not reach here
      // as App.tsx handles this case with PendingRolePage
      return parentMenuItems;
  }
}

function getRoleDisplayName(role?: string): string {
  switch (role) {
    case "super_admin":
      return "المدير العام";
    case "admin":
      return "مدير النظام";
    case "principal":
      return "مدير/ة";
    case "teacher":
      return "معلم/ة";
    case "assistant":
      return "مساعد/ة";
    case "accountant":
      return "محاسب/ة";
    case "receptionist":
      return "موظف/ة استقبال";
    case "parent":
      return "ولي أمر";
    default:
      return "مستخدم";
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
                src="/manus-storage/learning-tree-logo-256_58b252d9.png"
                alt="Learning Tree Kids Center"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-center text-foreground">
              Learning Tree
            </h1>
            <p className="text-base text-muted-foreground text-center max-w-sm leading-relaxed">
              منصة إدارة الحضانة المتكاملة
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full h-12 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold btn-press"
          >
            تسجيل الدخول
          </Button>
          <p className="text-xs text-muted-foreground/60 text-center">
            منصة آمنة ومشفرة لحماية بياناتك
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
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
                className="h-8 w-8 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="تبديل القائمة"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {basePath === "/super-admin" ? (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold tracking-tight truncate text-foreground">
                        نشأة - الإدارة
                      </span>
                    </>
                  ) : (
                    <>
                      <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                      <span className="font-bold tracking-tight truncate text-foreground">
                        Learning Tree
                      </span>
                    </>
                  )}
                </div>
              ) : (
                basePath === "/super-admin" ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                )
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-2 space-y-0.5">
              {menuItems.map((item: MenuItem) => {
                const fullPath = item.path.startsWith("/ai") ? item.path : basePath + item.path;
                const isActive = location === fullPath || (item.path === "" && location === basePath);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(fullPath)}
                      tooltip={item.label}
                      className={`h-10 rounded-xl transition-all duration-200 font-medium text-[13px] ${
                        isActive 
                          ? "bg-primary/10 text-primary shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }`}
                    >
                      <item.icon
                        className={`h-[18px] w-[18px] transition-colors ${
                          isActive ? "text-primary" : ""
                        }`}
                      />
                      <span>{item.label}</span>
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
                      {getRoleDisplayName(user?.role)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
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

      <SidebarInset className="overflow-y-auto bg-background">
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/80 px-3 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-accent/50" />
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground text-sm">
                  {activeMenuItem?.label ?? "القائمة"}
                </span>
              </div>
            </div>
          </div>
        )}
        <PushNotificationRequired />
        <PushNotificationBanner />
        <OperationalAlert />
        <main className="flex-1 p-4 md:p-6 page-enter">{children}</main>
      </SidebarInset>
    </>
  );
}
