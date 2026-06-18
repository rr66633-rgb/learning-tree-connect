import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Children from "./pages/Children";
import Attendance from "./pages/Attendance";
import DailyReports from "./pages/DailyReports";
import Messages from "./pages/Messages";
import Finance from "./pages/Finance";
import Loyalty from "./pages/Loyalty";
import Notifications from "./pages/Notifications";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/children"} component={Children} />
        <Route path={"/attendance"} component={Attendance} />
        <Route path={"/daily-reports"} component={DailyReports} />
        <Route path={"/messages"} component={Messages} />
        <Route path={"/finance"} component={Finance} />
        <Route path={"/loyalty"} component={Loyalty} />
        <Route path={"/notifications"} component={Notifications} />
        <Route path={"/404"} component={NotFound} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
