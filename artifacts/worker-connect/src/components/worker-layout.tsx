import { Link, useLocation } from "wouter";
import { Briefcase, FileText, DollarSign, User, LogOut, Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useToggleAvailability, useGetWorkerProfile, getGetWorkerProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/worker/dashboard", label: "Jobs", icon: Briefcase },
  { href: "/worker/applications", label: "Applications", icon: FileText },
  { href: "/worker/earnings", label: "Earnings", icon: DollarSign },
  { href: "/worker/profile", label: "Profile", icon: User },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: worker } = useGetWorkerProfile();
  const toggle = useToggleAvailability({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkerProfileQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update availability", variant: "destructive" });
      },
    },
  });

  function handleToggle() {
    if (!worker) return;
    toggle.mutate({ data: { isOnline: !worker.isOnline } });
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">WorkerConnect</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Worker Portal</p>
        </div>

        {worker && (
          <div className="px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {worker.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{worker.name}</p>
                <p className="text-xs text-muted-foreground truncate">{worker.skill}</p>
              </div>
            </div>
            <button
              data-testid="button-toggle-availability"
              onClick={handleToggle}
              disabled={toggle.isPending}
              className={cn(
                "mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                worker.isOnline
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {worker.isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {worker.isOnline ? "Online" : "Offline"}
            </button>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location === href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-toggle-theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <h1 className="text-lg font-bold">WorkerConnect</h1>
          <Button variant="ghost" size="icon" onClick={logout} data-testid="button-mobile-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* Mobile nav */}
        <nav className="md:hidden border-t border-border bg-background flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                location === href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
