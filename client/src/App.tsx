import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./_core/hooks/useAuth";
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
const InvoiceDetail = lazy(() => import("./pages/staff/InvoiceDetail"));
const ChildProfile = lazy(() => import("./pages/staff/ChildProfile"));

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

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function StaffRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/staff/children" component={StaffChildren} />
        <Route path="/staff/children/:id" component={ChildProfile} />
        <Route path="/staff/classes" component={StaffClasses} />
        <Route path="/staff/attendance" component={StaffAttendance} />
        <Route path="/staff/staff-attendance" component={StaffStaffAttendance} />
        <Route path="/staff/daily-log" component={StaffDailyLog} />
        <Route path="/staff/daily-reports" component={StaffDailyReports} />
        <Route path="/staff/messages" component={StaffMessages} />
        <Route path="/staff/finance" component={StaffFinance} />
        <Route path="/staff/invoice/:id" component={InvoiceDetail} />
        <Route path="/staff/enrollment" component={StaffEnrollment} />
        <Route path="/staff/calendar" component={StaffCalendar} />
        <Route path="/staff/announcements" component={StaffAnnouncements} />
        <Route path="/staff/documents" component={StaffDocuments} />
        <Route path="/staff/notifications" component={StaffNotifications} />
        <Route path="/staff/users" component={StaffUsers} />
        <Route path="/staff/settings" component={StaffSettings} />
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
        <Route path="/parent/medical" component={ParentMedical} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function RoleRouter() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  // Redirect root to appropriate app based on role
  const isParent = user?.role === "parent";
  const basePath = isParent ? "/parent" : "/staff";

  return (
    <DashboardLayout basePath={basePath}>
      <Switch>
        <Route path="/">
          <Redirect to={basePath} />
        </Route>
        <Route path="/staff/**">
          {isParent ? <Redirect to="/parent" /> : <StaffRouter />}
        </Route>
        <Route path="/staff">
          {isParent ? <Redirect to="/parent" /> : <StaffRouter />}
        </Route>
        <Route path="/parent/**">
          {!isParent && user ? <Redirect to="/staff" /> : <ParentRouter />}
        </Route>
        <Route path="/parent">
          {!isParent && user ? <Redirect to="/staff" /> : <ParentRouter />}
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
