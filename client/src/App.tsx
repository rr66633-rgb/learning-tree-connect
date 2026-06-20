import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { ParentArrivalAlert } from "./components/ParentArrivalAlert";
import { useAuth } from "./_core/hooks/useAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Staff/Admin Pages
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffChildren = lazy(() => import("./pages/staff/Children"));
const StaffClasses = lazy(() => import("./pages/staff/Classes"));
const StaffAttendance = lazy(() => import("./pages/staff/Attendance"));
const StaffStaffAttendance = lazy(() => import("./pages/staff/StaffAttendance"));
const StaffDailyLog = lazy(() => import("./pages/staff/DailyLog"));
const StaffDailyReports = lazy(() => import("./pages/staff/DailyReports"));
const StaffMessages = lazy(() => import("./pages/staff/Messages"));
const StaffFinance = lazy(() => import("./pages/staff/Finance"));
const StaffEnrollment = lazy(() => import("./pages/staff/Enrollment"));
const StaffCalendar = lazy(() => import("./pages/staff/Calendar"));
const StaffAnnouncements = lazy(() => import("./pages/staff/Announcements"));
const StaffDocuments = lazy(() => import("./pages/staff/Documents"));
const StaffNotifications = lazy(() => import("./pages/staff/Notifications"));
const StaffUsers = lazy(() => import("./pages/staff/Users"));
const StaffSettings = lazy(() => import("./pages/staff/Settings"));
const StaffPendingApprovals = lazy(() => import("./pages/staff/PendingApprovals"));
const StaffMediaUpload = lazy(() => import("./pages/staff/MediaUpload"));
const InvoiceDetail = lazy(() => import("./pages/staff/InvoiceDetail"));
const ChildProfile = lazy(() => import("./pages/staff/ChildProfile"));
const StaffPickup = lazy(() => import("./pages/staff/Pickup"));
const StaffAssessments = lazy(() => import("./pages/staff/Assessments"));
const StaffAuditLog = lazy(() => import("./pages/staff/AuditLog"));

// Auth Pages
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Parent Pages
const ParentDashboard = lazy(() => import("./pages/parent/Dashboard"));
const ParentChildren = lazy(() => import("./pages/parent/Children"));
const ParentTimeline = lazy(() => import("./pages/parent/Timeline"));
const ParentAttendance = lazy(() => import("./pages/parent/Attendance"));
const ParentReports = lazy(() => import("./pages/parent/Reports"));
const ParentCalendar = lazy(() => import("./pages/parent/Calendar"));
const ParentMessages = lazy(() => import("./pages/parent/Messages"));
const ParentFinance = lazy(() => import("./pages/parent/Finance"));
const ParentDocuments = lazy(() => import("./pages/parent/Documents"));
const ParentNotifications = lazy(() => import("./pages/parent/Notifications"));
const ParentAnnouncements = lazy(() => import("./pages/parent/Announcements"));
const ParentMedical = lazy(() => import("./pages/parent/Medical"));
const ParentPhotos = lazy(() => import("./pages/parent/Photos"));
const ParentPickup = lazy(() => import("./pages/parent/Pickup"));
const ParentObservations = lazy(() => import("./pages/parent/Observations"));

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Determine if a role is a "parent" type role */
function isParentRole(role?: string): boolean {
  return role === "parent";
}

/** Determine if a role is a "staff" type role (any non-parent authenticated role) */
function isStaffRole(role?: string): boolean {
  const staffRoles = ["admin", "super_admin", "principal", "teacher", "assistant", "accountant", "receptionist"];
  return staffRoles.includes(role || "");
}

/** Get the base path for a given role */
function getBasePathForRole(role?: string): string {
  if (isParentRole(role)) return "/parent";
  if (isStaffRole(role)) return "/staff";
  // Default: 'user' role or unknown - show a pending state
  // We'll redirect them to a waiting page or parent portal by default
  return "/pending";
}

function StaffRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/staff/children/:id" component={ChildProfile} />
        <Route path="/staff/children" component={StaffChildren} />
        <Route path="/staff/classes" component={StaffClasses} />
        <Route path="/staff/attendance" component={StaffAttendance} />
        <Route path="/staff/staff-attendance" component={StaffStaffAttendance} />
        <Route path="/staff/daily-log" component={StaffDailyLog} />
        <Route path="/staff/daily-reports" component={StaffDailyReports} />
        <Route path="/staff/media" component={StaffMediaUpload} />
        <Route path="/staff/messages" component={StaffMessages} />
        <Route path="/staff/finance" component={StaffFinance} />
        <Route path="/staff/invoice/:id" component={InvoiceDetail} />
        <Route path="/staff/enrollment" component={StaffEnrollment} />
        <Route path="/staff/calendar" component={StaffCalendar} />
        <Route path="/staff/announcements" component={StaffAnnouncements} />
        <Route path="/staff/documents" component={StaffDocuments} />
        <Route path="/staff/notifications" component={StaffNotifications} />
        <Route path="/staff/users" component={StaffUsers} />
        <Route path="/staff/pending-approvals" component={StaffPendingApprovals} />
        <Route path="/staff/settings" component={StaffSettings} />
        <Route path="/staff/pickup" component={StaffPickup} />
        <Route path="/staff/assessments" component={StaffAssessments} />
        <Route path="/staff/audit-log" component={StaffAuditLog} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ParentRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/parent" component={ParentDashboard} />
        <Route path="/parent/children" component={ParentChildren} />
        <Route path="/parent/timeline" component={ParentTimeline} />
        <Route path="/parent/attendance" component={ParentAttendance} />
        <Route path="/parent/reports" component={ParentReports} />
        <Route path="/parent/calendar" component={ParentCalendar} />
        <Route path="/parent/messages" component={ParentMessages} />
        <Route path="/parent/finance" component={ParentFinance} />
        <Route path="/parent/invoice/:id" component={InvoiceDetail} />
        <Route path="/parent/documents" component={ParentDocuments} />
        <Route path="/parent/notifications" component={ParentNotifications} />
        <Route path="/parent/announcements" component={ParentAnnouncements} />
        <Route path="/parent/photos" component={ParentPhotos} />
        <Route path="/parent/medical" component={ParentMedical} />
        <Route path="/parent/pickup" component={ParentPickup} />
        <Route path="/parent/observations" component={ParentObservations} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/** Page shown to users with unassigned role ('user') */
function PendingRolePage() {
  const { user, logout, refresh } = useAuth();
  const isParent = user?.role === 'parent';
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f4fd]">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
        <img
          src="/manus-storage/learning-tree-logo-256_58b252d9.png"
          alt="Learning Tree Kids Center"
          className="w-24 h-24 object-contain"
        />
        <h1 className="text-xl font-bold text-[#1a3a5c]">
          مرحباً {user?.name}
        </h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium mb-1">
            {isParent ? 'حسابك قيد المراجعة' : 'حسابك قيد المراجعة'}
          </p>
          <p className="text-sm text-amber-700">
            {isParent
              ? 'تم إنشاء حسابك كولي أمر بنجاح. يرجى انتظار موافقة الإدارة لتفعيل حسابك والوصول إلى بوابة ولي الأمر.'
              : 'يرجى التواصل مع إدارة الحضانة لتفعيل حسابك وتحديد صلاحياتك.'
            }
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {isParent
            ? 'ستتمكن من إضافة أطفالك والوصول إلى جميع الخدمات بعد الموافقة.'
            : 'سيتم تحديد نوع حسابك (ولي أمر / موظف) من قبل الإدارة.'
          }
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => refresh()}
            className="text-sm text-primary hover:underline font-medium"
          >
            تحديث الحالة
          </button>
          <button
            onClick={logout}
            className="text-sm text-destructive hover:underline"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleRouter() {
  const { user, loading } = useAuth();
  useSessionTimeout();

  if (loading) return <PageLoader />;

  // Not logged in - show auth pages or redirect to login
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route>
            <DashboardLayout basePath="/staff">
              <StaffRouter />
            </DashboardLayout>
          </Route>
        </Switch>
      </Suspense>
    );
  }

  const userRole = user.role;
  const basePath = getBasePathForRole(userRole);

  // Users with unassigned role ('user') see a pending page
  if (basePath === "/pending") {
    return <PendingRolePage />;
  }

  // Parents with isActive=false are pending admin approval
  if (isParentRole(userRole) && user.isActive === false) {
    return <PendingRolePage />;
  }

  return (
    <DashboardLayout basePath={basePath}>
      {/* Full-screen alert for staff when parent arrives for pickup */}
      {isStaffRole(userRole) && <ParentArrivalAlert />}
      <Switch>
        {/* Root redirect based on role */}
        <Route path="/">
          <Redirect to={basePath} />
        </Route>

        {/* Auth routes redirect logged-in users */}
        <Route path="/login">
          <Redirect to={basePath} />
        </Route>
        <Route path="/register">
          <Redirect to={basePath} />
        </Route>
        <Route path="/forgot-password">
          <Redirect to={basePath} />
        </Route>
        <Route path="/reset-password" component={ResetPassword} />

        {/* Staff routes - protected for staff roles only */}
        <Route path="/staff/**">
          {isStaffRole(userRole) ? <StaffRouter /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/staff">
          {isStaffRole(userRole) ? <StaffRouter /> : <Redirect to={basePath} />}
        </Route>

        {/* Parent routes - protected for parent role only */}
        <Route path="/parent/**">
          {isParentRole(userRole) ? <ParentRouter /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/parent">
          {isParentRole(userRole) ? <ParentRouter /> : <Redirect to={basePath} />}
        </Route>

        {/* Legacy routes redirect */}
        <Route path="/children">
          <Redirect to={`${basePath}/children`} />
        </Route>
        <Route path="/attendance">
          <Redirect to={`${basePath}/attendance`} />
        </Route>
        <Route path="/messages">
          <Redirect to={`${basePath}/messages`} />
        </Route>
        <Route path="/finance">
          <Redirect to={`${basePath}/finance`} />
        </Route>
        <Route path="/notifications">
          <Redirect to={`${basePath}/notifications`} />
        </Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <RoleRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
