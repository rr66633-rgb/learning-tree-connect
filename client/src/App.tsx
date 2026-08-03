import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { ParentArrivalAlert } from "./components/ParentArrivalAlert";
import { useAuth } from "./_core/hooks/useAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { useNativeInit } from "./hooks/useNativeInit";
import { useWeeklyPlanPdf } from "./hooks/useWeeklyPlanPdf";
import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import i18n from "./lib/i18n";
import { SplashScreen } from "./components/SplashScreen";
import { useMetaPixelPageView } from "./hooks/useMetaPixel";
import { Skeleton } from "@/components/ui/skeleton";

// Landing Page
const Landing = lazy(() => import("./pages/Landing"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NurseriesLanding = lazy(() => import("./pages/NurseriesLanding"));

// Staff/Admin Pages
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffChildren = lazy(() => import("./pages/staff/Children"));
const StaffClasses = lazy(() => import("./pages/staff/Classes"));
const StaffClassDetail = lazy(() => import("./pages/staff/ClassDetail"));
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
const StaffNotificationSettings = lazy(() => import("./pages/staff/NotificationSettings"));
const StaffPendingApprovals = lazy(() => import("./pages/staff/PendingApprovals"));
const StaffMediaUpload = lazy(() => import("./pages/staff/MediaUpload"));
const InvoiceDetail = lazy(() => import("./pages/staff/InvoiceDetail"));
const ChildProfile = lazy(() => import("./pages/staff/ChildProfile"));
const StaffPickup = lazy(() => import("./pages/staff/Pickup"));
const StaffAssessments = lazy(() => import("./pages/staff/Assessments"));
const StaffDevelopmentalAssessment = lazy(() => import("./pages/staff/DevelopmentalAssessment"));
const StaffAuditLog = lazy(() => import("./pages/staff/AuditLog"));
const StaffWeeklyPlan = lazy(() => import("./pages/staff/WeeklyPlan"));

// Staff Management System
const StaffDirectory = lazy(() => import("./pages/staff/StaffDirectory"));
const AddStaff = lazy(() => import("./pages/staff/AddStaff"));
const EditStaff = lazy(() => import("./pages/staff/EditStaff"));
const StaffProfilePage = lazy(() => import("./pages/staff/StaffProfile"));
const LeaveManagement = lazy(() => import("./pages/staff/LeaveManagement"));
const ImportStaff = lazy(() => import("./pages/staff/ImportStaff"));
const ImportChildren = lazy(() => import("./pages/staff/ImportChildren"));
const StaffCurriculumManagement = lazy(() => import("./pages/staff/CurriculumManagement"));
const StaffCustomAssessments = lazy(() => import("./pages/staff/CustomAssessments"));
const StaffApplyAssessment = lazy(() => import("./pages/staff/ApplyAssessment"));

// Development Center Pages
const DevelopmentDashboard = lazy(() => import("./pages/staff/DevelopmentDashboard"));
const ChildDevelopmentProfile = lazy(() => import("./pages/staff/ChildDevelopmentProfile"));
const NewObservation = lazy(() => import("./pages/staff/NewObservation"));
const EngagementAnalytics = lazy(() => import("./pages/staff/EngagementAnalytics"));
const ParentSubmissionsReview = lazy(() => import("./pages/staff/ParentSubmissionsReview"));
const EngagementReports = lazy(() => import("./pages/staff/EngagementReports"));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const OrganizationDetail = lazy(() => import("./pages/superadmin/OrganizationDetail"));
const CreateOrganization = lazy(() => import("./pages/superadmin/CreateOrganization"));
const OrganizationsList = lazy(() => import("./pages/superadmin/OrganizationsList"));
const OnboardingWizard = lazy(() => import("./pages/OnboardingWizard"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const SuperAdminBranding = lazy(() => import("./pages/superadmin/Branding"));
const SuperAdminUsers = lazy(() => import("./pages/superadmin/Users"));
const SuperAdminSettings = lazy(() => import("./pages/superadmin/Settings"));
const SubscriptionsManagement = lazy(() => import("./pages/superadmin/SubscriptionsManagement"));
const PaymentsReport = lazy(() => import("./pages/superadmin/PaymentsReport"));
const NurseryRegistrations = lazy(() => import("./pages/superadmin/NurseryRegistrations"));

// AI Pages
const AIHub = lazy(() => import("./pages/ai/AIHub"));
const AIObservation = lazy(() => import("./pages/ai/AIObservation"));
const AIPlanner = lazy(() => import("./pages/ai/AIPlanner"));
const AIActivity = lazy(() => import("./pages/ai/AIActivity"));
const AIReport = lazy(() => import("./pages/ai/AIReport"));
const AIMessage = lazy(() => import("./pages/ai/AIMessage"));
const AINewsletter = lazy(() => import("./pages/ai/AINewsletter"));
const AIStory = lazy(() => import("./pages/ai/AIStory"));
const AILibrary = lazy(() => import("./pages/ai/AILibrary"));
const AIAssistant = lazy(() => import("./pages/ai/AIAssistant"));
const AIMarketing = lazy(() => import("./pages/ai/AIMarketing"));
const AIMarketingEventContent = lazy(() => import("./pages/ai/AIMarketingEventContent"));
const AIMarketingEventSummary = lazy(() => import("./pages/ai/AIMarketingEventSummary"));
const AIMarketingPoster = lazy(() => import("./pages/ai/AIMarketingPoster"));
const AIMarketingSocial = lazy(() => import("./pages/ai/AIMarketingSocial"));
const AIMarketingMediaCaption = lazy(() => import("./pages/ai/AIMarketingMediaCaption"));

// Legal Pages (public, no auth required)
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PublicWaitlist = lazy(() => import("./pages/PublicWaitlist"));

// Payment Pages
const SubscriptionCheckout = lazy(() => import("./pages/SubscriptionCheckout"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const StorePaymentCallback = lazy(() => import("./pages/StorePaymentCallback"));


// Auth Pages
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const NurseryRegister = lazy(() => import("./pages/auth/NurseryRegister"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const RecoverAccount = lazy(() => import("./pages/auth/RecoverAccount"));

// Parent Pages
const ParentDashboard = lazy(() => import("./pages/parent/Dashboard"));
const ParentChildren = lazy(() => import("./pages/parent/Children"));
const ParentTimeline = lazy(() => import("./pages/parent/Timeline"));
const ParentAttendance = lazy(() => import("./pages/parent/Attendance"));
const ParentReports = lazy(() => import("./pages/parent/Reports"));
const ParentDailyReport = lazy(() => import("./pages/parent/DailyReport"));
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
const ParentWeeklyPlan = lazy(() => import("./pages/parent/WeeklyPlan"));
const ParentDevelopment = lazy(() => import("./pages/parent/Development"));
const ParentDevelopmentalAssessment = lazy(() => import("./pages/parent/DevelopmentalAssessment"));
const ParentAssessments = lazy(() => import("./pages/parent/Assessments"));
const ParentEngagement = lazy(() => import("./pages/parent/EngagementDashboard"));
const ParentEngagementActivities = lazy(() => import("./pages/parent/EngagementActivities"));
const ParentEngagementChallenges = lazy(() => import("./pages/parent/EngagementChallenges"));
const ParentEngagementJournal = lazy(() => import("./pages/parent/EngagementJournal"));
const ParentEngagementChatbot = lazy(() => import("./pages/parent/EngagementChatbot"));
const ParentEngagementGoals = lazy(() => import("./pages/parent/EngagementGoals"));
const ParentEngagementObservations = lazy(() => import("./pages/parent/EngagementObservations"));
const ParentEngagementScore = lazy(() => import("./pages/parent/EngagementScore"));
const ParentEngagementBadges = lazy(() => import("./pages/parent/EngagementBadges"));
const ParentCurriculumLibrary = lazy(() => import("./pages/parent/CurriculumLibrary"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const StoreProducts = lazy(() => import("./pages/staff/StoreProducts"));
const StoreOrders = lazy(() => import("./pages/staff/StoreOrders"));
const StoreSalesReport = lazy(() => import("./pages/staff/StoreSalesReport"));
const ParentStore = lazy(() => import("./pages/parent/Store"));
const ParentCart = lazy(() => import("./pages/parent/Cart"));
const ParentStoreOrders = lazy(() => import("./pages/parent/StoreOrders"));
const StoreCheckout = lazy(() => import("./pages/parent/StoreCheckout"));
const SuperAdminStore = lazy(() => import("./pages/superadmin/Store"));

// Loyalty Pages
const LoyaltyAdmin = lazy(() => import("./pages/LoyaltyAdmin"));
const LoyaltyCard = lazy(() => import("./pages/LoyaltyCard"));

// Payroll & Performance
const Payroll = lazy(() => import("./pages/Payroll"));
const PerformanceEvaluation = lazy(() => import("./pages/PerformanceEvaluation"));
const PerformanceComparison = lazy(() => import("./pages/PerformanceComparison"));
const PerformanceGoals = lazy(() => import("./pages/PerformanceGoals"));
const HRDashboard = lazy(() => import("./pages/HRDashboard"));

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
  const staffRoles = ["admin", "super_admin", "principal", "owner", "teacher", "assistant", "accountant", "receptionist"];
  return staffRoles.includes(role || "");
}

/** Determine if a role is a "super_admin" type role */
function isSuperAdminRole(role?: string): boolean {
  return role === "super_admin";
}

/** Get the base path for a given role */
function getBasePathForRole(role?: string): string {
  if (isSuperAdminRole(role)) return "/super-admin";
  if (isParentRole(role)) return "/parent";
  if (isStaffRole(role)) return "/staff";
  // Default: 'user' role or unknown - show a pending state
  // We'll redirect them to a waiting page or parent portal by default
  return "/pending";
}

function StaffRouter() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/staff/children/:id" component={ChildProfile} />
        <Route path="/staff/children" component={StaffChildren} />
        <Route path="/staff/classes/:id" component={ClassDetail} />
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
        <Route path="/staff/notification-settings" component={StaffNotificationSettings} />
        <Route path="/staff/pickup" component={StaffPickup} />
        <Route path="/staff/assessments" component={StaffAssessments} />
        <Route path="/staff/custom-assessments" component={StaffCustomAssessments} />
        <Route path="/staff/custom-assessments/:id/apply" component={StaffApplyAssessment} />
        <Route path="/staff/developmental-assessment" component={StaffDevelopmentalAssessment} />
        <Route path="/staff/audit-log" component={StaffAuditLog} />
        <Route path="/staff/weekly-plan" component={StaffWeeklyPlan} />
        <Route path="/staff/development/observations/new" component={NewObservation} />
        <Route path="/staff/development/child/:id" component={ChildDevelopmentProfile} />
        <Route path="/staff/development" component={DevelopmentDashboard} />
        <Route path="/staff/engagement" component={EngagementAnalytics} />
        <Route path="/staff/engagement/reviews" component={ParentSubmissionsReview} />
        <Route path="/staff/engagement/reports" component={EngagementReports} />
        <Route path="/staff/staff-management" component={StaffDirectory} />
        <Route path="/staff/staff-management/add" component={AddStaff} />
        <Route path="/staff/staff-management/:id/edit" component={EditStaff} />
        <Route path="/staff/staff-management/:id" component={StaffProfilePage} />
        <Route path="/staff/leave-management" component={LeaveManagement} />
        <Route path="/staff/import-staff" component={ImportStaff} />
        <Route path="/staff/import-children" component={ImportChildren} />
        <Route path="/staff/curriculum" component={StaffCurriculumManagement} />
        <Route path="/staff/store/reports" component={StoreSalesReport} />
        <Route path="/staff/store/orders" component={StoreOrders} />
        <Route path="/staff/store" component={StoreProducts} />
        <Route path="/staff/loyalty" component={LoyaltyAdmin} />
        <Route path="/staff/payroll" component={Payroll} />
        <Route path="/staff/performance-evaluation" component={PerformanceEvaluation} />
        <Route path="/staff/performance-comparison" component={PerformanceComparison} />
        <Route path="/staff/performance-goals" component={PerformanceGoals} />
        <Route path="/staff/hr-dashboard" component={HRDashboard} />
        <Route path="/staff/account-settings" component={AccountSettings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
    </ErrorBoundary>
  );
}

function ParentRouter() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/parent" component={ParentDashboard} />
        <Route path="/parent/children" component={ParentChildren} />
        <Route path="/parent/timeline" component={ParentTimeline} />
        <Route path="/parent/attendance" component={ParentAttendance} />
        <Route path="/parent/reports" component={ParentReports} />
        <Route path="/parent/daily-report" component={ParentTimeline} />
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
        <Route path="/parent/weekly-plan" component={ParentWeeklyPlan} />
        <Route path="/parent/development" component={ParentDevelopment} />
        <Route path="/parent/developmental-assessment" component={ParentDevelopmentalAssessment} />
        <Route path="/parent/assessments" component={ParentAssessments} />
        <Route path="/parent/engagement" component={ParentEngagement} />
        <Route path="/parent/engagement/activities" component={ParentEngagementActivities} />
        <Route path="/parent/engagement/challenges" component={ParentEngagementChallenges} />
        <Route path="/parent/engagement/journal" component={ParentEngagementJournal} />
        <Route path="/parent/engagement/chatbot" component={ParentEngagementChatbot} />
        <Route path="/parent/engagement/goals" component={ParentEngagementGoals} />
        <Route path="/parent/engagement/observations" component={ParentEngagementObservations} />
        <Route path="/parent/engagement/score" component={ParentEngagementScore} />
        <Route path="/parent/engagement/badges" component={ParentEngagementBadges} />
        <Route path="/parent/curriculum" component={ParentCurriculumLibrary} />
        <Route path="/parent/store/orders" component={ParentStoreOrders} />
        <Route path="/parent/store/cart" component={ParentCart} />
        <Route path="/parent/store/checkout" component={StoreCheckout} />
        <Route path="/parent/store" component={ParentStore} />
        <Route path="/parent/loyalty" component={LoyaltyCard} />
        <Route path="/parent/account-settings" component={AccountSettings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
    </ErrorBoundary>
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
          src="/assets/logo.webp"
          alt="نشأة"
          className="w-24 h-24 object-contain"
        />
        <h1 className="text-xl font-bold text-slate-800">
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
  const [location] = useLocation();
  useSessionTimeout();
  useNativeInit();
  useWeeklyPlanPdf();
  useMetaPixelPageView();

  // Auto-apply user's saved language preference
  useEffect(() => {
    if (user?.language) {
      const lang = user.language;
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [user?.language]);

  // Public legal pages - always accessible without auth or dashboard
  if (location === "/privacy" || location === "/terms") {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
        </Switch>
      </Suspense>
    );
  }

    // Pricing page - always accessible, full-screen layout
  if (location === "/pricing") {
    return (
      <Suspense fallback={<PageLoader />}>
        <Pricing />
      </Suspense>
    );
  }
  // Public waitlist registration page - shareable link for parents
  if (location === "/waitlist") {
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicWaitlist />
      </Suspense>
    );
  }
  // Marketing landing page - always accessible without auth
  if (location === "/nurseries" || location === "/") {
    return (
      <Suspense fallback={<PageLoader />}>
        <NurseriesLanding />
      </Suspense>
    );
  }
  if (loading) return <PageLoader />;

  // Not logged in - show auth pages or landing page
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/register-nursery" component={NurseryRegister} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/recover-account" component={RecoverAccount} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/nurseries" component={NurseriesLanding} />
          <Route component={NurseriesLanding} />
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
        <Route path="/recover-account">
          <Redirect to={basePath} />
        </Route>

        {/* AI routes - accessible by staff roles */}
        <Route path="/ai">
          {isStaffRole(userRole) ? <AIHub /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/observation">
          {isStaffRole(userRole) ? <AIObservation /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/planner">
          {isStaffRole(userRole) ? <AIPlanner /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/activity">
          {isStaffRole(userRole) ? <AIActivity /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/report">
          {isStaffRole(userRole) ? <AIReport /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/message">
          {isStaffRole(userRole) ? <AIMessage /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/newsletter">
          {isStaffRole(userRole) ? <AINewsletter /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/story">
          {isStaffRole(userRole) ? <AIStory /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/library">
          {isStaffRole(userRole) ? <AILibrary /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/assistant">
          <AIAssistant />
        </Route>
        <Route path="/ai/marketing">
          {isStaffRole(userRole) ? <AIMarketing /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/marketing/event-content">
          {isStaffRole(userRole) ? <AIMarketingEventContent /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/marketing/event-summary">
          {isStaffRole(userRole) ? <AIMarketingEventSummary /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/marketing/poster">
          {isStaffRole(userRole) ? <AIMarketingPoster /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/marketing/social">
          {isStaffRole(userRole) ? <AIMarketingSocial /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/ai/marketing/media-caption">
          {isStaffRole(userRole) ? <AIMarketingMediaCaption /> : <Redirect to={basePath} />}
        </Route>

        {/* Super Admin routes */}
        <Route path="/super-admin/organizations/new">
          {isSuperAdminRole(userRole) ? <CreateOrganization /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/organizations/:id">
          {isSuperAdminRole(userRole) ? <OrganizationDetail /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/organizations">
          {isSuperAdminRole(userRole) ? <OrganizationsList /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/registrations">
          {isSuperAdminRole(userRole) ? <NurseryRegistrations /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/plans">
          {isSuperAdminRole(userRole) ? <SubscriptionsManagement /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/payments-report">
          {isSuperAdminRole(userRole) ? <PaymentsReport /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/branding">
          {isSuperAdminRole(userRole) ? <SuperAdminBranding /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/users">
          {isSuperAdminRole(userRole) ? <SuperAdminUsers /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/settings">
          {isSuperAdminRole(userRole) ? <SuperAdminSettings /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/notification-settings">
          {isSuperAdminRole(userRole) ? <StaffNotificationSettings /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin/store">
          {isSuperAdminRole(userRole) ? <SuperAdminStore /> : <Redirect to={basePath} />}
        </Route>
        <Route path="/super-admin">
          {isSuperAdminRole(userRole) ? <SuperAdminDashboard /> : <Redirect to={basePath} />}
        </Route>

        {/* Payment routes - accessible by authenticated users */}
        <Route path="/checkout">
          <SubscriptionCheckout />
        </Route>
        <Route path="/payment-callback">
          <PaymentCallback />
        </Route>
        <Route path="/store-payment-callback">
          <StorePaymentCallback />
        </Route>

        {/* Onboarding wizard - accessible by authenticated users */}
        <Route path="/onboarding">
          <OnboardingWizard />
        </Route>

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
  const [location] = useLocation();
  const isPublicPage = location === "/waitlist" || location === "/pricing" || location === "/privacy" || location === "/terms" || location.startsWith("/waitlist/");
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only on first load (not on HMR or navigation)
    // Skip splash for public pages
    if (isPublicPage) return false;
    const hasShown = sessionStorage.getItem('splash_shown');
    return !hasShown;
  });

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem('splash_shown', 'true');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <RoleRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
