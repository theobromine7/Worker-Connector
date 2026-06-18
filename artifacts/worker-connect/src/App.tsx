import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import AdminLoginPage from "@/pages/admin-login";
import RegisterPage from "@/pages/register";
import WorkerDashboard from "@/pages/worker/dashboard";
import WorkerApplications from "@/pages/worker/applications";
import WorkerEarnings from "@/pages/worker/earnings";
import WorkerProfile from "@/pages/worker/profile";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminWorkers from "@/pages/admin/workers";
import AdminJobs from "@/pages/admin/jobs";
import AdminApplicants from "@/pages/admin/applicants";
import AdminPayouts from "@/pages/admin/payouts";

setAuthTokenGetter(() => localStorage.getItem("workerconnect_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/worker/dashboard" component={WorkerDashboard} />
      <Route path="/worker/applications" component={WorkerApplications} />
      <Route path="/worker/earnings" component={WorkerEarnings} />
      <Route path="/worker/profile" component={WorkerProfile} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/workers" component={AdminWorkers} />
      <Route path="/admin/jobs" component={AdminJobs} />
      <Route path="/admin/jobs/:jobId/applicants" component={AdminApplicants} />
      <Route path="/admin/payouts" component={AdminPayouts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="workerconnect-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
