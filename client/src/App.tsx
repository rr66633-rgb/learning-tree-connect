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
import { Suspense, useState, useCallback, useEffect } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import i18n from "./lib/i18n";
import { SplashScreen } from "./components/SplashScreen";
import { useMetaPixelPageView } from "./hooks/useMetaPixel";
import { Skeleton } from "@/components/ui/skeleton";
import { AiTaskProvider } from "./components/AiTaskOverlay";

// Landing Page
const Landing = lazyWithRetry(() => import("./pages/Landing"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const NurseriesLanding = lazyWithRetry(() => import("./pages/NurseriesLanding"));
const VisitorAssistant = lazyWithRetry(() => import("./components/VisitorAssistant"));

// Staff/Admin Pages
const StaffDashboard = lazyWithRetry(() => import("./pages/staff/Dashboard"));
const StaffChildren = lazyWithRetry(() => import("./pages/staff/Children"));
const StaffClasses = lazyWithRetry(() => import("./pages/staff/Classes"));
const ClassDetail = lazyWithRetry(() => import("./pages/staff/ClassDetail"));
const StaffAttendance = lazyWithRetry(() => import("./pages/staff/Attendance"));
const StaffStaffAttendance = lazyWithRetry(() => import("./pages/staff/StaffAttendance"));
const StaffDailyLog = lazyWithRetry(() => import("./pages/staff/DailyLog"));
const StaffDailyReports = lazyWithRetry(() => import("./pages/staff/DailyReports"));
const StaffMessages = lazyWithRetry(() => import("./pages/staff/Messages"));
const StaffFinance = lazyWithRetry(() => import("./pages/staff/Finance"));
const StaffEnrollment = lazyWithRetry(() => import("./pages/staff/Enrollment"));
const StaffCalendar = lazyWithRetry(() => import("./pages/staff/Calendar"));
const StaffAnnouncements = lazyWithRetry(() => import("./pages/staff/Announcements"));
const StaffDocuments = lazyWithRetry(() => import("./pages/staff/Documents"));
const StaffNotifications = lazyWithRetry(() => import("./pages/staff/Notifications"));
const StaffUsers = lazyWithRetry(() => import("./pages/staff/Users"));
const StaffSettings = lazyWithRetry(() => import("./pages/staff/Settings"));
const StaffNotificationSettings = lazyWithRetry(() => import("./pages/staff/NotificationSettings"));
const StaffPendingApprovals = lazyWithRetry(() => import("./pages/staff/PendingApprovals"));
const StaffMediaUpload = lazyWithRetry(() => import("./pages/staff/MediaUpload"));
const InvoiceDetail = lazyWithRetry(() => import("./pages/staff/InvoiceDetail"));
const ChildProfile = lazyWithRetry(() => import("./pages/staff/ChildProfile"));
const StaffPickup = lazyWithRetry(() => import("./pages/staff/Pickup"));
const StaffAssessments = lazyWithRetry(() => import("./pages/staff/Assessments"));
const StaffDevelopmentalAssessment = lazyWithRetry(() => import("./pages/staff/DevelopmentalAssessment"));
const StaffAuditLog = lazyWithRetry(() => import("./pages/staff/AuditLog"));
const StaffWeeklyPlan = lazyWithRetry(() => import("./pages/staff/WeeklyPlan"));

// Staff Management System
const StaffDirectory = lazyWithRetry(() => import("./pages/staff/StaffDirectory"));
const AddStaff = lazyWithRetry(() => import("./pages/staff/AddStaff"));
const EditStaff = lazyWithRetry(() => import("./pages/staff/EditStaff"));
const StaffProfilePage = lazyWithRetry(() => import("./pages/staff/StaffProfile"));
const LeaveManagement = lazyWithRetry(() => import("./pages/staff/LeaveManagement"));
const ImportStaff = lazyWithRetry(() => import("./pages/staff/ImportStaff"));
const ImportChildren = lazyWithRetry(() => import("./pages/staff/ImportChildren"));
const StaffCurriculumManagement = lazyWithRetry(() => import("./pages/staff/CurriculumManagement"));
const StaffCustomAssessments = lazyWithRetry(() => import("./pages/staff/CustomAssessments"));
const StaffApplyAssessment = lazyWithRetry(() => import("./pages/staff/ApplyAssessment"));

// Development Center Pages
const DevelopmentDashboard = lazyWithRetry(() => import("./pages/staff/DevelopmentDashboard"));
const ChildDevelopmentProfile = lazyWithRetry(() => import("./pages/staff/ChildDevelopmentProfile"));
const NewObservation = lazyWithRetry(() => import("./pages/staff/NewObservation"));
const EngagementAnalytics = lazyWithRetry(() => import("./pages/staff/EngagementAnalytics"));
const ParentSubmissionsReview = lazyWithRetry(() => import("./pages/staff/ParentSubmissionsReview"));
const EngagementReports = lazyWithRetry(() => import("./pages/staff/EngagementReports"));

// Super Admin Pages
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/superadmin/SuperAdminDashboard"));
const OrganizationDetail = lazyWithRetry(() => import("./pages/superadmin/OrganizationDetail"));
const CreateOrganization = lazyWithRetry(() => import("./pages/superadmin/CreateOrganization"));
const OrganizationsList = lazyWithRetry(() => import("./pages/superadmin/OrganizationsList"));
const OnboardingWizard = lazyWithRetry(() => import("./pages/OnboardingWizard"));
const SubscriptionPlans = lazyWithRetry(() => import("./pages/SubscriptionPlans"));
const SuperAdminBranding = lazyWithRetry(() => import("./pages/superadmin/Branding"));
const SuperAdminUsers = lazyWithRetry(() => import("./pages/superadmin/Users"));
const SuperAdminSettings = lazyWithRetry(() => import("./pages/superadmin/Settings"));
const EmailSettings = lazyWithRetry(() => import("./pages/superadmin/EmailSettings"));
const SubscriptionsManagement = lazyWithRetry(() => import("./pages/superadmin/SubscriptionsManagement"));
const PaymentsReport = lazyWithRetry(() => import("./pages/superadmin/PaymentsReport"));
const NurseryRegistrations = lazyWithRetry(() => import("./pages/superadmin/NurseryRegistrations"));

// AI Pages
const AIHub = lazyWithRetry(() => import("./pages/ai/AIHub"));
const AIObservation = lazyWithRetry(() => import("./pages/ai/AIObservation"));
const AIPlanner = lazyWithRetry(() => import("./pages/ai/AIPlanner"));
const AIActivity = lazyWithRetry(() => import("./pages/ai/AIActivity"));
const AIReport = lazyWithRetry(() => import("./pages/ai/AIReport"));
const AIMessage = lazyWithRetry(() => import("./pages/ai/AIMessage"));
const AINewsletter = lazyWithRetry(() => import("./pages/ai/AINewsletter"));
const AIStory = lazyWithRetry(() => import("./pages/ai/AIStory"));
const AILibrary = lazyWithRetry(() => import("./pages/ai/AILibrary"));
const AIRequests = lazyWithRetry(() => import("./pages/ai/AIRequests"));
const AIResultDetail = lazyWithRetry(() => import("./pages/ai/AIResultDetail"));
const AIAssistant = lazyWithRetry(() => import("./pages/ai/AIAssistant"));
const AIMarketing = lazyWithRetry(() => import("./pages/ai/AIMarketing"));
const AIMarketingEventContent = lazyWithRetry(() => import("./pages/ai/AIMarketingEventContent"));
const AIMarketingEventSummary = lazyWithRetry(() => import("./pages/ai/AIMarketingEventSummary"));
const AIMarketingPoster = lazyWithRetry(() => import("./pages/ai/AIMarketingPoster"));
const AIMarketingSocial = lazyWithRetry(() => import("./pages/ai/AIMarketingSocial"));
const AIMarketingMediaCaption = lazyWithRetry(() => import("./pages/ai/AIMarketingMediaCaption"));

// Legal Pages (public, no auth required)
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const PublicWaitlist = lazyWithRetry(() => import("./pages/PublicWaitlist"));

// Payment Pages
const SubscriptionCheckout = lazyWithRetry(() => import("./pages/SubscriptionCheckout"));
const PaymentSettings = lazyWithRetry(() => import("./pages/PaymentSettings"));
const PaymentCallback = lazyWithRetry(() => import("./pages/PaymentCallback"));
const StorePaymentCallback = lazyWithRetry(() => import("./pages/StorePaymentCallback"));
const OrgSelector = lazyWithRetry(() => import("./pages/OrgSelector"));
const SubscriptionStatus = lazyWithRetry(() => import("./pages/staff/SubscriptionStatus"));


// Auth Pages
const Login = lazyWithRetry(() => import("./pages/auth/Login"));
const Register = lazyWithRetry(() => import("./pages/auth/Register"));
const NurseryRegister = lazyWithRetry(() => import("./pages/auth/NurseryRegister"));
const ForgotPassword = lazyWithRetry(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/auth/ResetPassword"));
const RecoverAccount = lazyWithRetry(() => import("./pages/auth/RecoverAccount"));

// Parent Pages
const ParentDashboard = lazyWithRetry(() => import("./pages/parent/Dashboard"));
const ParentChildren = lazyWithRetry(() => import("./pages/parent/Children"));
const ParentTimeline = lazyWithRetry(() => import("./pages/parent/Timeline"));
const ParentAttendance = lazyWithRetry(() => import("./pages/parent/Attendance"));
const ParentReports = lazyWithRetry(() => import("./pages/parent/Reports"));
const ParentDailyReport = lazyWithRetry(() => import("./pages/parent/DailyReport"));
const ParentCalendar = lazyWithRetry(() => import("./pages/parent/Calendar"));
const ParentMessages = lazyWithRetry(() => import("./pages/parent/Messages"));
const ParentFinance = lazyWithRetry(() => import("./pages/parent/Finance"));
const ParentDocuments = lazyWithRetry(() => import("./pages/parent/Documents"));
const ParentNotifications = lazyWithRetry(() => import("./pages/parent/Notifications"));
const ParentAnnouncements = lazyWithRetry(() => import("./pages/parent/Announcements"));
const ParentMedical = lazyWithRetry(() => import("./pages/parent/Medical"));
const ParentPhotos = lazyWithRetry(() => import("./pages/parent/Photos"));
const ParentPickup = lazyWithRetry(() => import("./pages/parent/Pickup"));
const ParentObservations = lazyWithRetry(() => import("./pages/parent/Observations"));
const ParentWeeklyPlan = lazyWithRetry(() => import("./pages/parent/WeeklyPlan"));
const ParentDevelopment = lazyWithRetry(() => import("./pages/parent/Development"));
const ParentDevelopmentalAssessment = lazyWithRetry(() => import("./pages/parent/DevelopmentalAssessment"));
const ParentAssessments = lazyWithRetry(() => import("./pages/parent/Assessments"));
const ParentEngagement = lazyWithRetry(() => import("./pages/parent/EngagementDashboard"));
const ParentEngagementActivities = lazyWithRetry(() => import("./pages/parent/EngagementActivities"));
const ParentEngagementChallenges = lazyWithRetry(() => import("./pages/parent/EngagementChallenges"));
const ParentEngagementJournal = lazyWithRetry(() => import("./pages/parent/EngagementJournal"));
const ParentEngagementChatbot = lazyWithRetry(() => import("./pages/parent/EngagementChatbot"));
const ParentEngagementGoals = lazyWithRetry(() => import("./pages/parent/EngagementGoals"));
const ParentEngagementObservations = lazyWithRetry(() => import("./pages/parent/EngagementObservations"));
const ParentEngagementScore = lazyWithRetry(() => import("./pages/parent/EngagementScore"));
const ParentEngagementBadges = lazyWithRetry(() => import("./pages/parent/EngagementBadges"));
const ParentCurriculumLibrary = lazyWithRetry(() => import("./pages/parent/CurriculumLibrary"));
const AccountSettings = lazyWithRetry(() => import("./pages/AccountSettings"));
const StoreProducts = lazyWithRetry(() => import("./pages/staff/StoreProducts"));
const StoreOrders = lazyWithRetry(() => import("./pages/staff/StoreOrders"));
const StoreSalesReport = lazyWithRetry(() => import("./pages/staff/StoreSalesReport"));
const ParentStore = lazyWithRetry(() => import("./pages/parent/Store"));
const ParentCart = lazyWithRetry(() => import("./pages/parent/Cart"));
const ParentStoreOrders = lazyWithRetry(() => import("./pages/parent/StoreOrders"));
const StoreCheckout = lazyWithRetry(() => import("./pages/parent/StoreCheckout"));
const SuperAdminStore = lazyWithRetry(() => import("./pages/superadmin/Store"));

// Loyalty Pages
const LoyaltyAdmin = lazyWithRetry(() => import("./pages/LoyaltyAdmin"));
const LoyaltyCard = lazyWithRetry(() => import("./pages/LoyaltyCard"));

// Payroll & Performance
const Payroll = lazyWithRetry(() => import("./pages/Payroll"));
const PerformanceEvaluation = lazyWithRetry(() => import("./pages/PerformanceEvaluation"));
const PerformanceComparison = lazyWithRetry(() => import("./pages/PerformanceComparison"));
const PerformanceGoals = lazyWithRetry(() => import("./pages/PerformanceGoals"));
const HRDashboard = lazyWithRetry(() => import("./pages/HRDashboard"));

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
        <Route path="/staff/payment-settings" component={PaymentSettings} />
        <Route path="/staff/email-logs" component={lazyWithRetry(() => import("./pages/staff/EmailLogs"))} />
        <Route path="/staff/notification-settings" component={StaffNotificationSettings} />
        <Route path="/staff/subscription" component={SubscriptionStatus} />
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
  if (location === "/waitlist" || location.startsWith("/waitlist/")) {
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
        <Route path="/ai/:section/result/:id">
          {isStaffRole(userRole) ? <AIResultDetail /> : <Redirect to={basePath} />}
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
        <Route path="/ai/requests">
          {isStaffRole(userRole) ? <AIRequests /> : <Redirect to={basePath} />}
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
        <Route path="/super-admin/payment-settings">
          {isSuperAdminRole(userRole) ? <PaymentSettings /> : <Redirect to={basePath} />}
        <Route path="/super-admin/email-logs" component={lazyWithRetry(() => import("./pages/staff/EmailLogs"))} />
        </Route>
        <Route path="/super-admin/email-settings">
          {isSuperAdminRole(userRole) ? <EmailSettings /> : <Redirect to={basePath} />}
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
        <Route path="/org-select">
          <OrgSelector />
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
  const showVisitorAssistant = location === "/" || location === "/nurseries" || location === "/pricing";
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
          {/* Mounted ABOVE RoleRouter on purpose: a long AI generation is owned
              here, not by the page that started it, so navigating away neither
              cancels the request nor discards its result. */}
          <AiTaskProvider>
            <Toaster />
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <RoleRouter />
            {showVisitorAssistant && (
              <Suspense fallback={null}>
                <VisitorAssistant />
              </Suspense>
            )}
          </AiTaskProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
