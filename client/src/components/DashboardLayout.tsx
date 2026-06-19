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
  MessageCircle, CreditCard, Gift, Bell, Settings, UserCog, GraduationCap,
  Clock, ClipboardList, Megaphone, FileArchive, Heart, UserPlus, Calendar
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

type MenuItem = { icon: any; label: string; path: string; roles: string[] };

const staffMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "", roles: ["admin", "teacher", "assistant", "principal", "accountant", "receptionist"] },
  { icon: Users, label: "الأطفال", path: "/children", roles: ["admin", "teacher", "assistant", "principal"] },
  { icon: GraduationCap, label: "الفصول", path: "/classes", roles: ["admin", "principal", "teacher"] },
  { icon: CalendarCheck, label: "حضور الأطفال", path: "/attendance", roles: ["admin", "teacher", "assistant", "principal"] },
  { icon: Clock, label: "حضور الموظفين", path: "/staff-attendance", roles: ["admin", "principal"] },
  { icon: ClipboardList, label: "السجل اليومي", path: "/daily-log", roles: ["admin", "teacher", "assistant"] },
  { icon: FileText, label: "التقارير اليومية", path: "/daily-reports", roles: ["admin", "teacher", "principal"] },
  { icon: MessageCircle, label: "الرسائل", path: "/messages", roles: ["admin", "teacher", "assistant", "principal"] },
  { icon: CreditCard, label: "المالية", path: "/finance", roles: ["admin", "accountant", "principal"] },
  { icon: UserPlus, label: "التسجيل", path: "/enrollment", roles: ["admin", "receptionist", "principal"] },
  { icon: Calendar, label: "التقويم", path: "/calendar", roles: ["admin", "teacher", "principal"] },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements", roles: ["admin", "principal"] },
  { icon: FileArchive, label: "المستندات", path: "/documents", roles: ["admin", "principal", "receptionist"] },
  { icon: Bell, label: "الإشعارات", path: "/notifications", roles: ["admin", "teacher", "assistant", "principal"] },
  { icon: UserCog, label: "إدارة المستخدمين", path: "/users", roles: ["admin", "principal"] },
  { icon: Settings, label: "الإعدادات", path: "/settings", roles: ["admin"] },
];

const parentMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "الرئيسية", path: "", roles: ["parent"] },
  { icon: Users, label: "أطفالي", path: "/children", roles: ["parent"] },
  { icon: ClipboardList, label: "التقرير اليومي", path: "/timeline", roles: ["parent"] },
  { icon: CalendarCheck, label: "الحضور", path: "/attendance", roles: ["parent"] },
  { icon: Calendar, label: "التقويم", path: "/calendar", roles: ["parent"] },
  { icon: MessageCircle, label: "الرسائل", path: "/messages", roles: ["parent"] },
  { icon: CreditCard, label: "المالية", path: "/finance", roles: ["parent"] },
  { icon: Heart, label: "المعلومات الطبية", path: "/medical", roles: ["parent"] },
  { icon: FileArchive, label: "المستندات", path: "/documents", roles: ["parent"] },
  { icon: Megaphone, label: "الإعلانات", path: "/announcements", roles: ["parent"] },
  { icon: Bell, label: "الإشعارات", path: "/notifications", roles: ["parent"] },
  { icon: Gift, label: "برنامج الولاء", path: "/loyalty", roles: ["parent"] },
];

function getMenuItems(role?: string, basePath?: string): MenuItem[] {
  const userRole = role || "parent";
  const isParent = userRole === "parent";
  const items = isParent ? parentMenuItems : staffMenuItems;
  return items.filter(item => item.roles.includes(userRole));
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
  const menuItems = getMenuItems(user?.role, basePath);
  const isMobile = useIsMobile();

  // Determine active item by matching location against basePath + item.path
  const activeMenuItem = menuItems.find((item: MenuItem) => {
    const fullPath = basePath + item.path;
    return location === fullPath || (item.path === "" && location === basePath);
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
                  <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-7 h-7 object-contain" />
                  <span className="font-semibold tracking-tight truncate text-[#1a3a5c]">
                    Learning Tree
                  </span>
                </div>
              ) : (
                <img src="/manus-storage/learning-tree-logo-256_58b252d9.png" alt="Logo" className="w-7 h-7 object-contain" />
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item: MenuItem) => {
                const fullPath = basePath + item.path;
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
                      {user?.role === "parent" ? "ولي أمر" : user?.role === "admin" ? "مدير" : user?.role === "teacher" ? "معلمة" : user?.role || "-"}
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

      <SidebarInset>
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
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
