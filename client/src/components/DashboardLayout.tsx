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
  Building2, Palette, Crown, Brain
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f4fd]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <img
              src="/manus-storage/learning-tree-logo-256_58b252d9.png"
              alt="Learning Tree Kids Center"
              className="w-32 h-32 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight text-center text-[#1a3a5c]">
              Learning Tree Kids Center
            </h1>
            <h2 className="text-lg font-semibold text-center text-[#2c5f7c]">
              Nursery Management System
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              يرجى تسجيل الدخول للوصول إلى منصة إدارة الحضانة
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all bg-[#1a3a5c] hover:bg-[#0f2a45] text-white"
          >
            تسجيل الدخول
          </Button>
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
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="تبديل القائمة"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  {basePath === "/super-admin" ? (
                    <>
                      <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="font-semibold tracking-tight truncate text-[#1a3a5c]">
                        نشأة - الإدارة
                      </span>
                    </>
                  ) : (
                    <>
                      <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-7 h-7 object-contain" />
                      <span className="font-semibold tracking-tight truncate text-[#1a3a5c]">
                        Learning Tree
                      </span>
                    </>
                  )}
                </div>
              ) : (
                basePath === "/super-admin" ? (
                  <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-7 h-7 object-contain" />
                )
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item: MenuItem) => {
                const fullPath = item.path.startsWith("/ai") ? item.path : basePath + item.path;
                const isActive = location === fullPath || (item.path === "" && location === basePath);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(fullPath)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="mb-2 flex justify-center">
              <DutyToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {getRoleDisplayName(user?.role)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
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

      <SidebarInset className="overflow-y-auto">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "القائمة"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <PushNotificationRequired />
        <PushNotificationBanner />
        <OperationalAlert />
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
