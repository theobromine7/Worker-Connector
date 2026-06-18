import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, DollarSign, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">WorkerConnect</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`admin-nav-${label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.startsWith(href)
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        <nav className="md:hidden border-t border-border bg-background flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                location.startsWith(href) ? "text-primary" : "text-muted-foreground"
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
